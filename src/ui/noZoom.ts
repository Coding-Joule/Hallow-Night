/**
 * iPad/iPhone Safari ignores `user-scalable=no`, so double-tap and pinch
 * would zoom the page mid-game. Block those gestures (form fields keep
 * working normally).
 */
export function preventPageZoom(): void {
  const isField = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

  // pinch-zoom (Safari gesture events)
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }
  // two-finger zoom on browsers without gesture events
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  // double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd < 350 && !isField(e.target)) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );
  document.addEventListener('dblclick', (e) => {
    if (!isField(e.target)) e.preventDefault();
  });
}
