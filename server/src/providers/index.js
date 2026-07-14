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

const mockAi = {
  async respond({ message, knowledge = '' }) {
    const input = message.toLowerCase();
    if (/^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening))[!.\s]*$/.test(input)) return { provider: 'mock-ai', message: 'Hello! I can help you explore VFS Groups loans, insurance, investments, application steps, common documents, and tracking. What would you like help with?' };
    if (input.includes('cibil') || input.includes('itr')) return { provider: 'mock-ai', message: 'VFS Groups accepts assistance requests from salaried and self-employed customers with or without ITRs, including customers with a low or limited CIBIL score. The team reviews the information available, while final eligibility and terms are decided by the relevant lender.' };
    if (input.includes('track') || input.includes('status')) return { provider: 'mock-ai', message: 'Open “Track application,” enter your VFS application ID and registered mobile, then complete the verification step. After verification you can see the live status timeline and upload requested documents.' };
    if (input.includes('document') || input.includes('upload')) return { provider: 'mock-ai', message: 'Document requirements depend on the selected service. Common examples include identity, address, available income or business records, and bank statements. Sensitive files are uploaded only after application tracking verification.' };
    if (input.includes('apply') || input.includes('application')) return { provider: 'mock-ai', message: 'Choose a published service and open the application form. You can save a MongoDB-backed draft, finish the six steps, submit it, and use the issued application ID for secure tracking.' };
    const serviceBlock = knowledge.split('\n\n').find((block) => { const name = block.split(':')[0]?.toLowerCase(); return name && (input.includes(name) || name.split(' ').some((word) => word.length > 5 && input.includes(word))); });
    if (serviceBlock) return { provider: 'mock-ai', message: `${serviceBlock.split('\n').slice(0, 2).join('\n')}\nFinal eligibility, pricing, cover, risk, returns, and outcomes depend on the relevant provider.` };
    return { provider: 'mock-ai', message: 'VFS Groups provides assistance for personal, business, home, property, vehicle, education, share-backed and working-capital loans, plus insurance and investment services. Tell me the goal you are exploring, or use the Services page to compare options.' };
  },
};

const resilientGemini = {
  async respond(input) {
    try { return await geminiProvider.respond(input); }
    catch (error) {
      console.warn(JSON.stringify({ level: 'warn', provider: 'gemini', event: 'fallback_used', message: error.message }));
      const fallback = await mockAi.respond(input);
      return { ...fallback, provider: 'mock-ai-fallback' };
    }
  },
};

export const providers = {
  storage: storageProvider,
  email: mockEmail,
  ai: env.NODE_ENV !== 'test' && env.AI_PROVIDER === 'gemini' ? resilientGemini : mockAi,
};
