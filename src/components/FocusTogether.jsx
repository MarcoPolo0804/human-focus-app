import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getPlayerId } from '../lib/playerId';
import { generateRoomCode, roomLinkFor } from '../lib/room';
import FloatingTimer from './FloatingTimer';
import JitsiCameraBuddy from './JitsiCameraBuddy';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function FocusTogether({ nickname, stage, initialRoomCode, onComplete, onAbandon, onClose }) {
  const [phase, setPhase] = useState(initialRoomCode ? 'lobby' : 'choice');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [joinInput, setJoinInput] = useState('');
  const [isHost, setIsHost] = useState(!initialRoomCode ? null : false);
  const [participants, setParticipants] = useState([]);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const channelRef = useRef(null);
  const sessionStartRef = useRef(null);
  const durationRef = useRef(durationMinutes);
  const completedRef = useRef(false);

  const joinChannel = (code) => {
    setConnectionError(false);

    const channel = supabase.channel(`focus-room-${code}`, {
      config: { presence: { key: getPlayerId() }, broadcast: { self: true } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      setParticipants(Object.values(channel.presenceState()).flat());
    });

    channel.on('broadcast', { event: 'session-start' }, ({ payload }) => {
      sessionStartRef.current = payload.startedAt;
      durationRef.current = payload.durationMinutes;
      setDurationMinutes(payload.durationMinutes);
      completedRef.current = false;
      setPhase('active');
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionError(false);
        await channel.track({
          nickname,
          stageName: stage.name,
          stageEmoji: stage.milestoneEmoji,
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // The realtime socket failed to connect or dropped (flaky network, VPN/firewall
        // blocking WebSockets, etc). Without this, the UI would hang on "Connecting…"
        // forever with no way out.
        setConnectionError(true);
      }
    });

    channelRef.current = channel;
  };

  const retryConnection = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    setParticipants([]);
    joinChannel(roomCode);
  };

  const toggleCamera = () => {
    setCameraError(false);
    setCameraOn((prev) => !prev);
  };

  // Camera is only meaningful during an active session — drop it the moment we
  // leave that phase instead of leaving the call running in the background.
  useEffect(() => {
    if (phase !== 'active') setCameraOn(false);
  }, [phase]);

  useEffect(() => {
    if (initialRoomCode) joinChannel(initialRoomCode);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.track({ nickname, stageName: stage.name, stageEmoji: stage.milestoneEmoji });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, stage.name]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && phase !== 'active') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, phase]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    const tick = () => {
      const totalSeconds = durationRef.current * 60;
      const elapsed = (Date.now() - sessionStartRef.current) / 1000;
      const remaining = Math.max(0, Math.min(totalSeconds, totalSeconds - elapsed));
      setSecondsLeft(Math.ceil(remaining));

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete(durationRef.current);
        setPhase('done');
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, onComplete]);

  const hostRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setPhase('lobby');
    joinChannel(code);
  };

  const attemptJoin = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    setIsHost(false);
    setPhase('lobby');
    joinChannel(code);
  };

  const startTogether = () => {
    const startedAt = Date.now() + 2000;
    channelRef.current.send({
      type: 'broadcast',
      event: 'session-start',
      payload: { startedAt, durationMinutes },
    });
  };

  const leaveSession = () => {
    onAbandon();
    setPhase('done');
  };

  const exitActiveSession = () => {
    const hasPartner = participants.length > 1;
    if (hasPartner && !window.confirm('Leave this focus session? Your partner will keep going without you.')) {
      return;
    }
    leaveSession();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLinkFor(roomCode));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the code is still shown on screen.
    }
  };

  if (phase === 'active') {
    return (
      <FloatingTimer
        position="bottom"
        label="Focusing together"
        time={formatTime(secondsLeft)}
        actionLabel="Leave Session"
        actionVariant="danger"
        onAction={exitActiveSession}
      >
        <ParticipantList participants={participants} compact />
        <div className="camera-buddy">
          <button
            type="button"
            className={`btn btn-secondary camera-toggle ${cameraOn ? 'camera-toggle-active' : ''}`}
            onClick={toggleCamera}
          >
            {cameraOn ? '📷 Turn off camera' : '📷 Turn on camera'}
          </button>
          {cameraOn && <p className="camera-mic-note">🔇 Mic is muted</p>}
          {cameraError && <p className="camera-error">Video call failed to load. Check your connection and try again.</p>}
          <JitsiCameraBuddy
            active={cameraOn}
            roomName={`human-focus-app-${roomCode}`}
            nickname={nickname}
            onError={() => {
              setCameraError(true);
              setCameraOn(false);
            }}
          />
        </div>
        {connectionError && <ConnectionError onRetry={retryConnection} />}
      </FloatingTimer>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="leaderboard-overlay" onClick={onClose}>
        <div className="leaderboard-card" onClick={(e) => e.stopPropagation()}>
          <div className="leaderboard-header">
            <h2>Focus Together</h2>
            <button className="leaderboard-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <p className="leaderboard-empty">Not set up yet — add Supabase credentials to sync sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-card" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>Focus Together</h2>
          <button className="leaderboard-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {phase === 'choice' && (
          <div className="focus-together-choice">
            <button className="btn btn-primary" onClick={hostRoom}>
              Host a Session
            </button>
            <div className="join-row">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                maxLength={6}
              />
              <button className="btn btn-secondary" onClick={attemptJoin} disabled={!joinInput.trim()}>
                Join
              </button>
            </div>
          </div>
        )}

        {phase === 'lobby' && (
          <div className="focus-together-lobby">
            <p className="room-code-label">Room code</p>
            <div className="room-code">{roomCode}</div>
            <button className="btn btn-secondary" onClick={copyLink}>
              {linkCopied ? 'Link copied!' : 'Copy invite link'}
            </button>

            <ParticipantList participants={participants} />
            {connectionError && <ConnectionError onRetry={retryConnection} />}

            {isHost ? (
              <div className="timer-setup">
                <label htmlFor="together-minutes">Focus duration (minutes)</label>
                <input
                  id="together-minutes"
                  type="number"
                  min="1"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
                />
                <button className="btn btn-primary" onClick={startTogether}>
                  Start Together
                </button>
              </div>
            ) : (
              <p className="leaderboard-empty">Waiting for the host to start…</p>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="focus-together-done">
            <p className="leaderboard-empty">Session complete. Nice work!</p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionError({ onRetry }) {
  return (
    <div className="connection-error">
      <p>Connection trouble — this can happen on a VPN, firewall, or spotty network.</p>
      <button className="btn btn-secondary" onClick={onRetry}>
        Retry connection
      </button>
    </div>
  );
}

function ParticipantList({ participants, compact }) {
  if (participants.length === 0) {
    return <p className={compact ? 'floating-timer-meta' : 'leaderboard-empty'}>Connecting…</p>;
  }

  if (compact) {
    return (
      <p className="floating-timer-meta">
        {participants.map((p) => `${p.stageEmoji || '🙂'} ${p.nickname || 'Someone'}`).join('  ·  ')}
      </p>
    );
  }

  return (
    <ul className="participant-list">
      {participants.map((p, i) => (
        <li key={i}>
          <span className="participant-emoji">{p.stageEmoji || '🙂'}</span>
          <span className="participant-name">{p.nickname || 'Someone'}</span>
          <span className="participant-stage">{p.stageName}</span>
        </li>
      ))}
    </ul>
  );
}
