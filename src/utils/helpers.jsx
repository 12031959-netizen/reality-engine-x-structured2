export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function percentage(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}