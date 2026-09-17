/**
 * Âm thanh chiptune tổng hợp bằng WebAudio — không cần file asset.
 * Gọi Sfx.unlock() trong một sự kiện input đầu tiên để trình duyệt cho phép phát.
 */
type Wave = OscillatorType;

class SfxImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmGain: GainNode | null = null;
  muted = false;
  private bgmStep = 0;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock(): void {
    const c = this.ensure();
    if (c && c.state === 'suspended') void c.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(freq: number, dur: number, type: Wave = 'square', vol = 0.5, slide = 0, delay = 0): void {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, delay = 0): void {
    const c = this.ensure();
    if (!c || !this.master) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    s.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(g);
    g.connect(this.master);
    s.start(c.currentTime + delay);
  }

  // ───── SFX ─────
  click(): void {
    this.tone(880, 0.05, 'square', 0.25);
  }
  hover(): void {
    this.tone(660, 0.03, 'square', 0.12);
  }
  rep(): void {
    this.tone(330, 0.08, 'square', 0.35, 120);
  }
  perfect(): void {
    this.tone(660, 0.07, 'square', 0.35);
    this.tone(990, 0.1, 'square', 0.35, 0, 0.07);
  }
  good(): void {
    this.tone(520, 0.08, 'square', 0.3);
  }
  bad(): void {
    this.tone(200, 0.15, 'sawtooth', 0.3, -80);
  }
  combo(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.35, 0, i * 0.07));
  }
  correct(): void {
    this.tone(784, 0.1, 'triangle', 0.4);
    this.tone(1046, 0.18, 'triangle', 0.4, 0, 0.1);
  }
  wrong(): void {
    this.tone(180, 0.25, 'sawtooth', 0.35, -60);
    this.noise(0.12, 0.15);
  }
  statUp(): void {
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.35, 0, i * 0.06));
  }
  door(): void {
    this.noise(0.15, 0.2);
    this.tone(220, 0.15, 'triangle', 0.25, 60);
  }
  step(): void {
    this.noise(0.03, 0.06);
  }
  dayEnd(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.3, 0, i * 0.25));
  }
  sunrise(): void {
    [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.3, 0, i * 0.2));
  }
  alarm(): void {
    for (let i = 0; i < 3; i++) this.tone(440, 0.15, 'square', 0.35, 0, i * 0.3);
  }
  bossHit(): void {
    this.noise(0.25, 0.35);
    this.tone(90, 0.3, 'sawtooth', 0.4, -40);
  }
  win(): void {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.35, 0, i * 0.13));
  }
  lose(): void {
    [392, 370, 349, 330].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.35, 0, i * 0.3));
  }

  // ───── BGM: arpeggio chiptune nhẹ, đổi tông theo "mood" ─────
  private readonly patterns: Record<string, number[]> = {
    town: [262, 330, 392, 523, 392, 330, 294, 349, 440, 349, 294, 262],
    gym: [220, 220, 330, 220, 262, 262, 392, 262, 196, 196, 294, 196],
    athens: [330, 392, 494, 659, 494, 392, 349, 440, 523, 440, 349, 330],
    night: [196, 247, 294, 247, 175, 220, 262, 220, 165, 208, 247, 208],
    boss: [147, 147, 175, 147, 131, 131, 156, 131, 147, 175, 196, 175],
    win: [523, 659, 784, 659, 587, 740, 880, 740, 523, 659, 784, 1046],
  };

  playBgm(name: keyof SfxImpl['patterns'], bpm = 140): void {
    this.stopBgm();
    const c = this.ensure();
    if (!c || !this.master) return;
    this.bgmGain = c.createGain();
    this.bgmGain.gain.value = 0.18;
    this.bgmGain.connect(this.master);
    const pat = this.patterns[name];
    const stepMs = 60000 / bpm / 2;
    this.bgmStep = 0;
    const tick = () => {
      if (!this.ctx || !this.bgmGain) return;
      const f = pat[this.bgmStep % pat.length];
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = name === 'boss' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.6, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + stepMs / 1000 * 0.9);
      o.connect(g);
      g.connect(this.bgmGain);
      o.start(t0);
      o.stop(t0 + stepMs / 1000);
      // bass mỗi 4 bước
      if (this.bgmStep % 4 === 0) {
        const b = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        b.type = 'square';
        b.frequency.value = f / 2;
        bg.gain.setValueAtTime(0.25, t0);
        bg.gain.exponentialRampToValueAtTime(0.001, t0 + stepMs / 1000 * 1.6);
        b.connect(bg);
        bg.connect(this.bgmGain);
        b.start(t0);
        b.stop(t0 + stepMs / 1000 * 2);
      }
      this.bgmStep++;
    };
    tick();
    this.bgmTimer = window.setInterval(tick, stepMs);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain) {
      try {
        this.bgmGain.disconnect();
      } catch {
        /* ignore */
      }
      this.bgmGain = null;
    }
  }
}

export const Sfx = new SfxImpl();
