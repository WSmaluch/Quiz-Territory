export interface AudioPreferences {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  countdownEnabled: boolean;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private preferences: AudioPreferences = {
    masterVolume: 1.0,
    musicVolume: 1.0,
    effectsVolume: 1.0,
    muted: false,
    musicEnabled: true,
    effectsEnabled: true,
    countdownEnabled: true,
  };
  private unlocked = false;
  private lastTickSecond: number = -1;

  private constructor() {
    this.loadPreferences();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  private loadPreferences() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('quiz_audio_prefs');
      if (stored) this.preferences = { ...this.preferences, ...JSON.parse(stored) };
    } catch {}
  }

  savePreferences(prefs: Partial<AudioPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_audio_prefs', JSON.stringify(this.preferences));
    }
  }

  getPreferences() { return this.preferences; }

  async unlock() {
    if (this.unlocked) return;
    try {
      if (!this.audioContext) this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      this.unlocked = true;
    } catch (e) {
      console.warn('Audio unlock failed', e);
    }
  }

  playSound(_id: string) {
    if (!this.unlocked || this.preferences.muted || !this.preferences.effectsEnabled) return;
    // In reality this would load an ArrayBuffer from a map and play it via AudioBufferSourceNode
    // console.log(`Playing sound: ${id}`);
  }

  playTick(second: number) {
    if (!this.unlocked || this.preferences.muted || !this.preferences.countdownEnabled) return;
    if (this.lastTickSecond === second) return; // deduplicate
    this.lastTickSecond = second;
    this.playSound('tick');
  }

  stopTicks() {
    this.lastTickSecond = -1;
  }

  cleanup() {
    this.stopTicks();
  }
}
