// Gentle ambient sound made with Web Audio: soft filtered "water" noise plus occasional bird chirps.
export function startAmbience() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
  master.connect(ctx.destination);
  // Water: brown noise through a low-pass filter
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  const wg = ctx.createGain();
  wg.gain.value = 2.5;
  noise.connect(lp).connect(wg).connect(master);
  noise.start();
  // Birds: short sine sweeps at random moments
  const timer = window.setInterval(() => {
    if (Math.random() > 0.45) return;
    const t = ctx.currentTime;
    for (let n = 0; n < 2 + Math.floor(Math.random() * 3); n++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const s = t + n * 0.13;
      const f = 2400 + Math.random() * 1600;
      o.frequency.setValueAtTime(f, s);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, s + 0.08);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.04, s + 0.02);
      g.gain.linearRampToValueAtTime(0, s + 0.1);
      o.connect(g).connect(master);
      o.start(s);
      o.stop(s + 0.12);
    }
  }, 1400);
  return () => {
    window.clearInterval(timer);
    void ctx.close();
  };
}
