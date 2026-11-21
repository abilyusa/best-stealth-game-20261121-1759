// Every sound is synthesized with the Web Audio API: no audio files, no
// network, just short oscillator blips shaped by a gain envelope.
export function createAudio() {
  const audio = {
    context: null,
    muted: false,
    ensure() {
      if (!audio.context) {
        const Ctor = window.AudioContext ?? window.webkitAudioContext;
        if (!Ctor) return;
        audio.context = new Ctor();
      }
      if (audio.context.state === 'suspended') audio.context.resume();
    },
    toggleMute() {
      audio.muted = !audio.muted;
      return audio.muted;
    },
    blip(freq, dur, type, gainValue, slideTo) {
      if (audio.muted) return;
      audio.ensure();
      if (!audio.context) return;
      const now = audio.context.currentTime;
      const osc = audio.context.createOscillator();
      const gain = audio.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(audio.context.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    },
    step(sneaking) {
      audio.blip(sneaking ? 140 : 190, 0.05, 'triangle', sneaking ? 0.02 : 0.045);
    },
    pebble() {
      audio.blip(2400, 0.08, 'square', 0.05, 900);
    },
    clink() {
      audio.blip(1750, 0.12, 'sine', 0.07, 1200);
      audio.blip(2620, 0.09, 'sine', 0.04, 1800);
    },
    pickup() {
      audio.blip(660, 0.1, 'sine', 0.08, 990);
      setTimeout(() => audio.blip(990, 0.14, 'sine', 0.07, 1320), 90);
    },
    alarm() {
      audio.blip(220, 0.35, 'sawtooth', 0.09, 440);
      setTimeout(() => audio.blip(220, 0.35, 'sawtooth', 0.09, 440), 180);
    },
    caught() {
      audio.blip(330, 0.5, 'sawtooth', 0.1, 82);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => audio.blip(freq, 0.22, 'sine', 0.08), i * 120);
      });
    },
    click() {
      audio.blip(880, 0.06, 'sine', 0.05);
    },
  };
  return audio;
}
