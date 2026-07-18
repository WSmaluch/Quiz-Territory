import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager';

describe('Phase 6.5 AudioManager', () => {
  beforeEach(() => {
    AudioManager.getInstance().cleanup();
    AudioManager.getInstance().savePreferences({ muted: false, countdownEnabled: true });
  });

  it('audio preference defaults', () => {
    const prefs = AudioManager.getInstance().getPreferences();
    expect(prefs.masterVolume).toBe(1.0);
    expect(prefs.muted).toBe(false);
  });

  it('audio preference persistence', () => {
    AudioManager.getInstance().savePreferences({ muted: true });
    expect(AudioManager.getInstance().getPreferences().muted).toBe(true);
  });

  it('countdown tick deduplication', () => {
    // Unlocked and play tick
    (AudioManager.getInstance() as any).unlocked = true;
    let spy = 0;
    (AudioManager.getInstance() as any).playSound = () => { spy++; };
    
    AudioManager.getInstance().playTick(10);
    AudioManager.getInstance().playTick(10);
    expect(spy).toBe(1);

    AudioManager.getInstance().playTick(9);
    expect(spy).toBe(2);
  });

  it('pause stopping ticks', () => {
    (AudioManager.getInstance() as any).unlocked = true;
    AudioManager.getInstance().playTick(10);
    AudioManager.getInstance().stopTicks();
    expect((AudioManager.getInstance() as any).lastTickSecond).toBe(-1);
  });

  it('player switch stopping previous ticks', () => {
    AudioManager.getInstance().cleanup();
    expect((AudioManager.getInstance() as any).lastTickSecond).toBe(-1);
  });
});
