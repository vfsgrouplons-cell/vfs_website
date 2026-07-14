export const officialWhatsApp = {
  display: '+91 86395 47157',
  number: '918639547157',
};

export function createWhatsAppUrl(message) {
  return `https://wa.me/${officialWhatsApp.number}?text=${encodeURIComponent(message)}`;
}
