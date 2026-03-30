import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatAgent, getWelcomeMessage, makeId } from './useChatAgent.js';

const MAX_SESSIONS = 50;

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
  localStorage.setItem(`aam_chat_${sessionId}`, JSON.stringify(messages));
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
  return groups;
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useChatSessions = ({ token, adAccountId, accountName, language = 'en' }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [savedItems, setSavedItemsState] = useState([]);
  const [folders, setFoldersState] = useState([...DEFAULT_FOLDERS]);
  const [saveNotification, setSaveNotification] = useState(null);
  const prevTypingRef = useRef(false);

  // Load initial session from last session or create new
  const [initialMessages, setInitialMessages] = useState(null);
  const [initialSessionId, setInitialSessionId] = useState(null);

  // Initialize on mount — always start with a fresh new chat
  useEffect(() => {
    const list = getSessionList();
    setSessions(list);
    setSavedItemsState(getSavedItems());
    setFoldersState(getFolders());

    // Always start fresh — user can click old sessions in sidebar to resume
    {
      const newId = makeId();
      setInitialMessages(null);
      setInitialSessionId(newId);
      setActiveSessionId(newId);
    }
  }, []); // run once on mount

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
          };
          const filtered = prev.filter(s => s.id !== activeSessionId);
          const newList = [updated, ...filtered].slice(0, MAX_SESSIONS);
          setSessionList(newList);
          return newList;
        });
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
      agent.loadSession(sessionId, [getWelcomeMessage(accountName, language)]);
    }
    setActiveSessionId(sessionId);
  }, [activeSessionId, persistCurrent, agent, accountName]);

  // Delete session
  const deleteSession = useCallback((sessionId) => {
    removeSessionMessages(sessionId);
    setSessions(prev => {
      const newList = prev.filter(s => s.id !== sessionId);
      setSessionList(newList);
      return newList;
    });
    if (sessionId === activeSessionId) {
      const newId = agent.resetChat();
      setActiveSessionId(newId);
    }
  }, [activeSessionId, agent]);

  // Rename session
  const renameSession = useCallback((sessionId, title) => {
    setSessions(prev => {
      const newList = prev.map(s => s.id === sessionId ? { ...s, title } : s);
      setSessionList(newList);
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
      const newSession = {
        id: activeSessionId,
        title: text.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1,
      };
      setSessions(prev => {
        const newList = [newSession, ...prev].slice(0, MAX_SESSIONS);
        setSessionList(newList);
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
    creationStep: agent.creationStep,
    creationSummary: agent.creationSummary,
    activityLog: agent.activityLog,
    sendMessage,
    stopGeneration: agent.stopGeneration,
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
