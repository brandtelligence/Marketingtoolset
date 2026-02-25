import { ReactNode } from 'react';
import { useFoldableLayout } from '../hooks/useFoldableLayout';

/**
 * FoldableContainer
 * ──────────────────────────────────────────────────────────────────────────────
 * A layout wrapper that automatically adapts to foldable / dual-screen devices.
 *
 * Features:
 * - Horizontal dual-screen: renders left + right panels with hinge gap
 * - Vertical dual-screen (tabletop): splits into top content / bottom controls
 * - Squarish aspect ratio (unfolded): uses auto-fit grids for flexible layouts
 * - Falls through to children on single-screen devices
 *
 * Usage:
 *   <FoldableContainer>
 *     <YourPageContent />
 *   </FoldableContainer>
 *
 * Or with explicit left/right content for dual-screen:
 *   <FoldableContainer
 *     leftContent={<Navigation />}
 *     rightContent={<MainContent />}
 *   >
 *     <FallbackSingleScreenContent />
 *   </FoldableContainer>
 */

interface FoldableContainerProps {
  children: ReactNode;
  /** Optional: explicit content for the left panel (dual-horizontal mode) */
  leftContent?: ReactNode;
  /** Optional: explicit content for the right panel (dual-horizontal mode) */
  rightContent?: ReactNode;
  /** Optional: explicit content for top panel (tabletop mode) */
  topContent?: ReactNode;
  /** Optional: explicit content for bottom panel (tabletop mode) */
  bottomContent?: ReactNode;
  /** Extra classes on the outer wrapper */
  className?: string;
}

export function FoldableContainer({
  children,
  leftContent,
  rightContent,
  topContent,
  bottomContent,
  className = '',
}: FoldableContainerProps) {
  const {
    isDualScreen,
    spanningMode,
    isTabletop,
    isSquarish,
  } = useFoldableLayout();

  // ── Dual-Horizontal (side-by-side, e.g. Surface Duo) ──
  if (isDualScreen && spanningMode === 'dual-horizontal' && (leftContent || rightContent)) {
    return (
      <div className={`fold-span-both fold-posture-aware ${className}`}>
        <div className="fold-grid-span min-h-screen">
          {/* Left segment */}
          <div className="overflow-y-auto fold-content-safe">
            {leftContent || children}
          </div>
          {/* Hinge spacer — the CSS grid gap handles this */}
          <div aria-hidden="true" />
          {/* Right segment */}
          <div className="overflow-y-auto fold-content-safe">
            {rightContent || children}
          </div>
        </div>
      </div>
    );
  }

  // ── Dual-Vertical / Tabletop (top-bottom, e.g. Galaxy Fold half-folded) ──
  if (isDualScreen && spanningMode === 'dual-vertical' && isTabletop && (topContent || bottomContent)) {
    return (
      <div className={`fold-posture-aware ${className}`}>
        {/* Top segment: scrollable content */}
        <div className="fold-tabletop-content fold-content-safe">
          {topContent || children}
        </div>
        {/* Bottom segment: controls / actions */}
        <div className="fold-tabletop-controls fold-content-safe bg-black/20 backdrop-blur-md border-t border-white/10">
          {bottomContent || children}
        </div>
      </div>
    );
  }

  // ── Squarish aspect ratio (unfolded device, ~1:1 or 4:3) ──
  // Apply flexible grid that uses auto-fit for better use of unusual dimensions
  if (isSquarish) {
    return (
      <div className={`fold-posture-aware ${className}`}>
        {children}
      </div>
    );
  }

  // ── Single-screen / standard device — pass through ──
  return (
    <div className={className || undefined}>
      {children}
    </div>
  );
}

/**
 * FoldableGrid
 * ──────────────────────────────────────────────────────────────────────────────
 * A grid that automatically adjusts columns based on foldable device state.
 * On dual-screen horizontal: places items across both panels.
 * On squarish screens: uses auto-fit for flexible columns.
 * Falls back to the provided grid classes on standard devices.
 */
interface FoldableGridProps {
  children: ReactNode;
  /** Standard grid classes (e.g. "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3") */
  className?: string;
  /** Minimum item width for auto-fit behavior (default: 18rem) */
  minItemWidth?: string;
}

export function FoldableGrid({
  children,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  minItemWidth = '18rem',
}: FoldableGridProps) {
  const { isDualScreen, spanningMode, isSquarish } = useFoldableLayout();

  // Dual-screen horizontal: use spanning grid
  if (isDualScreen && spanningMode === 'dual-horizontal') {
    return (
      <div
        className="fold-span-both fold-content-safe"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))`,
          gap: '1rem',
          columnGap: `max(1rem, var(--fold-hinge-width, 0px))`,
        }}
      >
        {children}
      </div>
    );
  }

  // Squarish / unfolded: use auto-fit for flexible layout
  if (isSquarish) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))`,
          gap: '1rem',
        }}
      >
        {children}
      </div>
    );
  }

  // Standard single-screen
  return <div className={className}>{children}</div>;
}

/**
 * useFoldAwareModalClass
 * ──────────────────────────────────────────────────────────────────────────────
 * Returns additional CSS classes for modals that should be foldable-aware.
 * On dual-screen: constrains the modal to one segment with safe padding.
 */
export function useFoldAwareModalClass(): string {
  const { isDualScreen, spanningMode } = useFoldableLayout();

  if (isDualScreen && spanningMode === 'dual-horizontal') {
    return 'fold-modal-safe fold-content-safe';
  }
  return '';
}
