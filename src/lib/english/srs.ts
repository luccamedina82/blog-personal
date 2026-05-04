export interface SRSResult {
  ease: number
  interval_days: number
  due: string
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

// SM-2 lite: rating 1=Again 2=Hard 3=Good 4=Easy
export function sm2(ease: number, intervalDays: number, rating: 1 | 2 | 3 | 4): SRSResult {
  if (rating === 1) {
    return {
      ease: Math.max(1.3, Math.round((ease - 0.2) * 100) / 100),
      interval_days: 1,
      due: daysFromNow(1),
    }
  }

  const newInterval =
    intervalDays === 0 ? 1
    : intervalDays === 1 ? (rating === 2 ? 1 : 6)
    : rating === 2 ? Math.max(1, Math.round(intervalDays * 1.2))
    : Math.round(intervalDays * ease)

  const easeAdj = rating === 2 ? -0.15 : rating === 3 ? 0 : 0.1
  const newEase = Math.max(1.3, Math.round((ease + easeAdj) * 100) / 100)

  return { ease: newEase, interval_days: newInterval, due: daysFromNow(newInterval) }
}
