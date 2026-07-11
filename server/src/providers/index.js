import { randomUUID } from 'node:crypto';
import { storageProvider } from './storage.js';

const mockDelivery = (channel) => ({
  async send(payload) {
    console.info(JSON.stringify({ level: 'info', provider: `mock-${channel}`, event: 'delivery_accepted', template: payload.template, recipient: payload.recipient ? 'redacted' : undefined }));
    return { provider: `mock-${channel}`, externalId: `mock_${randomUUID()}`, accepted: true, delivered: false };
  },
});

export const providers = {
  storage: storageProvider,
  email: mockDelivery('email'), sms: mockDelivery('sms'), whatsapp: mockDelivery('whatsapp'),
  payment: { async createIntent({ amount, currency = 'INR' }) { return { provider: 'mock-payment', externalId: `mock_${randomUUID()}`, amount, currency, status: 'requires_offline_confirmation' }; } },
  ai: { async respond() { return { provider: 'mock-ai', message: 'The AI provider is not configured. Please use the service guide or contact support.' }; } },
};
