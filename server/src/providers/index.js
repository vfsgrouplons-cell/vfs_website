import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { geminiProvider } from './gemini.js';
import { storageProvider } from './storage.js';

const mockEmail = {
  async send(payload) {
    console.info(JSON.stringify({ level: 'info', provider: 'mock-email', event: 'delivery_accepted', template: payload.template, recipient: payload.recipient ? 'redacted' : undefined }));
    return { provider: 'mock-email', externalId: `mock_${randomUUID()}`, accepted: true, delivered: false };
  },
};

const mockAi = { async respond() { return { provider: 'mock-ai', message: 'The AI assistant is not configured. Please use the service guides or contact VFS Groups.' }; } };

export const providers = {
  storage: storageProvider,
  email: mockEmail,
  ai: env.AI_PROVIDER === 'gemini' ? geminiProvider : mockAi,
};
