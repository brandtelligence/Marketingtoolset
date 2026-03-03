/**
 * useFocusTrap
 * ──────────────────────────────────────────────────────────────────────────────
 * Traps keyboard focus within a container element while active.
 *
 * WCAG 2.1 SC 2.4.3 — Focus Order: modal dialogs must confine tab focus
 * so keyboard users cannot escape behind the overlay.
 *
 * Usage:
 *   const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
 *   <div ref={trapRef} role="dialog" aria-modal="true">…</div>
 */

import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Return focus to the previously-focused element when the trap deactivates
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [active]);

  // Auto-focus the first focusable child when the trap activates
  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Small delay lets AnimatePresence finish mounting the DOM
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [active]);

  // Intercept Tab / Shift+Tab to cycle within container
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || !containerRef.current || e.key !== 'Tab') return;

      const container = containerRef.current;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab at the first element → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab at the last element → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [active],
  );

  useEffect(() => {
    if (!active) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, handleKeyDown]);

  return containerRef;
}
