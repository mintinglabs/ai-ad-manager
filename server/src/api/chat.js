import { Router } from 'express';
import { runner, sessionService } from '../services/adAgent.js';

const router = Router();

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
    const { message, sessionId: clientSessionId, adAccountId, token } = req.body;
    console.log(`[chat] message="${message?.slice(0, 60)}" adAccountId=${adAccountId} session=${clientSessionId?.slice(0, 8)}`);
    console.log(`[chat] env check: GEMINI_API_KEY=${!!process.env.GEMINI_API_KEY} META_DEMO_TOKEN=${!!process.env.META_DEMO_TOKEN}`);

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!token) {
      return res.status(401).json({ error: 'token is required' });
    }

    // Check server-side env vars
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }
    if (!process.env.META_DEMO_TOKEN) {
      return res.status(500).json({ error: 'META_DEMO_TOKEN not configured on server' });
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
        state: { token, adAccountId: adAccountId || null },
      });
      adkSessionId = session.id;
      if (clientSessionId) sessionMap.set(clientSessionId, adkSessionId);
      console.log(`[chat] created session ${adkSessionId}`);
    } else {
      console.log(`[chat] reusing session ${adkSessionId}`);
    }

    // Build the user message in Gemini Content format
    const newMessage = {
      role: 'user',
      parts: [{ text: message }],
    };

    // Run the agent and stream events
    console.log(`[chat] running agent...`);
    const events = runner.runAsync({
      userId,
      sessionId: adkSessionId,
      newMessage,
      stateDelta: { token, adAccountId: adAccountId || null },
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
