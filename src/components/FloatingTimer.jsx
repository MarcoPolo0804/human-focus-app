export default function FloatingTimer({ label, time, meta, actionLabel, actionVariant, onAction, position, children }) {
  return (
    <div className={`floating-timer floating-timer-${position || 'top'}`}>
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
