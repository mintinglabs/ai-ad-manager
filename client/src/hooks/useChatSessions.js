import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatAgent, getWelcomeMessage, makeId } from './useChatAgent.js';
import api from '../services/api.js';

const MAX_SESSIONS = 50;

// ── Server sync (fire-and-forget; falls back silently on error) ─────────────
// Keeps UI snappy: localStorage is source of truth for display, server is
// background-persisted so history survives cross-device + cache clear.
const serverListSessions = async () => {
  try { const { data } = await api.get('/chat/history/sessions'); return data.sessions || []; }
  catch { return null; }
};
const serverGetMessages = async (sessionId) => {
  try { const { data } = await api.get(`/chat/history/sessions/${sessionId}/messages`); return data.messages || []; }
  catch { return null; }
};
const serverUpsertSession = (sessionId, patch) => {
  api.put(`/chat/history/sessions/${sessionId}`, patch).catch(() => {});
};
const serverDeleteSession = (sessionId) => {
  api.delete(`/chat/history/sessions/${sessionId}`).catch(() => {});
};
// A4 fix: strip ephemeral blob: previews before persisting. They're backed by
// URL.createObjectURL() and die the moment the tab closes — keeping them in
// the DB would render broken <img> tags on reload. gcs_public_url is the
// durable substitute (present whenever the GCS side-car succeeded).
const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments) || !attachments.length) return undefined;
  return attachments.map(a => {
    const clean = { ...a };
    if (typeof clean.preview === 'string' && clean.preview.startsWith('blob:')) {
      delete clean.preview;
    }
    return clean;
  });
};

const serverSaveMessages = (sessionId, messages) => {
  // Map frontend message shape → server shape. Keep metadata for attachments/activity.
  const rows = messages
    .filter(m => m && m.id && m.role)
    .map(m => ({
      id: String(m.id),
      role: m.role,
      content: m.text || m.content || '',
      metadata: {
        attachments: sanitizeAttachments(m.attachments),
        activityLog: m.activityLog || undefined,
        canvasBlocks: m.canvasBlocks || undefined,
      },
      timestamp: m.timestamp,
    }));
  if (rows.length === 0) return;
  api.post(`/chat/history/sessions/${sessionId}/messages`, { messages: rows }).catch(() => {});
};

// ── localStorage helpers (global — not per account) ─────────────────────────
const getSessionList = () => {
  try { return JSON.parse(localStorage.getItem('aam_chats')) || []; }
  catch { return []; }
};
const setSessionList = (list) => {
  localStorage.setItem('aam_chats', JSON.stringify(list.slice(0, MAX_SESSIONS)));
};
const getSessionMessages = (sessionId) => {
  try { return JSON.parse(localStorage.getItem(`aam_chat_${sessionId}`)) || null; }
  catch { return null; }
};
const setSessionMessages = (sessionId, messages) => {
  // Strip blob: previews from localStorage too — they expire with the tab
  // and would render broken images on reload (see sanitizeAttachments).
  const cleaned = messages.map(m => (
    m?.attachments?.length ? { ...m, attachments: sanitizeAttachments(m.attachments) } : m
  ));
  localStorage.setItem(`aam_chat_${sessionId}`, JSON.stringify(cleaned));
};
const removeSessionMessages = (sessionId) => {
  localStorage.removeItem(`aam_chat_${sessionId}`);
};
const getSavedItems = () => {
  try { return JSON.parse(localStorage.getItem('aam_saved')) || []; }
  catch { return []; }
};
const setSavedItems = (items) => {
  localStorage.setItem('aam_saved', JSON.stringify(items));
};

// ── Folder helpers ──────────────────────────────────────────────────────────
const DEFAULT_FOLDERS = [
  { id: 'reports', name: 'Reports', order: 0 },
  { id: 'strategies', name: 'Strategies', order: 1 },
];
const getFolders = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('aam_folders'));
    if (!saved) return [...DEFAULT_FOLDERS];
    const result = [...saved];
    for (const def of DEFAULT_FOLDERS) {
      if (!result.find(f => f.id === def.id)) result.unshift(def);
    }
    return result;
  } catch { return [...DEFAULT_FOLDERS]; }
};
const setFoldersStorage = (folders) => {
  localStorage.setItem('aam_folders', JSON.stringify(folders));
};

// ── Date grouping ────────────────────────────────────────────────────────────
const getDateGroup = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  if (diffDays <= 30) return 'Previous 30 Days';
  return 'Older';
};

export const groupSessionsByDate = (sessions) => {
  const groups = {};
  for (const s of sessions) {
    const group = getDateGroup(s.updatedAt || s.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(s);
  }
  // Sort pinned sessions to top within each group
  for (const group in groups) {
    groups[group].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }
  return groups;
};

// ── Hook ─────────────────────────────────────────────────────────────────────
// `initialSessionId` (from router) bootstraps us onto a specific session on
// mount, avoiding the "fresh id → switch to URL id" race that would otherwise
// let useChatAgent's externalSessionId effect wipe messages mid-load.
export const useChatSessions = ({ token, adAccountId, accountName, language = 'en', initialSessionId: initialSessionIdOverride = null }) => {
  const [sessions, setSessions] = useState([]);
  // Pre-seed with URL id if present so the very first render already matches.
  const [activeSessionId, setActiveSessionId] = useState(() => initialSessionIdOverride || makeId());
  const [savedItems, setSavedItemsState] = useState([]);
  const [folders, setFoldersState] = useState([...DEFAULT_FOLDERS]);
  const [saveNotification, setSaveNotification] = useState(null);
  const prevTypingRef = useRef(false);

  // Messages + externalSessionId fed to useChatAgent. Initialised from the
  // same seed so agent's sessionIdRef is stable from render 1 (no reset on
  // render 2 when null→seed transition would otherwise fire).
  const [initialMessages, setInitialMessages] = useState(null);
  const [initialSessionId, setInitialSessionId] = useState(() => initialSessionIdOverride || null);

  // Tracks message ids we've already eagerly persisted to server so a refresh
  // mid-stream can recover them. The auto-save effect below only fires when
  // typing transitions true→false, which is too late if the user refreshes
  // while the agent is still streaming — their just-sent user turn would
  // otherwise vanish (DB empty → welcome page on reload).
  const eagerPersistedIdsRef = useRef(new Set());

  // Initialize on mount — either load the URL-provided session or start fresh.
  useEffect(() => {
    const list = getSessionList();
    setSessions(list);
    setSavedItemsState(getSavedItems());
    setFoldersState(getFolders());

    if (initialSessionIdOverride) {
      // Came in on /c/:id — load that session's messages into the agent.
      // We call agent.loadSession directly (instead of seeding initialMessages)
      // because useChatAgent's messages state was already init'd from the
      // render where initialMessages was null. loadSession is the authoritative
      // way to swap in a transcript post-mount.
      const local = getSessionMessages(initialSessionIdOverride);
      if (local?.length) {
        agent.loadSession(initialSessionIdOverride, local);
      } else {
        serverGetMessages(initialSessionIdOverride).then(remote => {
          if (!remote?.length) return;
          const mapped = remote.map(r => ({
            id: r.id,
            role: r.role,
            text: r.content,
            timestamp: new Date(r.created_at).getTime(),
            ...(r.metadata?.attachments ? { attachments: r.metadata.attachments } : {}),
            ...(r.metadata?.activityLog ? { activityLog: r.metadata.activityLog } : {}),
            ...(r.metadata?.canvasBlocks ? { canvasBlocks: r.metadata.canvasBlocks } : {}),
          }));
          setSessionMessages(initialSessionIdOverride, mapped);
          agent.loadSession(initialSessionIdOverride, mapped);
        });
      }
    } else {
      // Always start fresh — user can click old sessions in sidebar to resume
      const newId = makeId();
      setInitialMessages(null);
      setInitialSessionId(newId);
      setActiveSessionId(newId);
    }

    // Background: fetch server-side sessions and merge into the list.
    // Server wins for shared fields (title/pinned/updatedAt). Local-only sessions remain.
    serverListSessions().then((remote) => {
      if (!remote) return;  // offline / unauthed — keep local only
      setSessions(prev => {
        const byId = new Map(prev.map(s => [s.id, s]));
        for (const r of remote) {
          const local = byId.get(r.id);
          byId.set(r.id, {
            id: r.id,
            title: r.title || local?.title || 'New Chat',
            createdAt: new Date(r.created_at).getTime(),
            updatedAt: new Date(r.updated_at).getTime(),
            messageCount: r.message_count || local?.messageCount || 0,
            pinned: r.pinned ?? local?.pinned ?? false,
          });
        }
        const merged = [...byId.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, MAX_SESSIONS);
        setSessionList(merged);
        return merged;
      });
    });
  }, []); // run once on mount

  const agent = useChatAgent({
    token,
    adAccountId,
    accountName,
    language,
    initialMessages,
    externalSessionId: initialSessionId,
  });

  // Eagerly persist user messages the moment they appear so a refresh
  // mid-stream can rehydrate them from the server (auto-save below only
  // fires after typing stops, which doesn't help if the user reloads
  // while the agent is still streaming).
  useEffect(() => {
    if (!activeSessionId) return;
    const fresh = agent.messages.filter(
      m => m && m.id && m.role === 'user' && !eagerPersistedIdsRef.current.has(m.id)
    );
    if (fresh.length === 0) return;
    fresh.forEach(m => eagerPersistedIdsRef.current.add(m.id));
    setSessionMessages(activeSessionId, agent.messages);
    serverSaveMessages(activeSessionId, fresh);
  }, [agent.messages, activeSessionId]);

  // Reset the eager-persist dedup set whenever the active session changes.
  useEffect(() => {
    eagerPersistedIdsRef.current = new Set();
  }, [activeSessionId]);

  // Auto-save messages when agent finishes typing
  useEffect(() => {
    if (prevTypingRef.current && !agent.isTyping && activeSessionId) {
      const msgs = agent.messages;
      if (msgs.length > 1) {
        setSessionMessages(activeSessionId, msgs);

        const firstUserMsg = msgs.find(m => m.role === 'user');
        const title = firstUserMsg?.text?.slice(0, 50) || 'New Chat';

        setSessions(prev => {
          const existing = prev.find(s => s.id === activeSessionId);
          const updated = {
            id: activeSessionId,
            title,
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now(),
            messageCount: msgs.length,
            pinned: existing?.pinned || false,
          };
          const filtered = prev.filter(s => s.id !== activeSessionId);
          const newList = [updated, ...filtered].slice(0, MAX_SESSIONS);
          setSessionList(newList);
          return newList;
        });

        // Background-persist full transcript to server (idempotent upsert by id)
        serverSaveMessages(activeSessionId, msgs);
        serverUpsertSession(activeSessionId, { title, message_count: msgs.length });
      }
    }
    prevTypingRef.current = agent.isTyping;
  }, [agent.isTyping, agent.messages, activeSessionId]);

  // Persist current session before switching
  const persistCurrent = useCallback(() => {
    if (!activeSessionId) return;
    const msgs = agent.messages;
    if (msgs.length > 1) {
      setSessionMessages(activeSessionId, msgs);
    }
  }, [activeSessionId, agent.messages]);

  // Create new chat. Returns the newly minted session id so callers (router
  // integration) can navigate to /c/<id> when needed.
  const createNewChat = useCallback(() => {
    persistCurrent();
    const newId = agent.resetChat();
    setActiveSessionId(newId);
    return newId;
  }, [persistCurrent, agent]);

  // Switch to existing session — prefer local (fast), fall back to server (cross-device)
  const switchSession = useCallback((sessionId) => {
    if (sessionId === activeSessionId) return;
    persistCurrent();
    const local = getSessionMessages(sessionId);
    if (local?.length) {
      agent.loadSession(sessionId, local);
      setActiveSessionId(sessionId);
    } else {
      // Try server; cache to localStorage on success
      agent.loadSession(sessionId, []);
      setActiveSessionId(sessionId);
      serverGetMessages(sessionId).then(remote => {
        if (!remote?.length) return;
        const mapped = remote.map(r => ({
          id: r.id,
          role: r.role,
          text: r.content,
          timestamp: new Date(r.created_at).getTime(),
          ...(r.metadata?.attachments ? { attachments: r.metadata.attachments } : {}),
          ...(r.metadata?.activityLog ? { activityLog: r.metadata.activityLog } : {}),
          ...(r.metadata?.canvasBlocks ? { canvasBlocks: r.metadata.canvasBlocks } : {}),
        }));
        setSessionMessages(sessionId, mapped);
        agent.loadSession(sessionId, mapped);
      });
    }
  }, [activeSessionId, persistCurrent, agent, accountName]);

  // Delete session — remove locally + server
  const deleteSession = useCallback((sessionId) => {
    removeSessionMessages(sessionId);
    setSessions(prev => {
      const newList = prev.filter(s => s.id !== sessionId);
      setSessionList(newList);
      return newList;
    });
    serverDeleteSession(sessionId);
    if (sessionId === activeSessionId) {
      const newId = agent.resetChat();
      setActiveSessionId(newId);
    }
  }, [activeSessionId, agent]);

  // Rename session — local + server
  const renameSession = useCallback((sessionId, title) => {
    setSessions(prev => {
      const newList = prev.map(s => s.id === sessionId ? { ...s, title } : s);
      setSessionList(newList);
      return newList;
    });
    serverUpsertSession(sessionId, { title });
  }, []);

  const pinSession = useCallback((sessionId) => {
    setSessions(prev => {
      const newList = prev.map(s => s.id === sessionId ? { ...s, pinned: !s.pinned } : s);
      setSessionList(newList);
      const target = newList.find(s => s.id === sessionId);
      if (target) serverUpsertSession(sessionId, { pinned: target.pinned });
      return newList;
    });
  }, []);

  // ── Folder management ────────────────────────────────────────────────────
  const createFolder = useCallback((name) => {
    const folder = { id: `folder_${Date.now()}`, name, order: folders.length };
    setFoldersState(prev => {
      const newFolders = [...prev, folder];
      setFoldersStorage(newFolders);
      return newFolders;
    });
    return folder;
  }, [folders.length]);

  const deleteFolder = useCallback((folderId) => {
    setFoldersState(prev => {
      const newFolders = prev.filter(f => f.id !== folderId);
      setFoldersStorage(newFolders);
      return newFolders;
    });
    setSavedItemsState(prev => {
      const newItems = prev.filter(i => i.folderId !== folderId);
      setSavedItems(newItems);
      return newItems;
    });
  }, []);

  const renameFolder = useCallback((folderId, name) => {
    setFoldersState(prev => {
      const newFolders = prev.map(f => f.id === folderId ? { ...f, name } : f);
      setFoldersStorage(newFolders);
      return newFolders;
    });
  }, []);

  const reorderFolders = useCallback((newOrder) => {
    setFoldersState(prev => {
      const newFolders = newOrder.map((id, i) => {
        const folder = prev.find(f => f.id === id);
        return folder ? { ...folder, order: i } : null;
      }).filter(Boolean);
      setFoldersStorage(newFolders);
      return newFolders;
    });
  }, []);

  // Save item to a folder
  const saveItem = useCallback((messageId, folderId, title) => {
    const msg = agent.messages.find(m => m.id === messageId);
    if (!msg) return;
    const item = {
      id: `saved_${Date.now()}`,
      type: folderId === 'reports' ? 'report' : folderId === 'strategies' ? 'strategy' : 'item',
      folderId: folderId || 'reports',
      title: title || msg.text?.split('\n')[0]?.replace(/^[#*\s]+/, '')?.slice(0, 60) || 'Untitled',
      sourceSessionId: activeSessionId,
      sourceMessageId: messageId,
      content: msg.text,
      createdAt: Date.now(),
    };
    setSavedItemsState(prev => {
      const newItems = [item, ...prev];
      setSavedItems(newItems);
      return newItems;
    });
    // Show toast notification
    const folderName = folders.find(f => f.id === folderId)?.name || folderId;
    setSaveNotification(`Saved to ${folderName}`);
    setTimeout(() => setSaveNotification(null), 3000);
    return item;
  }, [agent.messages, activeSessionId, folders]);

  // Delete saved item
  const deleteSavedItem = useCallback((itemId) => {
    setSavedItemsState(prev => {
      const newItems = prev.filter(i => i.id !== itemId);
      setSavedItems(newItems);
      return newItems;
    });
  }, []);

  // Send message (wraps agent.sendMessage and ensures session is tracked)
  const sendMessage = useCallback((text, attachments, opts) => {
    agent.sendMessage(text, attachments, opts);

    // If this is a brand new session (no messages yet), add it to sessions list
    if (!sessions.find(s => s.id === activeSessionId)) {
      const title = text.slice(0, 50);
      const newSession = {
        id: activeSessionId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1,
      };
      setSessions(prev => {
        const newList = [newSession, ...prev].slice(0, MAX_SESSIONS);
        setSessionList(newList);
        return newList;
      });
      // Seed server row early so the session exists before first auto-save
      serverUpsertSession(activeSessionId, { title, ad_account_id: adAccountId, message_count: 1 });
    }
  }, [agent, sessions, activeSessionId, adAccountId]);

  return {
    // Session management
    sessions,
    activeSessionId,
    createNewChat,
    switchSession,
    deleteSession,
    renameSession,
    pinSession,
    // Chat (from agent)
    messages: agent.messages,
    isTyping: agent.isTyping,
    thinkingText: agent.thinkingText,
    creationStep: agent.creationStep,
    creationSummary: agent.creationSummary,
    activityLog: agent.activityLog,
    sendMessage,
    stopGeneration: agent.stopGeneration,
    startCreation: agent.startCreation,
    notification: saveNotification || agent.notification,
    // Saved items
    savedItems,
    saveItem,
    deleteSavedItem,
    // Folders
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    reorderFolders,
  };
};
