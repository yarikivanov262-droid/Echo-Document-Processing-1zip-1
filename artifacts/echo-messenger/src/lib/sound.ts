let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function isEnabled() {
  try { return localStorage.getItem("echo_sounds") !== "false"; } catch { return true; }
}

function playTone(freq1: number, freq2: number, duration: number, gain = 0.08) {
  if (!isEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.setValueAtTime(freq1, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, c.currentTime + duration);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sound = {
  send: () => playTone(440, 880, 0.12),
  receive: () => playTone(660, 880, 0.1, 0.05),
  error: () => { playTone(200, 150, 0.15); setTimeout(() => playTone(150, 100, 0.1), 160); },
  ring: () => {
    const interval = setInterval(() => playTone(880, 1320, 0.4, 0.12), 600);
    return () => clearInterval(interval);
  },
};
