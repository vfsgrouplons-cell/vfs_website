import { Bot, Send, X } from 'lucide-react';
import { useState } from 'react';
import { api, apiMessage } from '../services/api.js';

const welcome = { role: 'assistant', content: 'Hello! I can explain VFS Groups services, common documents, and application steps. I cannot promise approval or provide personalized financial advice.' };

export function ChatWidget() {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState([welcome]); const [input, setInput] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); const message = input.trim(); if (!message || sending) return;
    const next = [...messages, { role: 'user', content: message }]; setMessages(next); setInput(''); setSending(true); setError('');
    try { const result = await api.post('/chat/messages', { message, history: messages.slice(-10) }); setMessages((current) => [...current, { role: 'assistant', content: result.data.data.message }]); }
    catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSending(false); }
  }
  return <div className="chat-widget">
    {open && <section className="chat-panel" aria-label="VFS Groups AI assistant"><header><div><Bot/><span><strong>VFS Assistant</strong><small>Powered securely through our backend</small></span></div><button type="button" onClick={() => setOpen(false)} aria-label="Close assistant"><X/></button></header><div className="chat-messages" aria-live="polite">{messages.map((message,index)=><div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}{sending&&<div className="chat-message assistant">Thinking…</div>}{error&&<p className="form-error" role="alert">{error}</p>}</div><form onSubmit={submit}><label className="sr-only" htmlFor="chat-input">Ask the VFS assistant</label><input id="chat-input" value={input} onChange={(event)=>setInput(event.target.value)} maxLength="1000" placeholder="Ask about a service…"/><button type="submit" disabled={sending||!input.trim()} aria-label="Send message"><Send/></button></form><p>Eligibility and approval always depend on the relevant provider.</p></section>}
    <button className="chat-fab" type="button" onClick={() => setOpen((value)=>!value)} aria-expanded={open} aria-label="Open VFS AI assistant"><Bot/></button>
  </div>;
}
