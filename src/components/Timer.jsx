import { useEffect, useRef, useState } from 'react';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Timer({ onComplete, onAbandon }) {
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0) {
      setRunning(false);
      onComplete(minutes);
    }
  }, [running, secondsLeft, onComplete, minutes]);

  const start = () => {
    setSecondsLeft(minutes * 60);
    setRunning(true);
  };

  const abandon = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    onAbandon();
  };

  return (
    <div className="timer">
      {!running ? (
        <div className="timer-setup">
          <label htmlFor="minutes">Focus duration (minutes)</label>
          <input
            id="minutes"
            type="number"
            min="1"
            max="180"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
          />
          <button className="btn btn-primary" onClick={start}>
            Start Focus Session
          </button>
        </div>
      ) : (
        <div className="timer-running">
          <div className="timer-display">{formatTime(secondsLeft)}</div>
          <button className="btn btn-danger" onClick={abandon}>
            Abandon Session
          </button>
        </div>
      )}
    </div>
  );
}
