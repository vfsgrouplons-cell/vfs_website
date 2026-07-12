import { env } from '../config/env.js';

const endpoint = () => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;

export const geminiProvider = {
  name: 'gemini',
  async respond({ message, history = [], knowledge = '' }) {
    if (!env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
    const contents = history.slice(-10).map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] }));
    contents.push({ role: 'user', parts: [{ text: message }] });
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `You are the VFS Groups website assistant. Use only the approved service information below. Explain services, common documents, application steps, and general eligibility considerations. Never promise approval, rates, returns, claims, or disbursement. Never provide personalized financial advice. Never invent lender policies or expose private data. Encourage users to use the official application or contact flow when appropriate. Keep answers concise and include a disclaimer when discussing eligibility.\n\nAPPROVED KNOWLEDGE:\n${knowledge}` }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}: ${result.error?.message || 'Unknown provider error'}`);
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n').trim();
    if (!text) throw new Error('Gemini returned no text response.');
    return { provider: 'gemini', model: env.GEMINI_MODEL, message: text };
  },
};
