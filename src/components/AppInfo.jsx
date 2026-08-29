import { useEffect, useState } from 'react';
import { submitFeedback } from '../lib/feedback';

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'feedback', label: 'Feedback' },
];

export default function AppInfo() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('about');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState(null);

  const close = () => {
    setOpen(false);
    setTab('about');
    setStatus('idle');
    setError(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    const { error: err, storedLocally } = await submitFeedback(message);
    if (err && !storedLocally) {
      setError("Couldn't send feedback right now — try again in a bit.");
      setStatus('idle');
      return;
    }
    setStatus('sent');
    setMessage('');
  };

  return (
    <>
      <button className="info-fab" onClick={() => setOpen(true)} aria-label="About Human Focus & feedback">
        ℹ️
      </button>

      {open && (
        <div className="leaderboard-overlay" onClick={close}>
          <div className="leaderboard-card" onClick={(e) => e.stopPropagation()}>
            <div className="leaderboard-header">
              <h2>About Human Focus</h2>
              <button className="leaderboard-close" onClick={close} aria-label="Close">
                ×
              </button>
            </div>

            <div className="leaderboard-tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`leaderboard-tab ${tab === t.key ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'about' && (
              <div className="about-content">
                <p>
                  Human Focus turns a focus timer into something with stakes: every session you
                  finish helps your character grow through life, from newborn to elder.
                  Abandoning a session ages them faster without the benefit of the time focused —
                  a gentle, visible nudge to see sessions through.
                </p>
                <p>
                  There's no punishment beyond that — no streak-shaming, no lost progress. Just a
                  small, low-pressure reason to stay with one task a little longer.
                </p>
                <p>
                  Use <strong>Focus Together</strong> to sit in a session with someone else, and{' '}
                  <strong>✨ Motivation Spark</strong> for a quick nudge when your attention drifts.
                </p>
              </div>
            )}

            {tab === 'feedback' && (
              <form className="feedback-form" onSubmit={handleSubmit}>
                {status === 'sent' ? (
                  <p className="feedback-sent">Thanks — your feedback was sent. 💛</p>
                ) : (
                  <>
                    <label htmlFor="feedback-message">
                      What's not working, or what would you like to see added?
                    </label>
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what to fix or build next..."
                      rows={5}
                      maxLength={2000}
                    />
                    {error && <p className="feedback-error">{error}</p>}
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={status === 'sending' || !message.trim()}
                    >
                      {status === 'sending' ? 'Sending…' : 'Send feedback'}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
