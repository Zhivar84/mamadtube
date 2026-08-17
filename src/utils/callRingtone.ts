/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Web Audio API synthesizer for incoming/outgoing call ringtones.
 * Avoids broken external audio URLs and provides instant, zero-latency feedback.
 */
class CallSoundEffects {
  private ctx: AudioContext | null = null;
  private ringInterval: number | null = null;
  private isRinging: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play standard dual-tone multi-frequency burst (440Hz + 480Hz US telephone standard ringtone)
   */
  private playRingToneBurst() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Dual oscillator for rich telephony ring
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // 440 Hz
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now); // 480 Hz

      // Envelope: 1.6s on, gentle ramp up and down
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gainNode.gain.setValueAtTime(0.12, now + 1.4);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.65);
      osc2.stop(now + 1.65);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Start looping incoming call ringtone
   */
  startIncomingRing() {
    if (this.isRinging) return;
    this.isRinging = true;

    this.playRingToneBurst();
    this.ringInterval = window.setInterval(() => {
      if (this.isRinging) {
        this.playRingToneBurst();
      }
    }, 3200); // Ring every 3.2 seconds
  }

  /**
   * Stop ringtone immediately
   */
  stopRing() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  /**
   * Play outgoing call soft beep
   */
  playOutgoingRing() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch {}
  }

  /**
   * Play call end/hangup click tone
   */
  playHangupTone() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }
}

export const ringtoneService = new CallSoundEffects();
