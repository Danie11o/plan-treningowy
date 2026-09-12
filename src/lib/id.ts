/**
 * randomUUID działa tylko na https i localhost. Przy testach z telefonu po
 * adresie z sieci domowej (http://192.168…) go nie ma — wtedy zapasowy wariant.
 */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
