import { useState, useCallback, useRef, useEffect } from 'react';

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export const getWelcomeMessage = (accountName) => ({
  id: 'welcome',
  role: 'agent',
  text: accountName
    ? `Hi! I'm your **AI Ad Consultant**. I'm connected to **${accountName}** and ready to help.\n\nAsk me anything — audit campaigns, analyze performance, manage budgets, or find optimization opportunities.`
    : "Hi! I'm your **AI Ad Consultant**. Connect an ad account below to get started, or ask me a general question about Meta advertising.",
  timestamp: Date.now(),
});

export { makeId };

export const useChatAgent = ({ token, adAccountId, accountName, mode = 'Fast', language = 'en', initialMessages, externalSessionId }) => {
  const [messages, setMessages] = useState(initialMessages || [getWelcomeMessage(accountName)]);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [notification, setNotification] = useState(null);
  const sessionIdRef = useRef(externalSessionId || makeId());
  const abortRef = useRef(null);

  // Sync when external session ID changes (e.g. account switch triggers new session)
  useEffect(() => {
    if (externalSessionId && externalSessionId !== sessionIdRef.current) {
      if (abortRef.current) abortRef.current.abort();
      sessionIdRef.current = externalSessionId;
      setMessages(initialMessages || [getWelcomeMessage(accountName)]);
      setIsTyping(false);
      setThinkingText('');
    }
  }, [externalSessionId, initialMessages, accountName]);

  // Update welcome message when account changes (only if chat is empty)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [getWelcomeMessage(accountName)];
      }
      return prev;
    });
  }, [accountName]);

  // Allow external session switching
  const loadSession = useCallback((newSessionId, newMessages) => {
    if (abortRef.current) abortRef.current.abort();
    sessionIdRef.current = newSessionId;
    setMessages(newMessages || [getWelcomeMessage(accountName)]);
    setIsTyping(false);
    setThinkingText('');
  }, [accountName]);

  const resetChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const newId = makeId();
    sessionIdRef.current = newId;
    setMessages([getWelcomeMessage(accountName)]);
    setIsTyping(false);
    setThinkingText('');
    return newId;
  }, [accountName]);

  const sendMessage = useCallback(async (text, attachments) => {
    if (!text.trim() || isTyping) return;

    const now = Date.now();
    const userMsg = { id: makeId(), role: 'user', text, timestamp: now, ...(attachments?.length && { attachments }) };
    const agentMsgId = makeId();

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setThinkingText('Thinking...');

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
          message: text,
          sessionId: sessionIdRef.current,
          adAccountId,
          token,
          mode,
          language,
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
              setThinkingText(`Calling ${event.name.replace(/_/g, ' ')}...`);
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
          /should I proceed/i, /shall I go ahead/i, /do you want me to/i,
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
  }, [token, adAccountId, isTyping, mode, language]);

  return {
    messages,
    isTyping,
    thinkingText,
    sendMessage,
    resetChat,
    loadSession,
    notification,
    sessionId: sessionIdRef.current,
  };
};
