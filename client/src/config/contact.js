export const officialWhatsApp = {
  display: '+91 91603 53295',
  number: '919160353295',
};

export function createWhatsAppUrl(message) {
  return `https://wa.me/${officialWhatsApp.number}?text=${encodeURIComponent(message)}`;
}
