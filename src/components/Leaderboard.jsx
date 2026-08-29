import { useEffect, useState } from 'react';
import { fetchTopPlayers } from '../lib/leaderboard';
import { isSupabaseConfigured } from '../lib/supabase';

const METRICS = [
  { key: 'lifetime_focus_minutes', label: 'Focus Minutes' },
  { key: 'lifetime_sessions_completed', label: 'Sessions Completed' },
  { key: 'lives_completed', label: 'Lives Lived' },
];

export default function Leaderboard({ onClose }) {
  const [metric, setMetric] = useState(METRICS[0].key);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopPlayers(metric).then(({ data, error: err }) => {
      if (cancelled) return;
      setRows(data);
      setError(err);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [metric]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-card" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <button className="leaderboard-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <p className="leaderboard-empty">
            Leaderboard isn't set up yet — add Supabase credentials to see and share rankings.
          </p>
        ) : (
          <>
            <div className="leaderboard-tabs">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  className={`leaderboard-tab ${metric === m.key ? 'active' : ''}`}
                  onClick={() => setMetric(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {loading && <p className="leaderboard-empty">Loading…</p>}
            {error && <p className="leaderboard-empty">Couldn't load rankings right now.</p>}
            {!loading && !error && rows.length === 0 && (
              <p className="leaderboard-empty">No scores yet — be the first!</p>
            )}
            {!loading && !error && rows.length > 0 && (
              <ol className="leaderboard-list">
                {rows.map((row, i) => (
                  <li key={`${row.nickname}-${i}`}>
                    <span className="leaderboard-rank">#{i + 1}</span>
                    <span className="leaderboard-name">{row.nickname}</span>
                    <span className="leaderboard-value">{row[metric]}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
