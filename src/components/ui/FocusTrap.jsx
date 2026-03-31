/**
 * FocusTrap — Priority 6 (Phase 5)
 * Spec ref: Phase 5 Timeline — Accessibility pass (focus management on modals)
 *
 * Traps keyboard focus within a container when mounted.
 * Required for WCAG 2.1 modals: delete account confirmation,
 * season end confirmation, opt-out confirmation, etc.
 *
 * Usage:
 *   <FocusTrap active={isModalOpen}>
 *     <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
 *       <h2 id="modal-title">Confirm Delete</h2>
 *       <button>Cancel</button>
 *       <button>Delete</button>
 *     </div>
 *   </FocusTrap>
 *
 * Behaviour:
 * - On mount: focuses the first focusable element inside the trap
 * - Tab / Shift+Tab: cycles within the trap boundary
 * - Escape: calls onEscape callback (if provided)
 * - On unmount: returns focus to the previously focused element
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export default function FocusTrap({ children, active = true, onEscape }) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    // Save the currently focused element to restore later
    previousFocusRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element inside the trap
    const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is ready after render
      requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [active, onEscape]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}
