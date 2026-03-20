import { useState, useCallback, useRef } from 'react';

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'agent',
  text: "Hi! I'm your **AI Ad Consultant**. I can audit your campaigns, spot optimization opportunities, manage budgets, build audiences, and help you scale what's working.\n\nSelect a **business portfolio** and **ad account** from the sidebar to get started.",
  timestamp: Date.now(),
};

export const useChatAgent = ({ token, adAccountId }) => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [notification, setNotification] = useState(null);
  const sessionIdRef = useRef(makeId());
  const abortRef = useRef(null);

  const resetChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
    setIsTyping(false);
    setThinkingText('');
    sessionIdRef.current = makeId();
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;

    const now = Date.now();
    const userMsg = { id: makeId(), role: 'user', text, timestamp: now };
    const agentMsgId = makeId();

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setThinkingText('Thinking...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          adAccountId,
          token,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Parse SSE stream
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
  }, [token, adAccountId, isTyping]);

  return { messages, isTyping, thinkingText, sendMessage, resetChat, notification };
};
