export default function GameOver({
  sessionsCompleted,
  sessionsFailed,
  totalFocusMinutes,
  onRestart,
  onViewLeaderboard,
}) {
  return (
    <div className="game-over">
      <div className="game-over-card">
        <div className="game-over-emoji">🕊️</div>
        <h2>A Life Well Lived</h2>
        <p>Your human has passed peacefully into old age.</p>
        <ul className="game-over-stats">
          <li>
            <strong>{sessionsCompleted}</strong> focus sessions completed
          </li>
          <li>
            <strong>{sessionsFailed}</strong> sessions abandoned
          </li>
          <li>
            <strong>{totalFocusMinutes}</strong> minutes of deep focus
          </li>
        </ul>
        <div className="game-over-actions">
          <button className="btn btn-primary" onClick={onRestart}>
            Start a New Life
          </button>
          <button className="btn btn-secondary" onClick={onViewLeaderboard}>
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
