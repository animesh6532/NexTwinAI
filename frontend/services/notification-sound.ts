"use client";

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    }
    return this.ctx;
  }

  public play(
    type: "critical" | "warning" | "success" | "maintenance" | "simulation" | "energy",
    volume: number = 0.5,
    muted: boolean = false
  ) {
    if (muted || volume <= 0) return;
    
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      // Keep master output extremely soft and professional
      masterGain.gain.setValueAtTime(volume * 0.12, now);
      masterGain.connect(ctx.destination);

      switch (type) {
        case "critical": {
          // Soft alarm: Two alternating clean triangle pulses
          // Pulse 1
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(880, now); // A5
          
          gain1.gain.setValueAtTime(0, now);
          gain1.gain.linearRampToValueAtTime(0.8, now + 0.03);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          
          osc1.connect(gain1);
          gain1.connect(masterGain);
          osc1.start(now);
          osc1.stop(now + 0.25);

          // Pulse 2 (higher note)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1046.5, now + 0.18); // C6
          
          gain2.gain.setValueAtTime(0, now + 0.18);
          gain2.gain.linearRampToValueAtTime(0.8, now + 0.21);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          
          osc2.connect(gain2);
          gain2.connect(masterGain);
          osc2.start(now + 0.18);
          osc2.stop(now + 0.45);
          break;
        }

        case "warning": {
          // Mellow warn: dual note sliding down
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.35); // B4

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.9, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case "success": {
          // Rising major chord chime
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, index) => {
            const delay = index * 0.05;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + delay);

            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.5, now + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.35);
          });
          break;
        }

        case "maintenance": {
          // Low-frequency double tap bell
          const freqs = [329.63, 220.0]; // E4, A3
          freqs.forEach((freq, index) => {
            const delay = index * 0.15;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + delay);

            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.8, now + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.5);
          });
          break;
        }

        case "simulation": {
          // Futuristic sweep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(987.77, now); // B5
          osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.45); // E4

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.8, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }

        case "energy": {
          // Soft resonance double beep
          const timeOffset = 0.16;
          [0, timeOffset].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(440.0, now + delay); // A4

            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.6, now + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
          });
          break;
        }
      }
    } catch (err) {
      console.warn("Failed to play Web Audio chime", err);
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
