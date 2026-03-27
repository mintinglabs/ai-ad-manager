import { Router } from 'express';
import { runner, sessionService } from '../services/adAgent.js';
import { activeSessions } from '../lib/sessionBus.js';

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
    } else if (name?.endsWith('.xlsx') || name?.endsWith('.xls') || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Excel: convert each sheet to a markdown table
      const XLSX = (await import('xlsx')).default;
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const parts = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length === 0) continue;
        parts.push(`## Sheet: ${sheetName}\n`);
        // Header row
        const header = rows[0].map(String);
        parts.push('| ' + header.join(' | ') + ' |');
        parts.push('| ' + header.map(() => '---').join(' | ') + ' |');
        // Data rows
        for (let i = 1; i < rows.length; i++) {
          parts.push('| ' + rows[i].map(c => String(c ?? '')).join(' | ') + ' |');
        }
        parts.push('');
      }
      text = parts.join('\n');
    } else if (name?.endsWith('.csv') || type === 'text/csv') {
      // CSV: parse and convert to markdown table
      const raw = buffer.toString('utf-8');
      const lines = raw.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 0) {
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
              if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
              else if (ch === '"') { inQuotes = false; }
              else { current += ch; }
            } else {
              if (ch === '"') { inQuotes = true; }
              else if (ch === ',') { result.push(current.trim()); current = ''; }
              else { current += ch; }
            }
          }
          result.push(current.trim());
          return result;
        };
        const rows = lines.map(parseCSVLine);
        const parts = [];
        const header = rows[0];
        parts.push('| ' + header.join(' | ') + ' |');
        parts.push('| ' + header.map(() => '---').join(' | ') + ' |');
        for (let i = 1; i < rows.length; i++) {
          parts.push('| ' + rows[i].join(' | ') + ' |');
        }
        text = parts.join('\n');
      }
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

// Human-readable labels for tool calls shown in the activity log
function toolCallLabel(name, args) {
  const map = {
    get_campaigns:           () => 'Getting campaigns',
    get_ad_sets:             () => 'Getting ad sets',
    get_ads:                 () => 'Getting ads',
    get_insights:            () => 'Getting insights',
    get_ad_account_details:  () => 'Getting account details',
    get_minimum_budgets:     () => 'Checking minimum budgets',
    get_pages:               () => 'Getting Facebook pages',
    get_pixels:              () => 'Getting pixels',
    get_lead_forms:          () => 'Getting lead forms',
    get_custom_audiences:    () => 'Getting custom audiences',
    get_saved_audiences:     () => 'Getting saved audiences',
    get_ad_images:           () => 'Getting image library',
    get_ad_videos:           () => 'Getting video library',
    get_page_posts:          () => 'Getting page posts',
    get_connected_instagram_accounts: () => 'Checking Instagram connection',
    targeting_search:        () => `Searching interests: "${args.query || ''}"`,
    get_reach_estimate:      () => 'Estimating audience size',
    create_campaign:         () => `Creating campaign`,
    create_ad_set:           () => 'Creating ad set',
    create_ad_creative:      () => 'Creating ad creative',
    create_ad:               () => 'Creating ad',
    create_ads_bulk:         () => `Creating ${args.ads?.length || 'N'} ads in bulk`,
    upload_ad_image:         () => `Uploading image "${args.name || ''}"`,
    upload_ad_video:         () => `Uploading video "${args.title || ''}"`,
    get_ad_video_status:     () => 'Checking video status',
    preflight_check:         () => 'Running pre-flight check',
    get_ad_preview:          () => 'Generating ad preview',
    update_campaign:         () => 'Updating campaign',
    update_ad_set:           () => 'Updating ad set',
    update_ad:               () => 'Updating ad',
    load_skill:              () => `Loading skill "${args.skill_name || ''}"`,
    get_workflow_context:    () => 'Reading workflow state',
    update_workflow_context: () => 'Saving progress',
    transfer_to_agent:       () => `Moving to ${args.agent_name || 'next step'}`,
  };
  return (map[name] || (() => name.replace(/_/g, ' ')))();
}

// Helper: send an SSE event
const sse = (res, obj) => {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
};

// POST /api/chat
// Body: { message, sessionId?, adAccountId?, token }
// Response: SSE stream of agent events
router.post('/', async (req, res) => {
  let adkSessionId = null;
  try {
    const { message, sessionId: clientSessionId, adAccountId, token, language = 'en' } = req.body;
    console.log(`[chat] message="${message?.slice(0, 60)}" adAccountId=${adAccountId} lang=${language} session=${clientSessionId?.slice(0, 8)}`);
    console.log(`[chat] token=${(req.token || token || '').slice(0, 15)}... bodyToken=${!!token} headerToken=${!!req.token}`);
    console.log(`[chat] env check: GEMINI_API_KEY=${!!process.env.GEMINI_API_KEY}`);

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Use token from requireToken middleware (Bearer header), falling back to body
    // Token is optional — allow general questions without auth
    const userToken = req.token || token || null;

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
    adkSessionId = clientSessionId ? sessionMap.get(clientSessionId) : null;

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
    // Inject today's date so the agent calculates date ranges correctly
    const todayStr = new Date().toISOString().split('T')[0];
    const datePrefix = `[Current date: ${todayStr}] `;
    const newMessage = {
      role: 'user',
      parts: [{ text: datePrefix + langPrefix + message }],
    };

    // Register SSE emitter for this session so adAgent.js tools can emit tool_result events
    activeSessions.set(adkSessionId, (data) => sse(res, data));

    // Run the agent and stream events (with retry on MALFORMED_FUNCTION_CALL)
    const MAX_RETRIES = 1;
    let fullText = '';
    let eventCount = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[chat] retry attempt ${attempt} after MALFORMED_FUNCTION_CALL`);
        // Create a fresh session for retry to avoid corrupted state
        const retrySession = await sessionService.createSession({
          appName: 'ai_ad_manager',
          userId,
          state: { token: userToken, adAccountId: adAccountId || null },
        });
        adkSessionId = retrySession.id;
        if (clientSessionId) sessionMap.set(clientSessionId, adkSessionId);
        activeSessions.set(adkSessionId, (data) => sse(res, data));
      }

      console.log(`[chat] running agent... (attempt ${attempt + 1})`);
      const events = runner.runAsync({
        userId,
        sessionId: adkSessionId,
        newMessage,
        stateDelta: { token: userToken, adAccountId: adAccountId || null },
      });

      fullText = '';
      eventCount = 0;
      let malformedCall = false;

      for await (const event of events) {
        eventCount++;
        if (eventCount <= 3) {
          console.log(`[chat] event #${eventCount}: author=${event.author}, hasContent=${!!event.content}, errorCode=${event.errorCode || 'none'}`);
        }

        // Detect MALFORMED_FUNCTION_CALL — retry instead of showing error
        if (event.errorCode === 'MALFORMED_FUNCTION_CALL') {
          console.warn(`[chat] MALFORMED_FUNCTION_CALL detected, will retry`);
          malformedCall = true;
          continue;
        }

        if (event.errorMessage && event.errorCode !== 'MALFORMED_FUNCTION_CALL') {
          console.error(`[chat] ADK error: ${event.errorCode} ${event.errorMessage}`);
          sse(res, { type: 'text', content: `Error: ${event.errorMessage}` });
          fullText += event.errorMessage;
        }

        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              fullText += part.text;
              sse(res, { type: 'text', content: part.text });
            }
            if (part.functionCall) {
              const name = part.functionCall.name;
              const args = part.functionCall.args || {};
              const label = toolCallLabel(name, args);
              const payload = { type: 'tool_call', name, label };
              if (name === 'transfer_to_agent') payload.target = args.agent_name;
              sse(res, payload);
              console.log(`[chat] tool call: ${name}`);
              // Send workflow context updates to client
              if (name === 'update_workflow_context') {
                const wfData = args.data;
                if (wfData) sse(res, { type: 'context', data: wfData });
              }
            }
          }
        }
      }

      // If we got text or no malformed call, stop retrying
      if (fullText || !malformedCall) break;
    }

    console.log(`[chat] done: ${eventCount} events, ${fullText.length} chars of text`);

    if (!fullText) {
      sse(res, { type: 'text', content: `I received your message but couldn't generate a response. Please try again. (adAccountId: ${adAccountId || 'none'})` });
    }

    activeSessions.delete(adkSessionId);
    sse(res, { type: 'done', sessionId: adkSessionId });
    res.end();
  } catch (err) {
    console.error('[chat] error:', err?.message, err?.stack);
    if (adkSessionId) activeSessions.delete(adkSessionId);
    if (res.headersSent) {
      // Send as text so the user sees the actual error instead of a generic fallback
      sse(res, { type: 'text', content: `Sorry, I ran into an error: ${err.message}` });
      sse(res, { type: 'done', sessionId: 'error' });
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
