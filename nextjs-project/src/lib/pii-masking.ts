export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, '');
  if (digits.length <= 4) return phone;
  const visible = digits.slice(-4);
  const masked = '*'.repeat(Math.max(0, digits.length - 4)) + visible;
  let i = 0;
  return phone.replace(/\d/g, () => masked[i++] ?? '');
}

export function shortAddress(address: string, city?: string | null): string {
  const base = address.split(',').map((part) => part.trim()).filter(Boolean);
  const main = base.slice(0, 2).join(', ');
  if (city && !main.toLowerCase().includes(city.toLowerCase())) {
    return `${city}, ${main}`;
  }
  return main || address;
}

