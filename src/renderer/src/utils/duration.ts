export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function fillPercent(used: number, capacity: number): number {
  if (!capacity) return 0
  return Math.min(100, Math.max(0, (used / capacity) * 100))
}
