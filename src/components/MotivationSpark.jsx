import { useEffect, useRef, useState } from 'react';

const QUOTES = [
  'Small steps still count.',
  'Future you is cheering right now.',
  'Discipline is just self-respect in action.',
  'Start messy. Momentum fixes the rest.',
  'One focused hour beats ten distracted ones.',
  "You don't need motivation, just the next 5 minutes.",
  'Progress, not perfection.',
  'Breathe. Begin.',
  'The hardest part is already behind you — starting.',
  'Your future self is taking notes.',
  'Done is better than perfect.',
  'Every session you finish makes the next one easier.',
  'Slow progress is still progress.',
  'You showed up. That is the whole game.',
  'Tiny effort today, real change tomorrow.',
];

const GRADIENTS = [
  'linear-gradient(135deg, #FDE2E4, #E2ECE9)',
  'linear-gradient(135deg, #E7F1FB, #E4F5F6)',
  'linear-gradient(135deg, #EFEAFA, #F3E9F6)',
  'linear-gradient(135deg, #FFF6E9, #FFEAD1)',
  'linear-gradient(135deg, #E9F6EA, #E4F5F6)',
  'linear-gradient(135deg, #F3E9F6, #FDE2E4)',
  'linear-gradient(135deg, #FFF2E2, #FDE2E4)',
  'linear-gradient(135deg, #E4F5F6, #EFEAFA)',
];

const CARDS_STORAGE_KEY = 'human-focus-app-motivation-cards';
const OLD_PIN_STORAGE_KEY = 'human-focus-app-motivation-pin';
const DRAG_MARGIN = 8;
const CARD_WIDTH_ESTIMATE = 260;
const CARD_HEIGHT_ESTIMATE = 130;
const CASCADE_STEP = 42;
const CASCADE_WRAP = 6;
const MAX_CARDS = 3;

function pickRandom(list, exclude) {
  if (list.length === 1) return list[0];
  let choice = list[Math.floor(Math.random() * list.length)];
  while (choice === exclude) {
    choice = list[Math.floor(Math.random() * list.length)];
  }
  return choice;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function loadCards() {
  try {
    localStorage.removeItem(OLD_PIN_STORAGE_KEY); // superseded by the multi-card stack below
    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === 'number' && typeof c.x === 'number' && typeof c.y === 'number' && QUOTES.includes(c.quote) && GRADIENTS.includes(c.gradient))
      .slice(-MAX_CARDS)
      .map((c) => ({ ...c, phase: 'open' }));
  } catch {
    return [];
  }
}

export default function MotivationSpark() {
  const [cards, setCards] = useState(loadCards);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const fabRef = useRef(null);
  const wrapperRefs = useRef(new Map());
  const dragStateRef = useRef(null);
  const nextIdRef = useRef(1 + cards.reduce((max, c) => Math.max(max, c.id), 0));

  useEffect(() => {
    try {
      const toSave = cards.map(({ id, quote, gradient, x, y }) => ({ id, quote, gradient, x, y }));
      if (toSave.length) localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(toSave));
      else localStorage.removeItem(CARDS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [cards]);

  useEffect(() => {
    if (menuOpenId === null) return undefined;
    const handleOutside = (e) => {
      if (!e.target.closest('.motivation-settings')) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpenId]);

  const spawnPosition = (index) => {
    const fabRect = fabRef.current?.getBoundingClientRect();
    const baseX = (fabRect?.right ?? 76) + 12;
    const baseY = (fabRect ? fabRect.top + fabRect.height / 2 : window.innerHeight / 2) - CARD_HEIGHT_ESTIMATE / 2;
    const cascade = (index % CASCADE_WRAP) * CASCADE_STEP;
    return {
      x: clamp(baseX + cascade, DRAG_MARGIN, window.innerWidth - CARD_WIDTH_ESTIMATE - DRAG_MARGIN),
      y: clamp(baseY + cascade, DRAG_MARGIN, window.innerHeight - CARD_HEIGHT_ESTIMATE - DRAG_MARGIN),
    };
  };

  const spawnCard = () => {
    const id = nextIdRef.current++;
    setCards((prev) => {
      if (prev.length >= MAX_CARDS) return prev;
      const last = prev[prev.length - 1];
      const { x, y } = spawnPosition(prev.length);
      return [
        ...prev,
        {
          id,
          quote: pickRandom(QUOTES, last?.quote),
          gradient: pickRandom(GRADIENTS, last?.gradient),
          phase: 'open',
          x,
          y,
        },
      ];
    });
  };

  const beginClosing = (id) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, phase: 'closing' } : c)));
  };

  const clearAll = () => {
    setMenuOpenId(null);
    setCards((prev) => prev.map((c) => (c.phase === 'closing' ? c : { ...c, phase: 'closing' })));
  };

  const handleCardAnimationEnd = (id) => (e) => {
    if (e.animationName !== 'motivation-pop-out') return;
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Each wrapper is its own stacking context, so a later card's body always paints over an
  // earlier card's popover (its nested z-index only outranks siblings within its own wrapper).
  // Moving the touched card to the end of the array puts it last in DOM order, on top of the pile.
  const bringToFront = (id) => {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const card = prev[idx];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), card];
    });
  };

  const handleDragPointerDown = (id) => (e) => {
    const wrapper = wrapperRefs.current.get(id);
    if (!wrapper) return;
    bringToFront(id);
    const rect = wrapper.getBoundingClientRect();
    dragStateRef.current = { id, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e) => {
    const state = dragStateRef.current;
    const wrapper = state && wrapperRefs.current.get(state.id);
    if (!state || !wrapper) return;
    const x = clamp(e.clientX - state.dx, DRAG_MARGIN, window.innerWidth - wrapper.offsetWidth - DRAG_MARGIN);
    const y = clamp(e.clientY - state.dy, DRAG_MARGIN, window.innerHeight - wrapper.offsetHeight - DRAG_MARGIN);
    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;
  };

  const handleDragPointerUp = (e) => {
    const state = dragStateRef.current;
    const wrapper = state && wrapperRefs.current.get(state.id);
    dragStateRef.current = null;
    if (!state || !wrapper) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const rect = wrapper.getBoundingClientRect();
    setCards((prev) => prev.map((c) => (c.id === state.id ? { ...c, x: rect.left, y: rect.top } : c)));
  };

  const handleResetPosition = (id, index) => {
    const { x, y } = spawnPosition(index);
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, x, y } : c)));
    setMenuOpenId(null);
  };

  const handleRemoveCard = (id) => {
    setMenuOpenId(null);
    beginClosing(id);
  };

  return (
    <div className="motivation-spark">
      <button
        ref={fabRef}
        className="motivation-fab"
        onClick={spawnCard}
        disabled={cards.length >= MAX_CARDS}
        aria-label="Add a motivation card"
        title={cards.length >= MAX_CARDS ? `Remove a card to add another (max ${MAX_CARDS})` : undefined}
      >
        ✨
      </button>
      {cards.length > 0 && (
        <button className="motivation-clear-all" onClick={clearAll} aria-label="Clear all motivation cards" title="Clear all cards">
          🗑
        </button>
      )}
      {cards.map((card, index) => (
        <div
          key={card.id}
          ref={(el) => {
            if (el) wrapperRefs.current.set(card.id, el);
            else wrapperRefs.current.delete(card.id);
          }}
          className="motivation-card-wrapper"
          style={{ left: card.x, top: card.y }}
        >
          <div
            className={`motivation-card${card.phase === 'closing' ? ' motivation-card-closing' : ''}`}
            style={{
              backgroundImage: `radial-gradient(circle, rgba(45, 42, 61, 0.1) 1.6px, transparent 1.6px), ${card.gradient}`,
              backgroundSize: '20px 20px, 100% 100%',
            }}
            role="status"
            onAnimationEnd={handleCardAnimationEnd(card.id)}
          >
            <div className="motivation-card-toolbar">
              <button
                className="motivation-drag-handle"
                aria-label="Drag to move this card"
                onPointerDown={handleDragPointerDown(card.id)}
                onPointerMove={handleDragPointerMove}
                onPointerUp={handleDragPointerUp}
              >
                ✥
              </button>
              <div className="motivation-settings">
                <button
                  className="motivation-settings-btn"
                  aria-label="Card settings"
                  aria-expanded={menuOpenId === card.id}
                  onClick={() => {
                    bringToFront(card.id);
                    setMenuOpenId((v) => (v === card.id ? null : card.id));
                  }}
                >
                  ⚙
                </button>
                {menuOpenId === card.id && (
                  <div className="motivation-settings-menu">
                    <button onClick={() => handleResetPosition(card.id, index)}>Reset position</button>
                    <button onClick={() => handleRemoveCard(card.id)}>Remove card</button>
                  </div>
                )}
              </div>
            </div>
            <p>{card.quote}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
