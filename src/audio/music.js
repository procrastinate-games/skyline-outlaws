// Procedural Synthwave Arcade BGM Loop (Web Audio API)
export function gameplayBGM(ctx, destination) {
  const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 82.41, 73.42]; // A1, C2, D2, E2
  const arpNotes = [220, 261.63, 329.63, 440, 329.63, 261.63, 293.66, 392.0];
  let step = 0;

  const timer = setInterval(() => {
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Bass pulse
    const bassFreq = bassNotes[step % bassNotes.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(bassFreq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.17);

    // Subtle synthwave arpeggio on alternating steps
    if (step % 2 === 0) {
      const arpFreq = arpNotes[(step >> 1) % arpNotes.length];
      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, now);

      arpGain.gain.setValueAtTime(0.03, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      arpOsc.connect(arpGain);
      arpGain.connect(destination);

      arpOsc.start(now);
      arpOsc.stop(now + 0.23);
    }

    step += 1;
  }, 190);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
