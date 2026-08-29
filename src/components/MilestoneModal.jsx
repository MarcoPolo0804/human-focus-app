const CONFETTI_COLORS = ['#FF6B6B', '#FFD166', '#4FA3E3', '#7BC67E', '#B98CCB'];

export default function MilestoneModal({ stage, onContinue }) {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.1 + Math.random() * 0.6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-card milestone-card">
        <div className="confetti" aria-hidden="true">
          {pieces.map((p, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                background: p.color,
              }}
            />
          ))}
        </div>
        <div className="milestone-emoji">{stage.milestoneEmoji}</div>
        <h2>New stage: {stage.name}</h2>
        <p>{stage.tagline}</p>
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
