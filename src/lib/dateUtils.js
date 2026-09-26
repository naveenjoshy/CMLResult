export function parseDateDDMMYYYY(value) {
  const match = String(value || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return '';

  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) return '';

  return `${year}-${month}-${day}`;
}

export function formatDateDDMMYYYY(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${value.getFullYear()}`;
  }

  const date = String(value || '');
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  if (parseDateDDMMYYYY(date)) return date;
  return date;
}