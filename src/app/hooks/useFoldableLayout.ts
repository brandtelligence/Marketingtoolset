import { useState, useEffect, useCallback } from 'react';

/**
 * useFoldableLayout
 * ──────────────────────────────────────────────────────────────────────────────
 * Detects foldable / dual-screen devices and exposes layout information.
 *
 * Uses:
 * - CSS Viewport Segments API (horizontal-viewport-segments / vertical-viewport-segments)
 * - Device Posture API (navigator.devicePosture)
 * - Screen Spanning API (legacy, for older Surface Duo browsers)
 *
 * Returns safe defaults on non-foldable devices so consumers can always
 * destructure without conditional checks.
 */

export type SpanningMode = 'single' | 'dual-horizontal' | 'dual-vertical';
export type DevicePosture = 'continuous' | 'folded' | 'unknown';

export interface FoldableLayoutInfo {
  /** Whether the device is currently showing two viewport segments */
  isDualScreen: boolean;
  /** Current spanning configuration */
  spanningMode: SpanningMode;
  /** Device posture — 'folded' = partially folded, 'continuous' = flat */
  posture: DevicePosture;
  /** True when the device is in "tabletop" mode (horizontal fold, top half content / bottom half controls) */
  isTabletop: boolean;
  /** True when the device is in "book" mode (vertical fold, left page / right page) */
  isBook: boolean;
  /** Estimated hinge width in pixels (0 on non-foldable) */
  hingeWidth: number;
  /** Estimated hinge height in pixels (0 on non-foldable) */
  hingeHeight: number;
  /** Width of the left/primary segment in px */
  segment0Width: number;
  /** Width of the right/secondary segment in px (0 if single screen) */
  segment1Width: number;
  /** Viewport aspect ratio — useful for detecting unconventional ratios (4:3, 1:1) */
  aspectRatio: number;
  /** Whether aspect ratio is "square-ish" (between 0.8 and 1.25) — common on unfolded devices */
  isSquarish: boolean;
  /** Whether aspect ratio is ultra-wide (> 1.8) — e.g. unfolded horizontal dual screen */
  isUltraWide: boolean;
}

/** Match a CSS media query and return whether it matches */
function matchQuery(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Read the device posture from the experimental API or CSS */
function detectPosture(): DevicePosture {
  // Try Device Posture API
  if (typeof navigator !== 'undefined' && 'devicePosture' in navigator) {
    const dp = (navigator as any).devicePosture;
    if (dp?.type === 'continuous') return 'continuous';
    if (dp?.type === 'folded') return 'folded';
  }
  // Fallback: CSS media query
  if (matchQuery('(device-posture: folded)')) return 'folded';
  if (matchQuery('(device-posture: continuous)')) return 'continuous';
  return 'unknown';
}

function computeLayout(): FoldableLayoutInfo {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const aspectRatio = vw / vh;

  const isDualH = matchQuery('(horizontal-viewport-segments: 2)');
  const isDualV = matchQuery('(vertical-viewport-segments: 2)');
  const isDualScreen = isDualH || isDualV;

  const spanningMode: SpanningMode = isDualH
    ? 'dual-horizontal'
    : isDualV
    ? 'dual-vertical'
    : 'single';

  const posture = detectPosture();

  // Tabletop = vertical segments (top/bottom split) with folded posture
  const isTabletop = isDualV && posture === 'folded';
  // Book = horizontal segments (left/right split) with folded posture
  const isBook = isDualH && posture === 'folded';

  // Estimate segment dimensions
  // On dual-horizontal, each segment is roughly half the viewport width
  const segment0Width = isDualH ? Math.floor(vw / 2) : vw;
  const segment1Width = isDualH ? Math.floor(vw / 2) : 0;

  // Hinge is typically 0-30px on foldable devices
  const hingeWidth = isDualH ? Math.max(0, vw - segment0Width * 2) : 0;
  const hingeHeight = isDualV ? Math.max(0, vh - Math.floor(vh / 2) * 2) : 0;

  return {
    isDualScreen,
    spanningMode,
    posture,
    isTabletop,
    isBook,
    hingeWidth,
    hingeHeight,
    segment0Width,
    segment1Width,
    aspectRatio,
    isSquarish: aspectRatio >= 0.8 && aspectRatio <= 1.25,
    isUltraWide: aspectRatio > 1.8,
  };
}

export function useFoldableLayout(): FoldableLayoutInfo {
  const [layout, setLayout] = useState<FoldableLayoutInfo>(computeLayout);

  const update = useCallback(() => {
    setLayout(computeLayout());
  }, []);

  useEffect(() => {
    // Listen for viewport / orientation changes
    window.addEventListener('resize', update);

    // Listen for viewport segments change (Chromium)
    const mqH = window.matchMedia?.('(horizontal-viewport-segments: 2)');
    const mqV = window.matchMedia?.('(vertical-viewport-segments: 2)');
    mqH?.addEventListener?.('change', update);
    mqV?.addEventListener?.('change', update);

    // Listen for device posture changes
    if ('devicePosture' in navigator) {
      (navigator as any).devicePosture?.addEventListener?.('change', update);
    }

    // Also listen for screen.orientation changes
    screen?.orientation?.addEventListener?.('change', update);

    // Initial compute
    update();

    return () => {
      window.removeEventListener('resize', update);
      mqH?.removeEventListener?.('change', update);
      mqV?.removeEventListener?.('change', update);
      if ('devicePosture' in navigator) {
        (navigator as any).devicePosture?.removeEventListener?.('change', update);
      }
      screen?.orientation?.removeEventListener?.('change', update);
    };
  }, [update]);

  return layout;
}
