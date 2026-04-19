import { LlmAgent, Runner, InMemorySessionService } from '@google/adk';
import { rootTools, analystTools, executorTools, googleReadTools, googleWriteTools } from '../lib/tools.js';
import { buildInstruction, buildAnalystInstruction, buildExecutorInstruction } from '../lib/instructions.js';

// ── 2 Sub-agents ─────────────────────────────────────────────────────────────

const analystAgent = new LlmAgent({
  name: 'analyst',
  model: 'gemini-3-flash-preview',
  description: 'All read-only operations — performance diagnostics, creative health, audience analysis, tracking audits.',
  instruction: buildAnalystInstruction(),
  tools: [...analystTools, ...googleReadTools],
});

const executorAgent = new LlmAgent({
  name: 'executor',
  model: 'gemini-3-flash-preview',
  description: 'All write operations — campaign/ad CRUD, audience creation, tracking setup. The only agent that writes to Meta API.',
  instruction: buildExecutorInstruction(),
  tools: [...executorTools, ...googleReadTools, ...googleWriteTools],
});

// ── Debug: log tool counts ───────────────────────────────────────────────────
console.log(`[adAgent] Tool counts — root: ${rootTools.length} (${rootTools.map(t=>t.name).join(', ')}), analyst: ${analystTools.length}, executor: ${executorTools.length}`);

// ── Root agent + runner ──────────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-3-flash-preview',
  instruction: buildInstruction(),
  tools: [...rootTools, ...googleReadTools],
  subAgents: [analystAgent, executorAgent],
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
