export const officialWhatsApp = {
  display: '+91 91603 53295',
  number: '919160353295',
};

export function createWhatsAppUrl(message, number = officialWhatsApp.number) {
  return `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function formatIndianPhone(number = officialWhatsApp.number) {
  const digits = String(number).replace(/\D/g, ''); const local = digits.startsWith('91') ? digits.slice(2) : digits;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : `+${digits}`;
}
