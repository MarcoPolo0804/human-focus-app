import { useState } from 'react';

export default function NicknamePrompt({ onSubmit }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = value.trim().slice(0, 24);
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-card">
        <h2>Pick a nickname</h2>
        <p className="leaderboard-empty">
          Shown on the public leaderboard next to your stats. No account needed.
        </p>
        <form onSubmit={submit} className="nickname-form">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={24}
            placeholder="e.g. FocusFox"
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={!value.trim()}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
