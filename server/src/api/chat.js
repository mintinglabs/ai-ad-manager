import { Router } from 'express';
import { runner, sessionService } from '../services/adAgent.js';
import { activeSessions } from '../lib/sessionBus.js';
import { extractPdfText } from '../lib/pdfExtract.js';
import { createBlockFilter } from '../lib/streamFilter.js';

// M1 — enable structured-block validation by default. Set
// CHAT_BLOCK_VALIDATION=off to bypass and reproduce pre-M1 behavior (useful
// for A/B testing the !demo-bad-json trigger).
const BLOCK_VALIDATION_ON = process.env.CHAT_BLOCK_VALIDATION !== 'off';

const router = Router();

// POST /api/chat/parse-doc — extract text from uploaded PDF/TXT
router.post('/parse-doc', async (req, res) => {
  try {
    const { base64, type, name } = req.body;
    if (!base64) return res.status(400).json({ error: 'No file data provided' });

    const buffer = Buffer.from(base64, 'base64');
    let text = '';

    if (type === 'application/pdf' || name?.endsWith('.pdf')) {
      text = await extractPdfText(buffer);
    } else if (name?.endsWith('.xlsx') || name?.endsWith('.xls') || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Excel: convert each sheet to a markdown table
      const { createRequire } = await import('module');
      const XLSX = createRequire(import.meta.url)('xlsx');
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

// Previously: in-memory chatSessionId → adkSessionId map.
// Now removed — chatSessionId IS the adkSessionId, state persists to Supabase
// via SupabaseSessionService, so cold-start / multi-instance deployments no
// longer lose agent context.

// Human-readable labels for tool calls shown in the activity log
function toolCallLabel(name, args) {
  const map = {
    get_campaigns:           () => 'Getting campaigns',
    get_ad_sets:             () => 'Getting ad sets',
    get_ads:                 () => 'Getting ads',
    get_account_insights:    () => 'Getting account insights',
    get_object_insights:     () => 'Getting performance insights',
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
    analyze_performance:     () => 'Analyzing campaign performance',
    analyze_creative_visual: () => 'Analyzing creative visuals',
    send_conversion_event:   () => 'Sending conversion event',
    get_pixel_stats:         () => 'Checking pixel stats',
    create_pixel:            () => 'Creating tracking pixel',
    create_custom_conversion:() => 'Creating custom conversion',
    load_skill:              () => `Loading skill "${args.skill_name || ''}"`,
    get_workflow_context:    () => 'Reading workflow state',
    update_workflow_context: () => 'Saving progress',
    transfer_to_agent:       () => {
      const labels = {
        analyst: 'Analyzing performance...',
        audience_strategist: 'Reviewing audiences...',
        creative_strategist: 'Auditing creatives...',
        executor: 'Setting up execution...',
        technical_guard: 'Checking tracking health...',
        ad_manager: 'Finishing up...',
      };
      const target = args.agentName || args.agent_name;
      return labels[target] || `Moving to ${target || 'next step'}`;
    },
  };
  return (map[name] || (() => name.replace(/_/g, ' ')))();
}

// Helper: send an SSE event.
//
// Critical: swallow write errors silently when the client has already
// disconnected (WiFi drop, tab close, etc). Without this, an EPIPE /
// ECONNRESET on `res.write` propagates up through the for-await loop
// in the chat handler, kills the runner mid-stream, and the in-flight
// events (including the user's message and any partial agent response)
// never reach Supabase via appendEvent. The next chat turn then loads a
// session with NO record of the previous turn → AI has no memory.
//
// By guarding the write, the runner runs to completion in the
// background, every event persists, and the user can resume the
// conversation as soon as their network is back.
const sse = (res, obj) => {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  } catch {
    // Client disconnected — keep the event loop running so persistence
    // finishes; we just stop trying to write to the dead socket.
  }
};

// POST /api/chat
// Body: { message, sessionId?, adAccountId?, token }
// Response: SSE stream of agent events
router.post('/', async (req, res) => {
  let adkSessionId = null;
  try {
    const { message, sessionId: clientSessionId, adAccountId, token, language = 'en', activeCustomSkill = null } = req.body;
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

    // ── M1: streaming block-validation filter ─────────────────────────────
    // Text chunks (both agent output and !demo-bad-json) are fed through
    // createBlockFilter; rich blocks are buffered until close-fence and
    // validated. Toggle off via CHAT_BLOCK_VALIDATION=off to reproduce raw
    // pre-M1 behavior.
    const filter = BLOCK_VALIDATION_ON
      ? createBlockFilter({
          emit: (text) => sse(res, { type: 'text', content: text }),
          onValidationFail: (result) => {
            console.warn('[chat] block validation failed', {
              type: result.type,
              reason: result.reason,
              issues: result.issues?.slice(0, 3),
            });
          },
          debugPlaceholder: process.env.CHAT_BLOCK_DEBUG === 'on',
        })
      : null;
    const emitText = (text) => {
      if (filter) filter.feed(text);
      else sse(res, { type: 'text', content: text });
    };

    // DEMO TRIGGER (kept as a diagnostic after M1) — streams a hand-crafted
    // malformed `metrics` block (trailing comma) + a valid `quickreplies`
    // block, so you can A/B the schema filter:
    //   CHAT_BLOCK_VALIDATION=on  (default) → bad metrics dropped, quickreplies renders
    //   CHAT_BLOCK_VALIDATION=off           → pre-M1 behavior, raw JSON code block
    if (typeof message === 'string' && message.trim().startsWith('!demo-bad-json')) {
      console.log('[chat] !demo-bad-json trigger hit');
      emitText("Here's your campaign snapshot:\n\n");
      emitText("```metrics\n[\n  { \"label\": \"ROAS\", \"value\": \"2.4x\", \"trend\": \"up\" },\n  { \"label\": \"Spend\", \"value\": \"$1,200\", \"trend\": \"up\" },\n  { \"label\": \"CTR\", \"value\": \"1.8%\", \"trend\": \"down\" },\n]\n```\n\n");
      emitText("Want to dig deeper?\n\n");
      emitText("```quickreplies\n[\"Top campaigns\", \"Export CSV\", \"Pause underperformers\"]\n```\n");
      filter?.flush();
      sse(res, { type: 'done', sessionId: clientSessionId || 'demo-session' });
      res.end();
      return;
    }

    // Reuse existing persisted session if the client sent an id we already
    // know; otherwise create a new one using that id (so chatSessionId ===
    // adkSessionId going forward).
    const sessionInitState = { token: userToken, adAccountId: adAccountId || null, activeCustomSkill };
    const session = await sessionService.getOrCreateSession({
      appName: 'ai_ad_manager',
      userId,
      sessionId: clientSessionId || undefined,
      state: sessionInitState,
    });
    adkSessionId = session.id;
    const reused = session.events?.length > 0;
    console.log(`[chat] ${reused ? 'resumed' : 'created'} session ${adkSessionId} (${session.events?.length || 0} prior events)`);

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

    // Log if the client drops mid-stream so we can confirm in production
    // logs that the runner was kept running in the background and events
    // were still persisted (the actual fix lives in `sse`).
    req.on('close', () => {
      if (!res.writableEnded) {
        console.log(`[chat] client disconnected mid-stream session=${adkSessionId?.slice(0, 8)} — runner continues, events still persist`);
      }
    });

    // Run the agent and stream events (with retry on transient errors)
    const MAX_RETRIES = 2;
    let fullText = '';
    let eventCount = 0;

    // Cap how many times the model is allowed to call transfer_to_agent in a
    // single user turn. Without this, root ↔ analyst ↔ executor can ping-pong
    // forever — every hop reloads the target agent's full system prompt and
    // tool schema into the Gemini context, so a runaway loop burns tokens
    // and wall-clock fast. 8 is generous: a normal turn does 1–2 transfers,
    // even mixed analyze+execute flows top out around 4. The counter spans
    // ALL retry attempts on purpose — if a session is genuinely stuck, retry
    // shouldn't reset its budget.
    const TRANSFER_CAP = 8;
    let transferCount = 0;
    let transferCapped = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Retry path: MALFORMED_FUNCTION_CALL / Gemini 500. We keep the same
        // session id so prior persisted events remain; the retry just runs
        // another turn on top of the same session.
        console.log(`[chat] retry attempt ${attempt} — reusing session ${adkSessionId}`);
        activeSessions.set(adkSessionId, (data) => sse(res, data));
      }

      console.log(`[chat] running agent... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      const events = runner.runAsync({
        userId,
        sessionId: adkSessionId,
        newMessage,
        stateDelta: { token: userToken, adAccountId: adAccountId || null, activeCustomSkill },
      });

      fullText = '';
      eventCount = 0;
      let shouldRetry = false;

      for await (const event of events) {
        eventCount++;
        if (eventCount <= 3) {
          console.log(`[chat] event #${eventCount}: author=${event.author}, hasContent=${!!event.content}, errorCode=${event.errorCode || 'none'}`);
        }

        // Detect retryable errors — MALFORMED_FUNCTION_CALL or Gemini 500
        if (event.errorCode === 'MALFORMED_FUNCTION_CALL') {
          console.warn(`[chat] MALFORMED_FUNCTION_CALL detected, will retry`);
          shouldRetry = true;
          continue;
        }

        if (event.errorMessage) {
          const isGemini500 = String(event.errorCode) === '500' || event.errorMessage === 'Internal error encountered.';
          if (isGemini500 && attempt < MAX_RETRIES) {
            console.warn(`[chat] Gemini 500 error, will retry (attempt ${attempt + 1})`);
            shouldRetry = true;
            continue;
          }
          console.error(`[chat] ADK error: ${event.errorCode} ${event.errorMessage}`);
          emitText(`Error: ${event.errorMessage}`);
          fullText += event.errorMessage;
        }

        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              fullText += part.text;
              emitText(part.text);
            }
            if (part.functionCall) {
              const name = part.functionCall.name;
              const args = part.functionCall.args || {};

              // Transfer-cap check BEFORE we hand control back to the runner.
              // If we've blown the budget, surface a tool_call event so the
              // UI shows what happened, write a user-visible note into the
              // text stream, and abort this turn.
              if (name === 'transfer_to_agent') {
                transferCount++;
                if (transferCount > TRANSFER_CAP) {
                  console.warn(
                    `[chat] transfer cap (${TRANSFER_CAP}) hit on session ${adkSessionId} — aborting turn`
                  );
                  sse(res, {
                    type: 'tool_call',
                    name: 'transfer_to_agent',
                    label: `Transfer cap reached (${TRANSFER_CAP}) — aborting turn`,
                  });
                  emitText(
                    '\n\n_Stopped: the agents kept handing the request back and forth. ' +
                    'Try rephrasing or breaking the task into smaller steps._'
                  );
                  transferCapped = true;
                  break; // out of parts loop
                }
              }

              const label = toolCallLabel(name, args);
              const payload = { type: 'tool_call', name, label };
              if (name === 'transfer_to_agent') payload.target = args.agentName || args.agent_name;
              sse(res, payload);
              console.log(`[chat] tool call: ${name}`);
              if (name === 'update_workflow_context') {
                const wfData = args.data;
                if (wfData) sse(res, { type: 'context', data: wfData });
              }
            }
          }
          if (transferCapped) break; // out of events loop
        }
      }

      // If we hit the transfer cap, stop completely — don't let retry
      // re-enter the same loop on the same session.
      if (transferCapped) break;

      // If we got text or no retryable error, stop
      if (fullText || !shouldRetry) break;
    }

    console.log(`[chat] done: ${eventCount} events, ${fullText.length} chars of text`);

    if (!fullText) {
      emitText(`I received your message but couldn't generate a response. Please try again. (adAccountId: ${adAccountId || 'none'})`);
    }

    // Flush any residual text / report unclosed blocks before closing SSE.
    filter?.flush();

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
