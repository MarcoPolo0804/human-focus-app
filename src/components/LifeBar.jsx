import { STAGES, TOTAL_LIFE_POINTS } from '../stages';

export default function LifeBar({ lifePoints }) {
  const pct = Math.min(100, (lifePoints / TOTAL_LIFE_POINTS) * 100);

  return (
    <div className="life-bar">
      <div className="life-bar-track">
        <div className="life-bar-fill" style={{ width: `${pct}%` }} />
        {STAGES.map((s, i) => (
          <div
            key={s.name}
            className="life-bar-tick"
            style={{ left: `${(i / STAGES.length) * 100}%` }}
            title={s.name}
          />
        ))}
      </div>
      <div className="life-bar-label">
        {lifePoints} / {TOTAL_LIFE_POINTS} life points
      </div>
    </div>
  );
}
