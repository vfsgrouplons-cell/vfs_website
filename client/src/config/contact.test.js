import { describe, expect, it } from 'vitest';
import { createWhatsAppUrl, officialWhatsApp } from './contact.js';

describe('official VFS contact details', () => {
  it('uses the confirmed India WhatsApp number', () => {
    expect(officialWhatsApp.number).toBe('919160353295');
    expect(createWhatsAppUrl('Need assistance')).toBe('https://wa.me/919160353295?text=Need%20assistance');
  });
});
