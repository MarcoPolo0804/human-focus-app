import { useEffect, useRef } from 'react';

const DRAG_MARGIN = 8;
// Fraction of the remaining distance closed per animation frame. Lower = more
// lag/glide before the widget catches up to the cursor (and to the drop point
// after release, since the loop keeps running until it settles).
const EASE = 0.18;
const SETTLE_EPSILON = 0.5;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function FloatingTimer({ label, time, meta, actionLabel, actionVariant, onAction, position, children }) {
  const wrapperRef = useRef(null);
  const dragOffsetRef = useRef(null);
  const targetRef = useRef(null);
  const currentRef = useRef(null);
  const rafRef = useRef(null);
  const draggingRef = useRef(false);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const tick = () => {
    const el = wrapperRef.current;
    const target = targetRef.current;
    const current = currentRef.current;
    if (!el || !target || !current) {
      stopLoop();
      return;
    }

    current.x += (target.x - current.x) * EASE;
    current.y += (target.y - current.y) * EASE;
    el.style.left = `${current.x}px`;
    el.style.top = `${current.y}px`;
    el.style.bottom = 'auto';

    const settled = Math.hypot(target.x - current.x, target.y - current.y) <= SETTLE_EPSILON;
    if (draggingRef.current || !settled) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      current.x = target.x;
      current.y = target.y;
      el.style.left = `${current.x}px`;
      el.style.top = `${current.y}px`;
      rafRef.current = null;
    }
  };

  const ensureLoop = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return; // let the action button handle its own click
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!currentRef.current) currentRef.current = { x: rect.left, y: rect.top };
    if (!targetRef.current) targetRef.current = { x: rect.left, y: rect.top };
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    ensureLoop();
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !dragOffsetRef.current) return;
    const el = wrapperRef.current;
    const w = el?.offsetWidth ?? 160;
    const h = el?.offsetHeight ?? 100;
    targetRef.current = {
      x: clamp(e.clientX - dragOffsetRef.current.dx, DRAG_MARGIN, window.innerWidth - w - DRAG_MARGIN),
      y: clamp(e.clientY - dragOffsetRef.current.dy, DRAG_MARGIN, window.innerHeight - h - DRAG_MARGIN),
    };
  };

  const handlePointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragOffsetRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    // The rAF loop keeps running on its own from here, easing the last stretch
    // into the drop point instead of stopping dead where the pointer let go.
  };

  useEffect(() => stopLoop, []);

  return (
    <div
      ref={wrapperRef}
      className={`floating-timer floating-timer-${position || 'top'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <p className="floating-timer-label">{label}</p>
      <div className="floating-timer-display">{time}</div>
      {meta && <p className="floating-timer-meta">{meta}</p>}
      {children}
      {onAction && (
        <button className={`btn btn-${actionVariant || 'secondary'} floating-timer-action`} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
