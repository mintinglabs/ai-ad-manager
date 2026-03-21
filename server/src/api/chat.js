import { Router } from 'express';
import { runner, sessionService } from '../services/adAgent.js';

const router = Router();

// POST /api/chat/parse-doc — extract text from uploaded PDF/TXT
router.post('/parse-doc', async (req, res) => {
  try {
    const { base64, type, name } = req.body;
    if (!base64) return res.status(400).json({ error: 'No file data provided' });

    const buffer = Buffer.from(base64, 'base64');
    let text = '';

    if (type === 'application/pdf' || name?.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const pdf = await pdfParse(buffer);
      text = pdf.text;
    } else {
      // TXT, DOCX (plain text extraction), or fallback
      text = buffer.toString('utf-8');
    }

    // Truncate to ~8000 chars to avoid overwhelming agent context
    const truncated = text.slice(0, 8000);
    const wasTruncated = text.length > 8000;

    res.json({
      text: truncated,
      charCount: text.length,
      truncated: wasTruncated,
      name,
    });
  } catch (err) {
    console.error('[parse-doc] error:', err.message);
    res.status(500).json({ error: 'Failed to parse document: ' + err.message });
  }
});

// In-memory map: chatSessionId → ADK sessionId
const sessionMap = new Map();

// Helper: send an SSE event
const sse = (res, obj) => {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
};

// POST /api/chat
// Body: { message, sessionId?, adAccountId?, token }
// Response: SSE stream of agent events
router.post('/', async (req, res) => {
  try {
    const { message, sessionId: clientSessionId, adAccountId, token, mode = 'Fast', language = 'en' } = req.body;
    console.log(`[chat] message="${message?.slice(0, 60)}" adAccountId=${adAccountId} mode=${mode} lang=${language} session=${clientSessionId?.slice(0, 8)}`);
    console.log(`[chat] env check: GEMINI_API_KEY=${!!process.env.GEMINI_API_KEY}`);

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Use token from requireToken middleware (Bearer header), falling back to body
    const userToken = req.token || token;
    if (!userToken) {
      return res.status(401).json({ error: 'token is required' });
    }

    // Check server-side env vars
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const userId = 'user';
    let adkSessionId = clientSessionId ? sessionMap.get(clientSessionId) : null;

    // Create or reuse ADK session
    if (!adkSessionId) {
      const session = await sessionService.createSession({
        appName: 'ai_ad_manager',
        userId,
        state: { token: userToken, adAccountId: adAccountId || null },
      });
      adkSessionId = session.id;
      if (clientSessionId) sessionMap.set(clientSessionId, adkSessionId);
      console.log(`[chat] created session ${adkSessionId}`);
    } else {
      console.log(`[chat] reusing session ${adkSessionId}`);
    }

    // Build the user message in Gemini Content format
    // Language instruction
    const LANG_MAP = {
      en: '',
      yue: '[LANGUAGE: Reply in Cantonese (廣東話). Use natural spoken Cantonese, not written Chinese. Keep technical terms like campaign names, metric names (ROAS, CTR, CPA), and numbers in English. All explanations, analysis, recommendations, and conversational text should be in Cantonese.]\n\n',
    };
    const langPrefix = LANG_MAP[language] || '';

    // Deep Research mode: prepend instruction to do thorough multi-step analysis
    const deepPrefix = mode === 'Deep Research'
      ? '[DEEP RESEARCH MODE] Analyze thoroughly: pull data from multiple tools, cross-reference metrics, compare time periods, check all related objects. Provide comprehensive breakdown with detailed tables and specific numbers. Do NOT summarize briefly — go deep.\n\n'
      : '';
    const newMessage = {
      role: 'user',
      parts: [{ text: langPrefix + deepPrefix + message }],
    };

    // Run the agent and stream events
    console.log(`[chat] running agent...`);
    const events = runner.runAsync({
      userId,
      sessionId: adkSessionId,
      newMessage,
      stateDelta: { token: userToken, adAccountId: adAccountId || null },
    });

    let fullText = '';
    let eventCount = 0;

    for await (const event of events) {
      eventCount++;
      // Log event structure for debugging
      if (eventCount <= 3) {
        console.log(`[chat] event #${eventCount}: author=${event.author}, hasContent=${!!event.content}, keys=${Object.keys(event).join(',')}`);
      }

      // Surface ADK errors as text so the user sees them
      if (event.errorMessage) {
        console.error(`[chat] ADK error: ${event.errorCode} ${event.errorMessage}`);
        sse(res, { type: 'text', content: `Error: ${event.errorMessage}` });
        fullText += event.errorMessage;
      }

      // Extract text content from the event
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.text) {
            fullText += part.text;
            sse(res, { type: 'text', content: part.text });
          }
          if (part.functionCall) {
            sse(res, { type: 'tool_call', name: part.functionCall.name });
            console.log(`[chat] tool call: ${part.functionCall.name}`);
          }
        }
      }
    }

    console.log(`[chat] done: ${eventCount} events, ${fullText.length} chars of text`);

    // If no text was generated, send a diagnostic message
    if (!fullText) {
      sse(res, { type: 'text', content: `I received your message but couldn't generate a response. This may be a temporary issue with the AI service. (${eventCount} events processed, adAccountId: ${adAccountId || 'none'})` });
    }

    sse(res, { type: 'done', sessionId: adkSessionId });
    res.end();
  } catch (err) {
    console.error('[chat] error:', err?.message, err?.stack);
    if (res.headersSent) {
      sse(res, { type: 'error', message: err.message });
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
