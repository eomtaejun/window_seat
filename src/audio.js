// Procedural ambience keeps the demo self-contained and works on GitHub Pages.
export class TrainAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.volume = .7;
    this.weather = 'clear';
    this.landscape = 'forest';
    this.nextClack = 0;
    this.nextDrop = 0;
  }

  createNoise(seconds = 3) {
    const buffer = this.context.createBuffer(1, Math.round(this.context.sampleRate * seconds), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
  }

  layer(buffer, filterType, frequency, level) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    return gain;
  }

  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      const noise = this.createNoise();
      this.rumble = this.layer(noise, 'lowpass', 165, .48);
      this.wind = this.layer(noise, 'bandpass', 380, 0);
      this.waves = this.layer(noise, 'lowpass', 780, 0);
      this.clickNoise = this.createNoise(.12);
      this.nextClack = this.context.currentTime + .1;
      const motor = this.context.createOscillator();
      motor.type = 'sine';
      motor.frequency.value = 46;
      const motorGain = this.context.createGain();
      motorGain.gain.value = .065;
      motor.connect(motorGain).connect(this.master);
      motor.start();
    }
    await this.context.resume();
    this.enabled = true;
    this.nextClack = this.context.currentTime + .08;
    this.nextDrop = this.context.currentTime + .12;
    this.updateMix();
  }

  stop() {
    this.enabled = false;
    this.updateMix();
  }

  configure({ weather, landscape, volume }) {
    const previousWeather = this.weather;
    this.weather = weather;
    this.landscape = landscape;
    this.volume = volume;
    if (weather === 'rain' && previousWeather !== 'rain' && this.context) this.nextDrop = this.context.currentTime + .12;
    this.updateMix();
  }

  updateMix() {
    if (!this.context) return;
    const t = this.context.currentTime;
    const smooth = (node, value) => node.gain.setTargetAtTime(value, t, .12);
    smooth(this.master, this.enabled ? this.volume * .68 : 0);
    // Rain is individual, quiet drops; no continuous rain or wind wash.
    smooth(this.wind, this.weather === 'rain' ? 0 : this.weather === 'snow' ? .1 : this.landscape === 'mountain' ? .075 : .035);
    smooth(this.waves, this.landscape === 'coast' ? .13 : 0);
  }

  clack(at, offset, level) {
    const source = this.context.createBufferSource();
    source.buffer = this.clickNoise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420 + offset * 140;
    filter.Q.value = .7;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .095);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(at);
    source.stop(at + .11);
  }

  drop(at, strength = 1) {
    const source = this.context.createBufferSource();
    source.buffer = this.clickNoise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 750 + Math.random() * 700;
    filter.Q.value = 1.2;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime((.055 + Math.random() * .025) * strength, at + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .085);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(at);
    source.stop(at + .09);
  }

  update(elapsed) {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    while (this.nextClack < now + .16) {
      this.clack(this.nextClack, 0, .29);
      this.clack(this.nextClack + .15, 1, .2);
      this.nextClack += .62;
    }
    if (this.weather === 'rain') while (this.nextDrop < now + .16) {
      this.drop(this.nextDrop);
      if (Math.random() < .24) this.drop(this.nextDrop + .09, .42);
      this.nextDrop += .28 + Math.random() * .5;
    }
    // Slow swell distinguishes surf from the steady wheel and wind layers.
    if (this.landscape === 'coast') this.waves.gain.setTargetAtTime(.11 + .055 * (1 + Math.sin(elapsed * 1.25)), now, .2);
  }
}
