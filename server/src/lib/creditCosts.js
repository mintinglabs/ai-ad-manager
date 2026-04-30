// Tool cost catalog — maps a tool name to its credit weight, used by the
// chat handler to accumulate per-turn charges. Phase 2 keeps this simple
// with three weight classes (light/medium/heavy) plus name-pattern fallback
// so new tools auto-classify without code changes.
//
// Weights are deliberately coarse so users can mentally model costs:
//   1   = read / lookup
//   5   = create / update / mutate
//   20  = expensive generation or external scraping
//   0   = internal plumbing (agent transfers, workflow state)
//
// Override the pattern fallback by listing a tool explicitly in the maps
// below.

export const COST_BASE_PER_TURN = 1;          // flat base for every chat message
// Minimum balance required to start a turn. Set well above the base fee so
// we don't let a user with 1 credit launch an agentic flow that would cost
// 30+ credits and only settle 1 (clamped). 10 covers a typical light query
// (base + ~3 read tools) — heavier flows still settle clamped at end-of-turn,
// but the average user can't game the floor.
export const COST_MIN_PRECHECK = 10;

// Internal / no-charge tools. These are routing or state-management
// primitives — the agent uses them as control flow, not user-facing work.
const FREE_TOOLS = new Set([
  'transfer_to_agent',
  'update_workflow_context',
  'get_workflow_context',
]);

// Heavy operations that map to expensive backend work. Add new entries
// here when introducing image/video generation, large crawls, etc.
const HEAVY_TOOLS = new Set([
  // Brand Memory crawls — multi-page web fetch + LLM summarisation
  'crawl_website',
  'crawl_brand_pages',
  // Creative generation
  'generate_image',
  'generate_video',
  'generate_creative',
  // Audience expansion (LLM heavy)
  'generate_audience_personas',
  'expand_audience_lookalike',
]);

// Optional explicit medium-weight overrides that don't match the pattern.
const MEDIUM_OVERRIDES = new Set([
  'load_skill', // pulls a skill markdown + injects into context
  'create_skill',
]);

// Returns the credit cost for a single tool invocation. Defaults to 1
// (light) for unknown tools so we don't silently 0-cost a new mutation.
export function costForTool(toolName) {
  if (!toolName) return 1;
  if (FREE_TOOLS.has(toolName)) return 0;
  if (HEAVY_TOOLS.has(toolName)) return 20;
  if (MEDIUM_OVERRIDES.has(toolName)) return 5;

  // Pattern-based classification — matches our existing tool naming.
  if (/^(get|list|search|fetch|read|preview|estimate|find)_/.test(toolName)) return 1;
  if (/^(create|update|delete|pause|activate|set|upload|publish|toggle|copy|duplicate|launch)_/.test(toolName)) return 5;

  // Unknown shape — be conservative, treat as light.
  return 1;
}

// Convenience for end-of-turn UI summary.
export function summarise(charges) {
  const total = charges.reduce((s, c) => s + c.cost, 0);
  return { items: charges, total };
}
