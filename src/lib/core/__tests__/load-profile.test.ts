import { describe, expect, it } from 'vitest'
import { getLoadMultiplier } from '../load-profile'

describe('getLoadMultiplier', () => {
  describe('constant traffic', () => {
    it('returns a steady multiplier independent of time or duration', () => {
      expect(getLoadMultiplier('constant', 0, 60)).toBe(1)
      expect(getLoadMultiplier('constant', 30, 60)).toBe(1)
      expect(getLoadMultiplier('constant', 100, 0)).toBe(1)
    })

    it('falls back to a steady multiplier for an unrecognized profile', () => {
      expect(getLoadMultiplier('unexpected' as 'constant', 10, 20)).toBe(1)
    })
  })

  describe('smooth sine traffic ramp', () => {
    it('starts at the baseline and reaches the configured high and low points', () => {
      expect(getLoadMultiplier('sine', 0, 4)).toBeCloseTo(0.6)
      expect(getLoadMultiplier('sine', 1, 4)).toBeCloseTo(1)
      expect(getLoadMultiplier('sine', 3, 4)).toBeCloseTo(0.2)
    })

    it('repeats after one duration and safely handles zero duration', () => {
      expect(getLoadMultiplier('sine', 6, 4)).toBeCloseTo(getLoadMultiplier('sine', 2, 4))
      expect(getLoadMultiplier('sine', 0, 0)).toBeCloseTo(0.6)
      expect(Number.isFinite(getLoadMultiplier('sine', 1, 0))).toBe(true)
    })
  })

  describe('repeating spike traffic', () => {
    it('reaches the requested intensity at each spike center', () => {
      const duration = 12
      const frequency = 3
      const intensity = 4

      expect(getLoadMultiplier('repeating_spike', 2, duration, frequency, intensity)).toBeCloseTo(intensity)
      expect(getLoadMultiplier('repeating_spike', 6, duration, frequency, intensity)).toBeCloseTo(intensity)
      expect(getLoadMultiplier('repeating_spike', 10, duration, frequency, intensity)).toBeCloseTo(intensity)
    })

    it('approaches the baseline away from a spike center', () => {
      expect(getLoadMultiplier('repeating_spike', 0, 12, 3, 3)).toBeCloseTo(0.3, 1)
    })

    it('uses default spike frequency and intensity when omitted', () => {
      // duration 6 / default frequency 3 gives a period of 2 and first center at 1.
      expect(getLoadMultiplier('repeating_spike', 1, 6)).toBeCloseTo(3)
    })

    it('returns a finite steady multiplier for zero or invalid frequency and duration', () => {
      expect(getLoadMultiplier('repeating_spike', 1, 0)).toBe(1)
      expect(getLoadMultiplier('repeating_spike', 1, 10, 0)).toBe(1)
      expect(getLoadMultiplier('repeating_spike', 1, 10, -2)).toBe(1)
    })
  })
})
