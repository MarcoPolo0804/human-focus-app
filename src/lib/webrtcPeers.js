const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Manages one WebRTC peer connection per buddy over an existing Supabase
// realtime channel (used purely as a signaling relay via broadcast events).
// Video is one-way-friendly: a side with no local camera still gets a
// recvonly transceiver so it can watch a buddy who has theirs on.
export function createPeerManager({ channel, myKey, onRemoteStream, onRemoteStreamClosed }) {
  const peers = new Map();

  const sendSignal = (to, kind, data) => {
    channel.send({ type: 'broadcast', event: 'webrtc-signal', payload: { to, from: myKey, kind, data } });
  };

  const flushPendingCandidates = async (entry) => {
    for (const candidate of entry.pendingCandidates) {
      await entry.pc.addIceCandidate(candidate);
    }
    entry.pendingCandidates = [];
  };

  const createConnection = (remoteKey, localStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry = { pc, pendingCandidates: [] };
    peers.set(remoteKey, entry);

    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      pc.addTrack(videoTrack, localStream);
    } else {
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(remoteKey, 'ice', e.candidate.toJSON());
    };

    pc.ontrack = (e) => {
      onRemoteStream(remoteKey, e.streams[0]);
    };

    return entry;
  };

  const hasPeer = (remoteKey) => peers.has(remoteKey);

  const peerKeys = () => Array.from(peers.keys());

  const closePeer = (remoteKey) => {
    const entry = peers.get(remoteKey);
    if (!entry) return;
    entry.pc.close();
    peers.delete(remoteKey);
    onRemoteStreamClosed(remoteKey);
  };

  const closeAll = () => {
    for (const key of peerKeys()) closePeer(key);
  };

  const ensurePeer = async (remoteKey, { localStream, initiator }) => {
    if (peers.has(remoteKey)) return;
    const entry = createConnection(remoteKey, localStream);
    if (initiator) {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      sendSignal(remoteKey, 'offer', offer);
    }
  };

  const handleSignal = async ({ to, from, kind, data }, localStream) => {
    if (to !== myKey) return;
    let entry = peers.get(from);

    if (kind === 'offer') {
      if (!entry) entry = createConnection(from, localStream);
      await entry.pc.setRemoteDescription(new RTCSessionDescription(data));
      await flushPendingCandidates(entry);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      sendSignal(from, 'answer', answer);
    } else if (kind === 'answer') {
      if (!entry) return;
      await entry.pc.setRemoteDescription(new RTCSessionDescription(data));
      await flushPendingCandidates(entry);
    } else if (kind === 'ice') {
      const candidate = new RTCIceCandidate(data);
      if (entry?.pc.remoteDescription) {
        await entry.pc.addIceCandidate(candidate);
      } else if (entry) {
        entry.pendingCandidates.push(candidate);
      }
    }
  };

  return { ensurePeer, closePeer, closeAll, handleSignal, hasPeer, peerKeys };
}
