import { useState, useCallback, useRef, useEffect } from 'react';

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export const getWelcomeMessage = (accountName, language = 'en') => {
  if (language === 'yue') {
    return {
      id: 'welcome',
      role: 'agent',
      text: accountName
        ? `你好！我係你嘅 **AI 廣告顧問**，已經連接咗 **${accountName}**。揀下面嘅選項開始，或者直接打你想做嘅嘢。`
        : '你好！我係你嘅 **AI 廣告顧問**。喺下面連接廣告帳戶就可以開始。',
      timestamp: Date.now(),
    };
  }
  return {
    id: 'welcome',
    role: 'agent',
    text: accountName
      ? `Hi! I'm your **AI Ad Consultant**, connected to **${accountName}**. Pick an option below or type what you'd like to do.`
      : "Hi! I'm your **AI Ad Consultant**. Connect an ad account below to get started.",
    timestamp: Date.now(),
  };
};

export { makeId };

export const useChatAgent = ({ token, adAccountId, accountName, language = 'en', initialMessages, externalSessionId }) => {
  const [messages, setMessages] = useState(initialMessages || [getWelcomeMessage(accountName, language)]);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [notification, setNotification] = useState(null);
  const [creationStep, setCreationStep] = useState(null);
  const [creationSummary, setCreationSummary] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const sessionIdRef = useRef(externalSessionId || makeId());
  const abortRef = useRef(null);

  // Sync when external session ID changes (e.g. account switch triggers new session)
  useEffect(() => {
    if (externalSessionId && externalSessionId !== sessionIdRef.current) {
      if (abortRef.current) abortRef.current.abort();
      sessionIdRef.current = externalSessionId;
      setMessages(initialMessages || [getWelcomeMessage(accountName, language)]);
      setIsTyping(false);
      setThinkingText('');
      setCreationStep(null);
      setCreationSummary({});
      setActivityLog([]);
    }
  }, [externalSessionId, initialMessages, accountName, language]);

  // Update welcome message when account or language changes (only if chat is empty)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [getWelcomeMessage(accountName, language)];
      }
      return prev;
    });
  }, [accountName, language]);

  // Allow external session switching
  const loadSession = useCallback((newSessionId, newMessages) => {
    if (abortRef.current) abortRef.current.abort();
    sessionIdRef.current = newSessionId;
    setMessages(newMessages || [getWelcomeMessage(accountName, language)]);
    setIsTyping(false);
    setThinkingText('');
    setCreationStep(null);
    setCreationSummary({});
    setActivityLog([]);
  }, [accountName, language]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsTyping(false);
    setThinkingText('');
    setCreationStep(null);
    setCreationSummary({});
    setActivityLog([]);
  }, []);

  const resetChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const newId = makeId();
    sessionIdRef.current = newId;
    setMessages([getWelcomeMessage(accountName, language)]);
    setIsTyping(false);
    setThinkingText('');
    setCreationStep(null);
    setCreationSummary({});
    setActivityLog([]);
    return newId;
  }, [accountName, language]);

  const sendMessage = useCallback(async (text, attachments, { displayText, activeCustomSkill } = {}) => {
    if (!text.trim() || isTyping) return;

    const now = Date.now();
    // Show only the user's actual message in chat, not the skill context
    const userMsg = { id: makeId(), role: 'user', text: displayText || text, timestamp: now, ...(attachments?.length && { attachments }) };
    const agentMsgId = makeId();

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setThinkingText('Thinking...');
    setActivityLog([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const bearerToken = token || localStorage.getItem('fb_long_lived_token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
        },
        body: JSON.stringify({
          message: text,  // Full text with skill context goes to the API
          sessionId: sessionIdRef.current,
          adAccountId,
          token,
          language,
          ...(activeCustomSkill && { activeCustomSkill }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let addedAgent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'text') {
              fullText += event.content;
              const msg = { id: agentMsgId, role: 'agent', text: fullText, timestamp: Date.now() };
              if (!addedAgent) {
                setMessages((prev) => [...prev, msg]);
                addedAgent = true;
                setThinkingText('');
              } else {
                setMessages((prev) =>
                  prev.map((m) => m.id === agentMsgId ? msg : m)
                );
              }
            } else if (event.type === 'tool_call') {
              const entry = { id: `${event.name}-${Date.now()}`, name: event.name, label: event.label || event.name.replace(/_/g, ' '), done: false };
              setActivityLog(prev => [...prev, entry]);
              if (event.name === 'transfer_to_agent') {
                const labels = {
                  analyst: 'Analyzing performance...',
                  audience_strategist: 'Reviewing audiences...',
                  creative_strategist: 'Auditing creatives...',
                  executor: 'Setting up...',
                  technical_guard: 'Checking tracking...',
                  ad_manager: 'Finishing up...',
                };
                setThinkingText(labels[event.target] || 'Continuing...');
              } else {
                setThinkingText(event.label || `Calling ${event.name.replace(/_/g, ' ')}...`);
              }
            } else if (event.type === 'tool_result') {
              setActivityLog(prev => {
                const updated = [...prev];
                const idx = updated.map(e => e.name).lastIndexOf(event.name);
                if (idx !== -1) updated[idx] = { ...updated[idx], done: true, summary: event.summary };
                return updated;
              });
              // If tool_result carries a mediagrid payload, inject it into the agent message
              if (event.mediagrid) {
                const mediagridBlock = '\n\n```mediagrid\n' + JSON.stringify(event.mediagrid) + '\n```\n\n';
                fullText += mediagridBlock;
                const msg = { id: agentMsgId, role: 'agent', text: fullText, timestamp: Date.now() };
                if (!addedAgent) {
                  setMessages((prev) => [...prev, msg]);
                  addedAgent = true;
                  setThinkingText('');
                } else {
                  setMessages((prev) => prev.map((m) => m.id === agentMsgId ? msg : m));
                }
              }
            } else if (event.type === 'context') {
              const d = event.data || {};
              if (d.ad_id && d.activation_status === 'ACTIVE') {
                setCreationStep(null);
                setCreationSummary({});
              } else if (d.clear_task) {
                setCreationStep(null);
                setCreationSummary({});
              } else if (d.creative_id) {
                setCreationStep({ current: 3, total: 3, label: 'Review & Launch' });
                setCreationSummary(prev => ({ ...prev, phase2: { creative_id: d.creative_id, ad_format: d.ad_format, creative_ids: d.creative_ids } }));
              } else if (d.adset_id) {
                setCreationStep({ current: 2, total: 3, label: 'Creative' });
                setCreationSummary(prev => ({ ...prev, phase1: { campaign_id: d.campaign_id, adset_id: d.adset_id, campaign_objective: d.campaign_objective, optimization_goal: d.optimization_goal, page_id: d.page_id } }));
              } else if (d.campaign_id) {
                setCreationStep({ current: 1, total: 3, label: 'Campaign & Targeting' });
              }
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              console.warn('SSE parse error:', parseErr);
            }
          }
        }
      }

      if (!fullText) {
        setMessages((prev) => [
          ...prev,
          { id: agentMsgId, role: 'agent', text: "I couldn't generate a response. Please try again.", timestamp: Date.now() },
        ]);
      } else {
        const tail = fullText.slice(-500);
        const confirmPatterns = [
          /should I (proceed|create)/i, /shall I go ahead/i, /do you want me to/i,
          /would you like me to/i, /confirm.*\?/i, /ready to (apply|execute|proceed|make)/i,
          /want me to (pause|activate|delete|update|change|create|remove|upload|send)/i,
          /proceed with (creating|updating|deleting|pausing|activating)/i,
          /go ahead (and|with)/i, /approve this/i, /confirm (this|the|these)/i,
          /like to (proceed|continue|go ahead|confirm)/i,
          /\*\*"?Should I proceed\??"?\*\*/i,
        ];
        if (confirmPatterns.some(p => p.test(tail))) {
          const actions = [
            { label: 'Confirm', value: 'Yes, proceed with the changes', variant: 'confirm' },
            { label: 'Cancel',  value: 'No, cancel — do not make any changes', variant: 'danger' },
          ];
          setMessages((prev) => prev.map((m) =>
            m.id === agentMsgId ? { ...m, actions } : m
          ));
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: 'agent', text: `Sorry, something went wrong: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setIsTyping(false);
      setThinkingText('');
      abortRef.current = null;
    }
  }, [token, adAccountId, isTyping, language]);

  // Allow frontend to trigger the wizard immediately (before any API call)
  const startCreation = useCallback(() => {
    setCreationStep({ current: 1, total: 3, label: 'Campaign & Targeting' });
    setCreationSummary({});
  }, []);

  return {
    messages,
    isTyping,
    thinkingText,
    creationStep,
    creationSummary,
    activityLog,
    sendMessage,
    stopGeneration,
    resetChat,
    loadSession,
    notification,
    startCreation,
    sessionId: sessionIdRef.current,
  };
};
