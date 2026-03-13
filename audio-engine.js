class AudioEngine {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.kick = this.createKickSound();
    this.snare = this.createSnareSound();
    this.hihat = this.createHiHatSound();
    this.tom = this.createTomSound();
    this.synth = new Tone.Synth().toDestination();
  }

  createKickSound() {
    const oscillator = this.audioContext.createOscillator();
    oscillators.type = 'sine';
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    const envelope = this.audioContext.createGain();
    envelope.gain.setValueAtTime(1, this.audioContext.currentTime);
    envelope.gain.fadeOut = 0.2;
    oscillator.connect(envelope);
    envelope.connect(this.audioContext.destination);
    return () => {
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.2);
    };
  }

  createSnareSound() {
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    const filter = this.audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;
    noise.connect(filter);
    filter.connect(this.audioContext.destination);
    return () => {
      noise.start();
    };
  }

  createHiHatSound() {
    const noise = this.createSnareSound(); // Reusing snare sound logic for hi-hat
    return () => {
      noise();
    };
  }

  createTomSound() {
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    const envelope = this.audioContext.createGain();
    envelope.gain.setValueAtTime(1, this.audioContext.currentTime);
    envelope.gain.fadeOut = 0.3;
    oscillator.connect(envelope);
    envelope.connect(this.audioContext.destination);
    return () => {
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.3);
    };
  }

  playKick() {
    this.kick();
  }

  playSnare() {
    this.snare();
  }

  playHiHat() {
    this.hihat();
  }

  playTom() {
    this.tom();
  }

  playSynth(note) {
    this.synth.triggerAttackRelease(note, "8n");
  }
}