import type { LoadProfile } from '@/types';

export function getLoadMultiplier(
  profile: LoadProfile,
  second: number,
  duration: number,
  spikeFrequency = 3,
  spikeIntensity = 3,
): number {
  switch (profile) {
    case 'sine':
      return 0.6 + 0.4 * Math.sin((2 * Math.PI * second) / Math.max(duration, 1));
    case 'repeating_spike': {
      if (
        !Number.isFinite(second) ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        !Number.isFinite(spikeFrequency) ||
        spikeFrequency <= 0 ||
        !Number.isFinite(spikeIntensity)
      ) {
        return 1.0;
      }

      const period = duration / spikeFrequency;
      const spikeWidth = period * 0.15;
      const phase = second % period;
      const center = period / 2;
      const dist = Math.abs(phase - center);
      const gaussian = Math.exp(-(dist * dist) / (2 * spikeWidth * spikeWidth));
      return 0.3 + (spikeIntensity - 0.3) * gaussian;
    }
    case 'constant':
    default:
      return 1.0;
  }
}
