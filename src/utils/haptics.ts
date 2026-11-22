import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function cozyTap(style: 'light' | 'medium' = 'light'): void {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.impact({
    style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
  }).catch(() => {});
}
