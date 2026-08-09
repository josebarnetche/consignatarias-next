/**
 * Overlay coordinator — a one-line guard shared by the global floating overlays
 * (the subscribe modal and the account nudge) so at most ONE of them is ever
 * visible at a time. Without this, a scroll-triggered subscribe modal and an
 * action-triggered account nudge could both slide in and fight for the corner.
 *
 * Doctrine: respect the reader. One ask per page load, never a pile-up.
 *
 * Module-level boolean → persists across App-Router client navigations (SPA), so
 * a visitor who already saw one overlay this session won't get nagged again on the
 * next in-app navigation. Each overlay still keeps its own durable snooze
 * (localStorage) for cross-session suppression.
 */

let shown = false

/** True if any coordinated overlay has already been shown this page load. */
export function overlayShown(): boolean {
  return shown
}

/** Mark that a coordinated overlay is now visible. Call right before showing. */
export function markOverlayShown(): void {
  shown = true
}
