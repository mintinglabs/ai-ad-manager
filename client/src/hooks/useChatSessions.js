import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatAgent, getWelcomeMessage, makeId } from './useChatAgent.js';

const MAX_SESSIONS = 50;

// ── localStorage helpers ─────────────────────────────────────────────────────
const getSessionList = (adAccountId) => {
  try { return JSON.parse(localStorage.getItem(`aam_chats_${adAccountId}`)) || []; }
  catch { return []; }
};
const setSessionList = (adAccountId, list) => {
  localStorage.setItem(`aam_chats_${adAccountId}`, JSON.stringify(list.slice(0, MAX_SESSIONS)));
};
const getSessionMessages = (sessionId) => {
  try { return JSON.parse(localStorage.getItem(`aam_chat_${sessionId}`)) || null; }
  catch { return null; }
};
const setSessionMessages = (sessionId, messages) => {
  localStorage.setItem(`aam_chat_${sessionId}`, JSON.stringify(messages));
};
const removeSessionMessages = (sessionId) => {
  localStorage.removeItem(`aam_chat_${sessionId}`);
};
const getSavedItems = (adAccountId) => {
  try { return JSON.parse(localStorage.getItem(`aam_saved_${adAccountId}`)) || []; }
  catch { return []; }
};
const setSavedItems = (adAccountId, items) => {
  localStorage.setItem(`aam_saved_${adAccountId}`, JSON.stringify(items));
};

// ── Folder helpers ──────────────────────────────────────────────────────────
const DEFAULT_FOLDERS = [
  { id: 'reports', name: 'Reports', order: 0 },
  { id: 'strategies', name: 'Strategies', order: 1 },
];
const getFolders = (adAccountId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(`aam_folders_${adAccountId}`));
    if (!saved) return [...DEFAULT_FOLDERS];
    // Always ensure default folders (Reports, Strategies) are present
    const result = [...saved];
    for (const def of DEFAULT_FOLDERS) {
      if (!result.find(f => f.id === def.id)) result.unshift(def);
    }
    return result;
  } catch { return [...DEFAULT_FOLDERS]; }
};
const setFoldersStorage = (adAccountId, folders) => {
  localStorage.setItem(`aam_folders_${adAccountId}`, JSON.stringify(folders));
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
  return groups;
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useChatSessions = ({ token, adAccountId, accountName, language = 'en' }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [savedItems, setSavedItemsState] = useState([]);
  const [folders, setFoldersState] = useState([]);
  const prevTypingRef = useRef(false);

  // Load initial session from last session or create new
  const [initialMessages, setInitialMessages] = useState(null);
  const [initialSessionId, setInitialSessionId] = useState(null);

  // Initialize sessions on account change
  useEffect(() => {
    if (!adAccountId) return;
    const list = getSessionList(adAccountId);
    setSessions(list);
    setSavedItemsState(getSavedItems(adAccountId));
    setFoldersState(getFolders(adAccountId));

    if (list.length > 0) {
      // Load the most recent session
      const latest = list[0];
      const msgs = getSessionMessages(latest.id);
      if (msgs?.length) {
        setInitialMessages(msgs);
        setInitialSessionId(latest.id);
        setActiveSessionId(latest.id);
      } else {
        // Session data is missing, create new
        const newId = makeId();
        setInitialMessages(null);
        setInitialSessionId(newId);
        setActiveSessionId(newId);
      }
    } else {
      // No sessions, start fresh
      const newId = makeId();
      setInitialMessages(null);
      setInitialSessionId(newId);
      setActiveSessionId(newId);
    }
  }, [adAccountId]);

  const agent = useChatAgent({
    token,
    adAccountId,
    accountName,
    language,
    initialMessages,
    externalSessionId: initialSessionId,
  });

  // Auto-save messages when agent finishes typing
  useEffect(() => {
    if (prevTypingRef.current && !agent.isTyping && activeSessionId && adAccountId) {
      // Agent just finished a response — save
      const msgs = agent.messages;
      if (msgs.length > 1) { // More than just welcome
        setSessionMessages(activeSessionId, msgs);

        // Update session list
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
          };
          const filtered = prev.filter(s => s.id !== activeSessionId);
          const newList = [updated, ...filtered].slice(0, MAX_SESSIONS);
          setSessionList(adAccountId, newList);
          return newList;
        });
      }
    }
    prevTypingRef.current = agent.isTyping;
  }, [agent.isTyping, agent.messages, activeSessionId, adAccountId]);

  // Persist current session before switching
  const persistCurrent = useCallback(() => {
    if (!activeSessionId || !adAccountId) return;
    const msgs = agent.messages;
    if (msgs.length > 1) {
      setSessionMessages(activeSessionId, msgs);
    }
  }, [activeSessionId, adAccountId, agent.messages]);

  // Create new chat
  const createNewChat = useCallback(() => {
    persistCurrent();
    const newId = agent.resetChat();
    setActiveSessionId(newId);
  }, [persistCurrent, agent]);

  // Switch to existing session
  const switchSession = useCallback((sessionId) => {
    if (sessionId === activeSessionId) return;
    persistCurrent();
    const msgs = getSessionMessages(sessionId);
    if (msgs?.length) {
      agent.loadSession(sessionId, msgs);
    } else {
      agent.loadSession(sessionId, [getWelcomeMessage(accountName)]);
    }
    setActiveSessionId(sessionId);
  }, [activeSessionId, persistCurrent, agent, accountName]);

  // Delete session
  const deleteSession = useCallback((sessionId) => {
    removeSessionMessages(sessionId);
    setSessions(prev => {
      const newList = prev.filter(s => s.id !== sessionId);
      setSessionList(adAccountId, newList);
      return newList;
    });
    // If deleting active session, create new
    if (sessionId === activeSessionId) {
      const newId = agent.resetChat();
      setActiveSessionId(newId);
    }
  }, [activeSessionId, adAccountId, agent]);

  // Rename session
  const renameSession = useCallback((sessionId, title) => {
    setSessions(prev => {
      const newList = prev.map(s => s.id === sessionId ? { ...s, title } : s);
      setSessionList(adAccountId, newList);
      return newList;
    });
  }, [adAccountId]);

  // ── Folder management ────────────────────────────────────────────────────
  const createFolder = useCallback((name) => {
    const folder = { id: `folder_${Date.now()}`, name, order: folders.length };
    setFoldersState(prev => {
      const newFolders = [...prev, folder];
      setFoldersStorage(adAccountId, newFolders);
      return newFolders;
    });
    return folder;
  }, [adAccountId, folders.length]);

  const deleteFolder = useCallback((folderId) => {
    setFoldersState(prev => {
      const newFolders = prev.filter(f => f.id !== folderId);
      setFoldersStorage(adAccountId, newFolders);
      return newFolders;
    });
    setSavedItemsState(prev => {
      const newItems = prev.filter(i => i.folderId !== folderId);
      setSavedItems(adAccountId, newItems);
      return newItems;
    });
  }, [adAccountId]);

  const renameFolder = useCallback((folderId, name) => {
    setFoldersState(prev => {
      const newFolders = prev.map(f => f.id === folderId ? { ...f, name } : f);
      setFoldersStorage(adAccountId, newFolders);
      return newFolders;
    });
  }, [adAccountId]);

  const reorderFolders = useCallback((newOrder) => {
    setFoldersState(prev => {
      const newFolders = newOrder.map((id, i) => {
        const folder = prev.find(f => f.id === id);
        return folder ? { ...folder, order: i } : null;
      }).filter(Boolean);
      setFoldersStorage(adAccountId, newFolders);
      return newFolders;
    });
  }, [adAccountId]);

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
      setSavedItems(adAccountId, newItems);
      return newItems;
    });
    return item;
  }, [agent.messages, activeSessionId, adAccountId]);

  // Delete saved item
  const deleteSavedItem = useCallback((itemId) => {
    setSavedItemsState(prev => {
      const newItems = prev.filter(i => i.id !== itemId);
      setSavedItems(adAccountId, newItems);
      return newItems;
    });
  }, [adAccountId]);

  // Send message (wraps agent.sendMessage and ensures session is tracked)
  const sendMessage = useCallback((text, attachments) => {
    agent.sendMessage(text, attachments);

    // If this is a brand new session (no messages yet), add it to sessions list
    if (!sessions.find(s => s.id === activeSessionId)) {
      const newSession = {
        id: activeSessionId,
        title: text.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1,
      };
      setSessions(prev => {
        const newList = [newSession, ...prev].slice(0, MAX_SESSIONS);
        setSessionList(adAccountId, newList);
        return newList;
      });
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
    // Chat (from agent)
    messages: agent.messages,
    isTyping: agent.isTyping,
    thinkingText: agent.thinkingText,
    sendMessage,
    stopGeneration: agent.stopGeneration,
    notification: agent.notification,
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
