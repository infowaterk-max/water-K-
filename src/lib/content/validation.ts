export function isSafeContentHref(value: string | null | undefined) {
  if (value == null || value === '') return true;
  const href = value.trim();
  if (!href || href.startsWith('//')) return false;
  if (href.startsWith('/')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
