export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Storage for currently active audio buffers mapped by key ('C', 'C#', etc.)
  private buffers: Record<string, AudioBuffer> = {};
  
  // Global cache to instantly load previously used buffers without re-fetching/decoding
  private decodedCache: Record<string, AudioBuffer> = {};
  
  // Currently playing node info
  private activeSource: AudioBufferSourceNode | null = null;
  private activeGain: GainNode | null = null;
  private activeKey: string | null = null;
  private activeOctave: number = 0;

  // Crossfade duration in seconds
  private fadeTime = 1.5;

  private pendingVolume: number = 0.8;
  
  // Suspension timer reference
  private suspensionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Lazy initialization to prevent Safari from blocking AudioContext creation on startup
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private scheduleSuspension() {
    this.cancelSuspension();
    // Suspend after 2 minutes of idle time in the background
    this.suspensionTimer = setTimeout(async () => {
      if (typeof document !== 'undefined' && document.hidden && !this.activeKey && this.ctx && this.ctx.state === 'running') {
        await this.ctx.suspend();
      }
    }, 120000); // 120,000 ms = 2 minutes
  }

  private cancelSuspension() {
    if (this.suspensionTimer) {
      clearTimeout(this.suspensionTimer);
      this.suspensionTimer = null;
    }
  }

  private handleVisibilityChange = async () => {
    if (!this.ctx) return;
    
    if (document.hidden) {
      // If nothing is playing when we leave, start the 2-minute countdown
      if (!this.activeKey) {
        this.scheduleSuspension();
      }
    } else {
      // Coming back to the app: cancel any pending suspension and wake up
      this.cancelSuspension();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
    }
  };

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.pendingVolume;
    }
  }

  /**
   * Resumes the audio context if it was suspended (browser autoplay policy)
   */
  public async resume() {
    this.initCtx();
    if (this.ctx!.state === 'suspended') {
      await this.ctx!.resume();
    }
  }

  /**
   * Transforms any audio buffer into a perfectly seamless infinite loop.
   * It creates a new buffer that is slightly shorter, and crossfades the 
   * tail end of the audio over the beginning.
   */
  private makeSeamlessLoop(originalBuffer: AudioBuffer, fadeMs: number = 1000): AudioBuffer {
    const fadeSamples = Math.min(
      Math.floor((fadeMs / 1000) * originalBuffer.sampleRate),
      Math.floor(originalBuffer.length / 2) // Max crossfade is half the audio length
    );
    
    if (fadeSamples <= 0 || !this.ctx) return originalBuffer;

    const newLength = originalBuffer.length - fadeSamples;
    const newBuffer = this.ctx.createBuffer(
      originalBuffer.numberOfChannels, 
      newLength, 
      originalBuffer.sampleRate
    );

    for (let c = 0; c < originalBuffer.numberOfChannels; c++) {
      const origData = originalBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      
      // Copy the main body
      for (let i = 0; i < newLength; i++) {
        newData[i] = origData[i];
      }
      
      // Seamlessly blend the tail over the head
      for (let i = 0; i < fadeSamples; i++) {
        const fadeOut = Math.cos((i / fadeSamples) * 0.5 * Math.PI); // Equal power crossfade
        const fadeIn = Math.cos((1.0 - (i / fadeSamples)) * 0.5 * Math.PI);
        
        // Mix the tail into the beginning
        newData[i] = (origData[newLength + i] * fadeOut) + (origData[i] * fadeIn);
      }
    }
    
    return newBuffer;
  }

  /**
   * Loads an audio file or blob into a buffer
   */
  public async loadBuffer(key: string, url: string | File | Blob, customCacheKey?: string): Promise<void> {
    this.initCtx();
    
    const cacheKey = customCacheKey || (typeof url === 'string' ? url : `blob-${url.size}`);
    
    // If we've already loaded and decoded this exact file, instantly use the cached version!
    if (this.decodedCache[cacheKey]) {
      this.buffers[key] = this.decodedCache[cacheKey];
      return;
    }

    try {
      let arrayBuffer: ArrayBuffer;
      if (typeof url === 'string') {
        const response = await fetch(url);
        arrayBuffer = await response.arrayBuffer();
      } else {
        arrayBuffer = await url.arrayBuffer();
      }
      
      let audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      audioBuffer = this.makeSeamlessLoop(audioBuffer, 1500); // 1.5 second seamless crossfade
      
      this.decodedCache[cacheKey] = audioBuffer; // Save to global cache
      this.buffers[key] = audioBuffer;           // Set as active buffer for this key
    } catch (err) {
      console.error(`Failed to load buffer for key ${key}:`, err);
    }
  }

  /**
   * Set Master Volume (0 to 100)
   */
  public setVolume(volume: number) {
    const normalized = volume / 100;
    this.pendingVolume = normalized * normalized;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.pendingVolume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Calculate playback rate for octave (-1, 0, 1)
   */
  private getPlaybackRate(octave: number): number {
    if (octave === 1) return 2.0;
    if (octave === -1) return 0.5;
    return 1.0;
  }

  /**
   * Play a specific key at a specific octave.
   * If something is already playing, seamlessly crossfade to the new sound.
   */
  public async play(key: string, octave: number) {
    this.initCtx();
    await this.resume();

    // Cancel any pending suspension since we are playing audio
    this.cancelSuspension();

    const buffer = this.buffers[key];
    if (!buffer) {
      console.warn(`No buffer loaded for key: ${key}`);
      return;
    }

    // Create new source and gain
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = this.getPlaybackRate(octave);

    const gainNode = this.ctx!.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx!.currentTime); // Start silent

    source.connect(gainNode);
    gainNode.connect(this.masterGain!);

    const now = this.ctx!.currentTime;

    // Start playing immediately (silently)
    source.start(0);

    // Fade in the new sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + this.fadeTime);

    // Fade out the old sound if it exists
    if (this.activeGain && this.activeSource) {
      const oldGain = this.activeGain;
      const oldSource = this.activeSource;
      
      oldGain.gain.cancelScheduledValues(now);
      // Grab current gain value to smoothly fade from exactly where it is
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + this.fadeTime);
      
      // Stop the old source after the fade completes to save CPU
      oldSource.stop(now + this.fadeTime);
    }

    // Update active references
    this.activeSource = source;
    this.activeGain = gainNode;
    this.activeKey = key;
    this.activeOctave = octave;
  }

  /**
   * Update the octave. If currently playing, crossfade to the new octave of the same key.
   */
  public async setOctave(octave: number) {
    if (this.activeKey && this.activeOctave !== octave) {
      // Crossfade to the same key but new octave
      await this.play(this.activeKey, octave);
    }
  }

  /**
   * Smoothly fade out the currently playing sound and stop it.
   */
  public stop() {
    if (!this.activeGain || !this.activeSource || !this.ctx) return;

    const now = this.ctx.currentTime;
    const gain = this.activeGain;
    const source = this.activeSource;

    // Smoothly fade out the volume to 0 over 1.5 seconds
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + this.fadeTime);

    // Tell the audio source to stop playing once the fade finishes
    source.stop(now + this.fadeTime);

    this.activeSource = null;
    this.activeGain = null;
    this.activeKey = null;

    // If the app is in the background when the user stops the audio, start the 2-minute suspension countdown
    if (typeof document !== 'undefined' && document.hidden) {
      this.scheduleSuspension();
    }
  }

  /**
   * Returns an array of keys that currently have audio buffers loaded
   */
  public getLoadedKeys(): string[] {
    return Object.keys(this.buffers);
  }

  /**
   * Clears all currently active buffers (used when switching presets)
   */
  public clearBuffers(): void {
    this.buffers = {};
  }
}

export const audioEngine = new AudioEngine();
