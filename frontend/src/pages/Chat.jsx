import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiSend } from 'react-icons/fi';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const suggestions = [
    'I want to send money to UK',
    "What are today's exchange rates?",
    'Help me set up a transfer',
    'What currencies do you support?'
  ];

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async () => {
    try {
      const res = await api().get('/api/chat/history');
      const d = res.data;
      const history = Array.isArray(d) ? d : (d.data || d.messages || d.chats || []);
      const mapped = [];
      history.forEach(msg => {
        if (msg.userMessage || msg.message) {
          mapped.push({ role: 'user', content: msg.userMessage || msg.message, timestamp: msg.created_at });
        }
        if (msg.aiResponse || msg.response || msg.reply) {
          mapped.push({ role: 'ai', content: msg.aiResponse || msg.response || msg.reply, timestamp: msg.created_at });
        }
        if (msg.role) {
          mapped.push({ role: msg.role === 'user' ? 'user' : 'ai', content: msg.content || msg.message, timestamp: msg.created_at });
        }
      });
      if (mapped.length > 0) {
        setMessages(mapped);
      }
    } catch (err) {
      // Chat history may not be available
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = { role: 'user', content: msgText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api().post('/api/chat', { message: msgText });
      const d = res.data;
      const aiContent = d.response || d.reply || d.aiResponse || d.message || d.data?.response || JSON.stringify(d);
      const aiMsg = { role: 'ai', content: aiContent, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get AI response';
      toast.error(errMsg);
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatAIMessage = (content) => {
    if (!content) return <p>No response</p>;

    // If it's a JSON string, try to parse and format it
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object') {
          return formatObject(parsed);
        }
      } catch {
        // Not JSON, format as text
      }
    }

    if (typeof content === 'object') {
      return formatObject(content);
    }

    // Format text content
    const text = String(content);

    // Check for exchange rate patterns
    const rateMatch = text.match(/(\d+\.?\d*)\s*([A-Z]{3})\s*=\s*(\d+\.?\d*)\s*([A-Z]{3})/);
    if (rateMatch) {
      return (
        <div>
          <div className="rate-card">
            <div className="rate-label">{rateMatch[2]} to {rateMatch[4]}</div>
            <div className="rate-value">{rateMatch[1]} {rateMatch[2]} = {rateMatch[3]} {rateMatch[4]}</div>
          </div>
          {text.replace(rateMatch[0], '').trim() && formatTextContent(text.replace(rateMatch[0], '').trim())}
        </div>
      );
    }

    // Check for step-like content
    if (text.match(/(?:step\s*\d|^\d+[\.\)]\s)/im)) {
      const lines = text.split(/\n/);
      const steps = [];
      let intro = [];
      let inSteps = false;
      lines.forEach(line => {
        if (line.match(/(?:step\s*\d|^\d+[\.\)]\s)/i)) {
          inSteps = true;
          steps.push(line.replace(/^(?:step\s*\d+[\.:]\s*|\d+[\.\)]\s*)/i, '').trim());
        } else if (!inSteps) {
          intro.push(line);
        } else {
          steps[steps.length - 1] = (steps[steps.length - 1] || '') + ' ' + line.trim();
        }
      });
      return (
        <div>
          {intro.length > 0 && intro.map((p, i) => <p key={i}>{p}</p>)}
          {steps.length > 0 && (
            <ol className="step-list">
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </div>
      );
    }

    return formatTextContent(text);
  };

  const formatTextContent = (text) => {
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    if (paragraphs.length <= 1) {
      const lines = text.split(/\n/).filter(Boolean);
      if (lines.length <= 1) return <p>{text}</p>;
      // Check if lines look like a list
      const isList = lines.every(l => l.match(/^[-*]\s/) || l.match(/^\d+[\.\)]/));
      if (isList) {
        return (
          <ul>
            {lines.map((l, i) => <li key={i}>{l.replace(/^[-*]\s*/, '').replace(/^\d+[\.\)]\s*/, '')}</li>)}
          </ul>
        );
      }
      return lines.map((l, i) => <p key={i}>{l}</p>);
    }
    return paragraphs.map((p, i) => <p key={i}>{p}</p>);
  };

  const formatObject = (obj) => {
    if (obj.rate || obj.exchangeRate) {
      return (
        <div>
          <div className="rate-card">
            <div className="rate-label">{obj.from || obj.sourceCurrency || ''} to {obj.to || obj.targetCurrency || ''}</div>
            <div className="rate-value">{obj.rate || obj.exchangeRate}</div>
          </div>
          {obj.message && <p>{obj.message}</p>}
        </div>
      );
    }
    if (obj.message) return <p>{obj.message}</p>;
    if (obj.text) return <p>{obj.text}</p>;
    // Generic object display
    return (
      <div>
        {Object.entries(obj).map(([k, v]) => (
          <p key={k}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
        ))}
      </div>
    );
  };

  if (historyLoading) return <div className="loading"><div className="loading-spinner"></div>Loading chat...</div>;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>AI Chat Assistant</h1>
          <p className="subtitle">Get help with transfers, rates, and more</p>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>AI</div>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Welcome to AI Chat</h3>
              <p>Ask me anything about money transfers, exchange rates, or account management.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>
              <div>
                <div className="chat-bubble">
                  {msg.role === 'ai' ? formatAIMessage(msg.content) : <p>{msg.content}</p>}
                </div>
                {msg.timestamp && (
                  <div className="chat-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message ai">
              <div className="chat-avatar">AI</div>
              <div className="chat-bubble">
                <div className="chat-loading">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="chat-suggestion" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="chat-input-area">
          <textarea
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <FiSend /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
