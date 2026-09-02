import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getPlayerId } from '../lib/playerId';
import { generateRoomCode, roomLinkFor } from '../lib/room';
import { createPeerManager } from '../lib/webrtcPeers';
import FloatingTimer from './FloatingTimer';

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
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const myKey = getPlayerId();
  const channelRef = useRef(null);
  const sessionStartRef = useRef(null);
  const durationRef = useRef(durationMinutes);
  const completedRef = useRef(false);
  const peerManagerRef = useRef(null);
  const localStreamRef = useRef(null);

  const joinChannel = (code) => {
    setConnectionError(false);

    const channel = supabase.channel(`focus-room-${code}`, {
      config: { presence: { key: myKey }, broadcast: { self: true } },
    });

    peerManagerRef.current = createPeerManager({
      channel,
      myKey,
      onRemoteStream: (key, stream) => {
        setRemoteStreams((prev) => new Map(prev).set(key, stream));
      },
      onRemoteStreamClosed: (key) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setParticipants(Object.entries(state).map(([key, metas]) => ({ key, ...metas[0] })));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      peerManagerRef.current?.closePeer(key);
    });

    channel.on('broadcast', { event: 'session-start' }, ({ payload }) => {
      sessionStartRef.current = payload.startedAt;
      durationRef.current = payload.durationMinutes;
      setDurationMinutes(payload.durationMinutes);
      completedRef.current = false;
      setPhase('active');
    });

    channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
      peerManagerRef.current?.handleSignal(payload, localStreamRef.current);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionError(false);
        await channel.track({
          nickname,
          stageName: stage.name,
          stageEmoji: stage.milestoneEmoji,
          cameraOn: Boolean(localStreamRef.current),
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
    peerManagerRef.current?.closeAll();
    setRemoteStreams(new Map());
    setParticipants([]);
    joinChannel(roomCode);
  };

  const stopCamera = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setCameraOn(false);
    // Stop sending, but don't tear the connections down — a buddy whose camera
    // is still on should keep being watchable even after ours turns off.
    peerManagerRef.current?.setLocalStream(null);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
      channelRef.current?.track({ nickname, stageName: stage.name, stageEmoji: stage.milestoneEmoji, cameraOn: false });
      return;
    }

    try {
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraOn(true);
      // Push the new track onto any connection that already existed (e.g. one
      // the buddy opened first) — ensurePeer() below only handles brand-new peers.
      peerManagerRef.current?.setLocalStream(stream);
      await channelRef.current?.track({ nickname, stageName: stage.name, stageEmoji: stage.milestoneEmoji, cameraOn: true });
    } catch {
      // Camera denied/unavailable — stay in the audio-only session instead of blocking it.
      setCameraError(true);
    }
  };

  // Connect to (or disconnect from) each buddy's video as camera state changes on
  // either side. A one-way connection is fine: you can watch a buddy who has their
  // camera on even while yours stays off.
  useEffect(() => {
    if (!peerManagerRef.current) return;

    const activeKeys = new Set();
    participants.forEach((p) => {
      if (p.key === myKey) return;
      if (cameraOn || p.cameraOn) {
        activeKeys.add(p.key);
        if (!peerManagerRef.current.hasPeer(p.key)) {
          peerManagerRef.current.ensurePeer(p.key, { localStream: localStreamRef.current, initiator: myKey < p.key });
        }
      }
    });

    peerManagerRef.current.peerKeys().forEach((key) => {
      if (!activeKeys.has(key)) peerManagerRef.current.closePeer(key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, cameraOn]);

  // Camera is only meaningful during an active session — drop it the moment we
  // leave that phase instead of leaving a webcam light on in the background.
  useEffect(() => {
    if (phase !== 'active' && localStreamRef.current) stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (initialRoomCode) joinChannel(initialRoomCode);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      peerManagerRef.current?.closeAll();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
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
        <CameraBuddy
          cameraOn={cameraOn}
          cameraError={cameraError}
          onToggle={toggleCamera}
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
        />
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

function CameraBuddy({ cameraOn, cameraError, onToggle, localStream, remoteStreams, participants }) {
  const remoteEntries = Array.from(remoteStreams.entries());

  return (
    <div className="camera-buddy">
      {(cameraOn || remoteEntries.length > 0) && (
        <div className="camera-tiles">
          {cameraOn && <VideoTile stream={localStream} label="You" muted />}
          {remoteEntries.map(([key, stream]) => {
            const buddy = participants.find((p) => p.key === key);
            return <VideoTile key={key} stream={stream} label={buddy?.nickname || 'Buddy'} muted />;
          })}
        </div>
      )}
      <button
        type="button"
        className={`btn btn-secondary camera-toggle ${cameraOn ? 'camera-toggle-active' : ''}`}
        onClick={onToggle}
      >
        {cameraOn ? '📷 Turn off camera' : '📷 Turn on camera'}
      </button>
      {cameraError && <p className="camera-error">Couldn't access your camera. Check permissions and try again.</p>}
      <p className="camera-mic-note">🔇 Mic is always off</p>
    </div>
  );
}

function VideoTile({ stream, label, muted }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="camera-tile">
      {/* Every stream here is video-only (getUserMedia was requested with audio:false),
          but mute the element too so a buddy's tab can never emit audio either way. */}
      <video ref={videoRef} autoPlay playsInline muted={muted !== false} className="camera-video" />
      {label && <span className="camera-tile-label">{label}</span>}
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
