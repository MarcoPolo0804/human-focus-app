import { useEffect, useRef, useState } from 'react';
import { ensureAudioContext, playAlarm } from '../lib/sound';
import FloatingTimer from './FloatingTimer';

const REST_SECONDS = 10 * 60;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Timer({ onComplete, onAbandon, onRestChange }) {
  const [minutes, setMinutes] = useState(25);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'focus' | 'rest'
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (phase === 'setup') return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === 'focus' && secondsLeft === 0) {
      playAlarm();
      onComplete(minutes);
      setPhase('rest');
      setSecondsLeft(REST_SECONDS);
    } else if (phase === 'rest' && secondsLeft === 0) {
      playAlarm();
      setPhase('setup');
    }
  }, [phase, secondsLeft, onComplete, minutes]);

  useEffect(() => {
    onRestChange?.(phase === 'rest');
  }, [phase, onRestChange]);

  const start = () => {
    ensureAudioContext(); // grabbed inside this click handler so the later alarm is allowed to play
    setSecondsLeft(minutes * 60);
    setPhase('focus');
  };

  const abandon = () => {
    clearInterval(intervalRef.current);
    setPhase('setup');
    onAbandon();
  };

  if (phase === 'focus') {
    return (
      <FloatingTimer
        position="top"
        label="Focusing"
        time={formatTime(secondsLeft)}
        actionLabel="Abandon Session"
        actionVariant="danger"
        onAction={abandon}
      />
    );
  }

  return (
    <div className="timer">
      {phase === 'setup' && (
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
      )}
      {phase === 'rest' && (
        <div className="timer-resting">
          <p className="timer-rest-label">🌙 Resting</p>
          <div className="timer-display">{formatTime(secondsLeft)}</div>
          <p className="timer-rest-hint">A fixed 10-minute break before your next session.</p>
        </div>
      )}
    </div>
  );
}
