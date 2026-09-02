import { useEffect, useRef, useState } from 'react';

const JITSI_DOMAIN = 'meet.jit.si';
const JITSI_SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

// Jitsi's public server does all the NAT traversal / relay work for us, so
// there's no TURN server or signaling code to maintain on our side.
let scriptPromise = null;
function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JITSI_SCRIPT_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load Jitsi Meet'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

// No 'microphone' entry, so buddies have no in-call control to unmute.
const TOOLBAR_BUTTONS = ['camera', 'fullscreen', 'tileview', 'hangup'];

export default function JitsiCameraBuddy({ active, roomName, nickname, onError }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    setLoading(true);

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: nickname },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            toolbarButtons: TOOLBAR_BUTTONS,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
          },
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        onError?.();
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, roomName]);

  if (!active) return null;

  return (
    <div className="jitsi-camera-buddy">
      {loading && <p className="floating-timer-meta">Loading video…</p>}
      <div ref={containerRef} className="jitsi-container" />
    </div>
  );
}
