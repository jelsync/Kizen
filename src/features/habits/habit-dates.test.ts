import { describe, expect, it } from 'vitest'
import { formatCivilDate, formatDateInTimeZone } from './habit-dates'

describe('habit dates', () => {
  it('uses the profile time zone instead of the UTC calendar date', () => {
    const instant = new Date('2026-09-15T03:30:00.000Z')

    expect(formatDateInTimeZone(instant, 'UTC')).toBe('2026-09-15')
    expect(formatDateInTimeZone(instant, 'America/Tegucigalpa')).toBe('2026-09-14')
  })

  it('handles a zone ahead of UTC near midnight', () => {
    const instant = new Date('2026-09-15T22:30:00.000Z')

    expect(formatDateInTimeZone(instant, 'Asia/Tokyo')).toBe('2026-09-16')
  })

  it('formats a civil log date without applying the browser time zone', () => {
    expect(formatCivilDate('2026-09-15')).toContain('15')
  })
})
