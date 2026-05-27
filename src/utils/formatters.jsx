export function formatCalories(value) {
  return `${Number(value).toLocaleString()} kcal`;
}

export function formatWeight(value) {
  return `${value} kg`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}