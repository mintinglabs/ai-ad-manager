// Shared SSE emitter map — avoids circular import between chat.js and adAgent.js
// chat.js registers: activeSessions.set(sessionId, sseFn)
// adAgent.js reads:  activeSessions.get(sessionId)
export const activeSessions = new Map();
