// Original synthesized audio: a music-box melody that drifts out of tune with Cordura.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: number | null = null;
let muted = false;
let detune = 0; // cents
let sparse = 0; // 0..1 probability to drop notes

const MELODY = [
  // original lullaby phrase (semitones from C5), duration in beats
  [7, 1], [4, 1], [5, 1], [7, 2], [9, 1], [7, 1], [5, 1], [4, 2],
  [2, 1], [4, 1], [5, 1], [4, 1], [2, 1], [0, 3],
  [7, 1], [9, 1], [11, 1], [12, 2], [11, 1], [9, 1], [7, 2], [5, 1], [4, 1], [2, 1], [0, 3],
];

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
}

export function setUnease(cordura: number, chapter: number) {
  detune = (cordura / 100) * 45 + chapter * 6;
  sparse = Math.min(0.5, chapter * 0.07 + cordura / 300);
}

function bell(freq: number, t: number, vol = 0.18, dur = 1.6) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o2.type = "triangle";
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.01;
  o.detune.value = (Math.random() - 0.5) * detune * 2;
  o2.detune.value = o.detune.value;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.start(t); o2.start(t);
  o.stop(t + dur); o2.stop(t + dur);
}

export function startMusic() {
  const c = ensure();
  if (!c || musicTimer !== null) return;
  let i = 0;
  const beat = 0.42;
  const tick = () => {
    if (!ctx) return;
    const [semi, len] = MELODY[i % MELODY.length];
    if (Math.random() > sparse) bell(523.25 * Math.pow(2, semi / 12), ctx.currentTime + 0.02);
    i++;
    musicTimer = window.setTimeout(tick, beat * len * 1000 * (1 + detune / 400));
  };
  tick();
}

export function stopMusic() {
  if (musicTimer !== null) window.clearTimeout(musicTimer);
  musicTimer = null;
}

function noise(dur: number, freq: number, vol: number, q = 1) {
  const c = ensure();
  if (!c || !master) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export function sfx(kind: "tap" | "open" | "switch" | "chime" | "wrong" | "scare" | "whisper" | "creak" | "note", n = 0) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case "tap": bell(880, t, 0.06, 0.25); break;
    case "note": bell(523.25 * Math.pow(2, [0, 4, 7, 11][n % 4] / 12), t, 0.2, 1.2); break;
    case "chime": bell(784, t, 0.12); bell(1046, t + 0.12, 0.1); break;
    case "wrong": bell(311, t, 0.1, 0.6); break;
    case "open": noise(0.25, 900, 0.25, 2); break;
    case "switch": noise(0.05, 3000, 0.5, 4); break;
    case "creak": {
      if (!master) return;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(140, t + 1.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
      o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.6);
      break;
    }
    case "whisper": noise(1.6, 2400, 0.35, 0.7); break;
    case "scare": {
      noise(1.2, 200, 0.9, 0.3);
      if (!master) return;
      [55, 58.3, 82.4].forEach((f) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = "sawtooth"; o.frequency.value = f;
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        o.connect(g).connect(master!); o.start(t); o.stop(t + 1.7);
      });
      break;
    }
  }
}
