import { useEffect, useState } from 'react';
import Character from './components/Character';
import LifeBar from './components/LifeBar';
import Timer from './components/Timer';
import GameOver from './components/GameOver';
import Leaderboard from './components/Leaderboard';
import NicknamePrompt from './components/NicknamePrompt';
import MilestoneModal from './components/MilestoneModal';
import FocusTogether from './components/FocusTogether';
import MotivationSpark from './components/MotivationSpark';
import { STAGES, TOTAL_LIFE_POINTS, stageIndexForPoints } from './stages';
import { upsertMyStats } from './lib/leaderboard';
import './App.css';

const STORAGE_KEY = 'human-focus-app-state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const defaultLife = {
  lifePoints: 0,
  sessionsCompleted: 0,
  sessionsFailed: 0,
  totalFocusMinutes: 0,
  consecutiveAbandons: 0,
  sick: false,
  dead: false,
};

const defaultState = {
  nickname: null,
  life: defaultLife,
  lifetime: {
    totalFocusMinutes: 0,
    sessionsCompleted: 0,
    sessionsFailed: 0,
    livesCompleted: 0,
  },
};

export default function App() {
  const [state, setState] = useState(() => {
    const saved = loadState();
    if (!saved) return defaultState;
    return {
      ...defaultState,
      ...saved,
      life: { ...defaultLife, ...saved.life },
      lifetime: { ...defaultState.lifetime, ...saved.lifetime },
    };
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFocusTogether, setShowFocusTogether] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState(() => new URLSearchParams(window.location.search).get('room'));
  const [pendingAction, setPendingAction] = useState(null);
  const [milestoneStage, setMilestoneStage] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.nickname) upsertMyStats(state.nickname, state.lifetime);
  }, [state.nickname, state.lifetime]);

  useEffect(() => {
    if (!pendingRoomCode) return;
    if (!state.nickname) {
      setPendingAction('focus-together');
    } else {
      setShowFocusTogether(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = (minutes) => {
    const oldStageIndex = stageIndexForPoints(state.life.lifePoints);
    const lifePoints = state.life.lifePoints + 1;
    const dead = lifePoints >= TOTAL_LIFE_POINTS;
    const newStageIndex = stageIndexForPoints(lifePoints);

    setState((prev) => ({
      ...prev,
      life: {
        ...prev.life,
        lifePoints,
        sessionsCompleted: prev.life.sessionsCompleted + 1,
        totalFocusMinutes: prev.life.totalFocusMinutes + minutes,
        consecutiveAbandons: 0,
        sick: false,
        dead,
      },
      lifetime: {
        ...prev.lifetime,
        totalFocusMinutes: prev.lifetime.totalFocusMinutes + minutes,
        sessionsCompleted: prev.lifetime.sessionsCompleted + 1,
        livesCompleted: prev.lifetime.livesCompleted + (dead ? 1 : 0),
      },
    }));

    if (!dead && newStageIndex !== oldStageIndex) {
      setMilestoneStage(STAGES[newStageIndex]);
    }
  };

  const handleAbandon = () => {
    const oldStageIndex = stageIndexForPoints(state.life.lifePoints);
    const lifePoints = state.life.lifePoints + 2;
    const dead = lifePoints >= TOTAL_LIFE_POINTS;
    const newStageIndex = stageIndexForPoints(lifePoints);
    const consecutiveAbandons = state.life.consecutiveAbandons + 1;
    const sick = state.life.sick || consecutiveAbandons >= 2;

    setState((prev) => ({
      ...prev,
      life: {
        ...prev.life,
        lifePoints,
        sessionsFailed: prev.life.sessionsFailed + 1,
        consecutiveAbandons,
        sick,
        dead,
      },
      lifetime: {
        ...prev.lifetime,
        sessionsFailed: prev.lifetime.sessionsFailed + 1,
        livesCompleted: prev.lifetime.livesCompleted + (dead ? 1 : 0),
      },
    }));

    if (!dead && newStageIndex !== oldStageIndex) {
      setMilestoneStage(STAGES[newStageIndex]);
    }
  };

  const handleRestart = () => {
    setState((prev) => ({ ...prev, life: defaultLife }));
  };

  const openLeaderboard = () => {
    if (!state.nickname) setPendingAction('leaderboard');
    else setShowLeaderboard(true);
  };

  const openFocusTogether = () => {
    if (!state.nickname) setPendingAction('focus-together');
    else setShowFocusTogether(true);
  };

  const handleNicknameSubmit = (nickname) => {
    setState((prev) => ({ ...prev, nickname }));
    setPendingAction(null);
    if (pendingAction === 'focus-together') setShowFocusTogether(true);
    else setShowLeaderboard(true);
  };

  const closeFocusTogether = () => {
    setShowFocusTogether(false);
    if (pendingRoomCode) {
      setPendingRoomCode(null);
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url);
    }
  };

  const stageIndex = stageIndexForPoints(state.life.lifePoints);
  const stage = STAGES[stageIndex];

  return (
    <>
      {state.life.dead ? (
        <GameOver
          sessionsCompleted={state.life.sessionsCompleted}
          sessionsFailed={state.life.sessionsFailed}
          totalFocusMinutes={state.life.totalFocusMinutes}
          onRestart={handleRestart}
          onViewLeaderboard={openLeaderboard}
        />
      ) : (
        <div className="app" style={{ background: stage.bg }}>
          <MotivationSpark />
          <header className="app-header">
            <h1>Human Focus</h1>
            <p className="subtitle">Keep them alive, one focus session at a time.</p>
            <div className="header-actions">
              <button className="leaderboard-link" onClick={openLeaderboard}>
                🏆 Leaderboard
              </button>
              <button className="leaderboard-link" onClick={openFocusTogether}>
                👥 Focus Together
              </button>
            </div>
          </header>

          <main className="app-main">
            <div className="character-panel">
              <Character stage={stage} sick={state.life.sick} />
              <h2 className="stage-name">{stage.name}</h2>
              <p className="stage-tagline">{stage.tagline}</p>
              {state.life.sick && <span className="sick-banner">🤒 Feeling under the weather — finish a session to help them recover</span>}
            </div>

            <LifeBar lifePoints={state.life.lifePoints} />

            <Timer onComplete={handleComplete} onAbandon={handleAbandon} />

            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">{state.life.sessionsCompleted}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.life.sessionsFailed}</span>
                <span className="stat-label">Abandoned</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.life.totalFocusMinutes}</span>
                <span className="stat-label">Minutes Focused</span>
              </div>
            </div>
          </main>
        </div>
      )}

      {pendingAction && <NicknamePrompt onSubmit={handleNicknameSubmit} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showFocusTogether && (
        <FocusTogether
          nickname={state.nickname}
          stage={stage}
          initialRoomCode={pendingRoomCode}
          onComplete={handleComplete}
          onAbandon={handleAbandon}
          onClose={closeFocusTogether}
        />
      )}
      {milestoneStage && <MilestoneModal stage={milestoneStage} onContinue={() => setMilestoneStage(null)} />}
    </>
  );
}
