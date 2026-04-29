// In-flight chat-turn pubsub — lets multiple SSE consumers (the original
// POST /api/chat handler + late-joining browsers after a refresh)
// receive the same event stream.
//
// One EventBus per ADK session. Lifecycle:
//   1. POST /api/chat creates a bus when a turn starts.
//   2. Tools (server/src/lib/tools.js) and the chat handler call
//      bus.publish(event) — every subscriber gets it.
//   3. New GET /api/chat/sessions/:id/stream subscribers replay the
//      buffer (so a refresh-mid-stream doesn't lose the events that
//      already fired) then receive live events.
//   4. On turn completion the bus is marked done. It sticks around for a
//      short grace period so a refresh that lands just after "done"
//      can still pick up the final state, then it's purged.
//
// Backwards-compat: tools.js used to call `activeSessions.get(id)(data)`,
// expecting the Map to hold a (data) => void function. We now store the
// EventBus itself; consumers should use `getEmitter(id)` to get a
// publish callback, or `getOrCreateBus(id)` for full bus access.

const BUFFER_LIMIT = 200;        // recent events kept for late subscribers
const GRACE_PERIOD_MS = 60_000;  // how long a "done" bus stays around
const SESSION_TTL    = 30 * 60_000; // forced GC for buses that never finished (legacy 30 min)

class EventBus {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.subscribers = new Set();
    this.buffer = [];
    this.startedAt = Date.now();
    this.lastAccess = Date.now();
    this.done = false;
  }

  publish(event) {
    // Once done is signalled the bus stops accepting new events — late
    // tools that still try to emit after the runner ended just no-op.
    if (this.done) return;
    this.lastAccess = Date.now();
    this.buffer.push(event);
    if (this.buffer.length > BUFFER_LIMIT) this.buffer.shift();
    for (const fn of this.subscribers) {
      try { fn(event); }
      catch {
        // A dead subscriber (closed socket, unhandled exception in their
        // write) should never block other subscribers. Drop it silently.
        this.subscribers.delete(fn);
      }
    }
  }

  // Late-join replay: send everything we still have in the buffer to the
  // new subscriber synchronously, then add them to the live set so they
  // get future events too.
  subscribe(fn) {
    for (const event of this.buffer) {
      try { fn(event); } catch {}
    }
    this.subscribers.add(fn);
    this.lastAccess = Date.now();
    return () => this.subscribers.delete(fn);
  }

  // markDone fires a final 'done' event to everyone, sets the flag so no
  // more publishes get through, and starts the grace-period clock.
  markDone() {
    if (this.done) return;
    this.done = true;
    this.lastAccess = Date.now();
    const doneEvent = { type: 'done', sessionId: this.sessionId };
    this.buffer.push(doneEvent);
    for (const fn of this.subscribers) {
      try { fn(doneEvent); } catch {}
    }
  }
}

export const activeSessions = new Map(); // sessionId → EventBus

export function getOrCreateBus(sessionId) {
  let bus = activeSessions.get(sessionId);
  if (!bus) {
    bus = new EventBus(sessionId);
    activeSessions.set(sessionId, bus);
  }
  return bus;
}

// Compat helper for tools.js — returns a publish callback that routes
// through the bus, or null if there's no active bus for this session.
export function getEmitter(sessionId) {
  const bus = activeSessions.get(sessionId);
  if (!bus) return null;
  return (data) => bus.publish(data);
}

// Public bus lookup — used by /sessions/:id/status and /sessions/:id/stream
// so the routes can answer "is anything running for this session?".
export function getBus(sessionId) {
  return activeSessions.get(sessionId) || null;
}

// Cleanup interval. Two policies:
//   • Bus marked done       → drop after GRACE_PERIOD_MS (so a refresh
//                              within that window still finds it)
//   • Bus still "active"    → drop after 30 min of no publishes (catch
//                              runaway / orphaned buses)
setInterval(() => {
  const now = Date.now();
  for (const [key, bus] of activeSessions.entries()) {
    if (bus.done && now - bus.lastAccess > GRACE_PERIOD_MS) activeSessions.delete(key);
    else if (!bus.done && now - bus.lastAccess > SESSION_TTL) activeSessions.delete(key);
  }
}, 5 * 60_000);
