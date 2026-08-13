'use client';

import { useEffect, useState } from 'react';

type Message = {
  id: string;
  sender: 'customer' | 'ai' | 'human';
  content: string;
  classification?: string | null;
  confidence?: number | null;
  created_at: string;
};

type Conversation = {
  id: string;
  status: 'open' | 'escalated' | 'resolved';
  messages: Message[];
};

export default function Home() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('support_conversation_id');
    if (saved) {
      setConversationId(saved);
      loadConversation(saved);
    }
  }, []);

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/support?conversationId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return;
      setConversation(await res.json());
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          message,
          conversationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setConversationId(data.conversation.id);
      window.localStorage.setItem('support_conversation_id', data.conversation.id);
      setConversation(data.conversation);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    window.localStorage.removeItem('support_conversation_id');
    setConversationId(null);
    setConversation(null);
    setMessage('');
    setError('');
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="header">
          <div>
            <span className="eyebrow">SAAS SUPPORT</span>
            <h1>Support AI Assistant</h1>
            <p>Ask a question and our AI will help or hand it to a human when needed.</p>
          </div>
          <button className="secondary" onClick={newConversation}>New conversation</button>
        </header>

        <div className="card">
          {conversation && (
            <div className="conversation">
              <div className="statusbar">
                <span>Conversation {conversation.id.slice(0, 8)}…</span>
                <span className={`status ${conversation.status}`}>{conversation.status}</span>
              </div>

              {conversation.messages.map((m) => (
                <div key={m.id} className={`bubble-row ${m.sender}`}>
                  <div className={`bubble ${m.sender}`}>
                    <div className="role">
                      {m.sender === 'customer' ? 'You' : m.sender === 'ai' ? 'AI Support' : 'Human Support'}
                    </div>
                    <div>{m.content}</div>
                    {m.classification && <small>Classification: {m.classification}</small>}
                  </div>
                </div>
              ))}

              {conversation.status === 'escalated' && (
                <div className="handoff">
                  <strong>Human handoff created.</strong>
                  <span>A support specialist should review this conversation.</span>
                </div>
              )}
            </div>
          )}

          {!conversation && (
            <div className="empty">
              <div className="bot">AI</div>
              <h2>How can we help?</h2>
              <p>Try a login problem, billing question, or general product question.</p>
            </div>
          )}

          <form onSubmit={sendMessage} className="form">
            <label>
              Email <span>(optional)</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
            </label>
            <label>
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" rows={4} required />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="primary" disabled={loading}>{loading ? 'Thinking…' : 'Send message'}</button>
          </form>
        </div>

        <footer>AI can make mistakes. Sensitive or uncertain issues are routed to a human.</footer>
      </section>
    </main>
  );
}
