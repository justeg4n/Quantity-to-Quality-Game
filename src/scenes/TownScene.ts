import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_LABEL, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { ensureAvatar, type Pose } from '../gfx/Avatar';
import { SkyLayer, timeFromPoints } from '../gfx/Sky';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { Button, PointsHud, StatBar, modal, txt } from '../ui/Widgets';

const HORIZON = 330;
const WALK_Y_MIN = 400;
const WALK_Y_MAX = 480;
const GYM_DOOR_X = 160;
const ATHENS_DOOR_X = 800;

export class TownScene extends Phaser.Scene {
  private sky!: SkyLayer;
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: PointsHud;
  private prompt!: Phaser.GameObjects.Text;
  private walkTimer = 0;
  private walkFrame: Pose = 'idle';
  private target: { x: number; y: number; enter?: 'gym' | 'athens' } | null = null;
  private entering = false;
  private endDayBtn: Button | null = null;
  private lampLights: Phaser.GameObjects.Image[] = [];

  constructor() {
    super(SCENE.town);
  }

  create(data: { from?: 'gym' | 'athens' }): void {
    enablePause(this);
    this.entering = false;
    this.target = null;
    this.sky = new SkyLayer(this, HORIZON);
    this.sky.set(timeFromPoints(game.pointsLeft, BALANCE.pointsPerDay));

    // ─── Nền ───
    this.add.tileSprite(0, HORIZON, GAME_WIDTH, GAME_HEIGHT - HORIZON, 'tile-ground').setOrigin(0).setDepth(-50);
    this.add.tileSprite(0, WALK_Y_MIN - 10, GAME_WIDTH, WALK_Y_MAX - WALK_Y_MIN + 40, 'tile-plaza').setOrigin(0).setDepth(-49);
    this.add.tileSprite(GYM_DOOR_X - 40, HORIZON + 10, 80, WALK_Y_MIN - HORIZON, 'tile-road').setOrigin(0).setDepth(-48);
    this.add.tileSprite(ATHENS_DOOR_X - 40, HORIZON + 10, 80, WALK_Y_MIN - HORIZON, 'tile-road').setOrigin(0).setDepth(-48);

    // ─── Toà nhà ───
    const gym = this.add.image(GYM_DOOR_X, HORIZON + 12, 'bld-gym').setOrigin(0.5, 1).setDepth(-40).setInteractive({ useHandCursor: true });
    const athens = this.add.image(ATHENS_DOOR_X, HORIZON + 12, 'bld-athens').setOrigin(0.5, 1).setDepth(-40).setInteractive({ useHandCursor: true });
    txt(this, GYM_DOOR_X + 18, HORIZON - 116, 'WHEYSTATION', 20, C.white).setOrigin(0.5).setDepth(-39);
    txt(this, ATHENS_DOOR_X, HORIZON - 150, 'ATHENS', 20, C.dark).setOrigin(0.5).setDepth(-39);
    txt(this, GYM_DOOR_X, HORIZON + 18, '▲ GYM', 18, C.cream, { stroke: '#0b0716', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(-39);
    txt(this, ATHENS_DOOR_X, HORIZON + 18, '▲ HỌC', 18, C.cream, { stroke: '#0b0716', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(-39);
    gym.on('pointerup', () => this.goTo(GYM_DOOR_X, WALK_Y_MIN, 'gym'));
    athens.on('pointerup', () => this.goTo(ATHENS_DOOR_X, WALK_Y_MIN, 'athens'));

    // ─── Trang trí ───
    this.add.image(40, HORIZON + 8, 'tree').setOrigin(0.5, 1).setDepth(-41);
    this.add.image(GAME_WIDTH - 40, HORIZON + 8, 'tree').setOrigin(0.5, 1).setDepth(-41);
    this.add.image(GAME_WIDTH / 2, HORIZON - 4, 'tree').setOrigin(0.5, 1).setDepth(-41).setScale(1.2);
    this.add.image(300, HORIZON + 30, 'bush').setOrigin(0.5, 1).setDepth(-41);
    this.add.image(660, HORIZON + 30, 'bush').setOrigin(0.5, 1).setDepth(-41);
    for (const lx of [330, 630]) {
      this.add.image(lx, WALK_Y_MIN + 6, 'lamp').setOrigin(0.5, 1).setDepth(-30);
      const light = this.add.image(lx, WALK_Y_MIN - 52, 'sun').setScale(2).setAlpha(0).setDepth(-31).setTint(0xffd166);
      this.lampLights.push(light);
    }
    // mây trôi
    for (let i = 0; i < 3; i++) {
      const c = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), 40 + i * 50, 'cloud').setDepth(-97).setAlpha(0.85);
      this.tweens.add({ targets: c, x: c.x + GAME_WIDTH + 100, duration: Phaser.Math.Between(40000, 70000), repeat: -1, onRepeat: () => (c.x = -80) });
    }

    // ─── Nhân vật ───
    const startX = data?.from === 'gym' ? GYM_DOOR_X : data?.from === 'athens' ? ATHENS_DOOR_X : GAME_WIDTH / 2;
    this.player = this.add.image(startX, WALK_Y_MIN + 20, ensureAvatar(this, game.stats.stats, 'idle', 2)).setOrigin(0.5, 1).setDepth(10);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture('SPACE');
    this.input.keyboard!.on('keydown-SPACE', () => this.tryEnter());
    this.input.keyboard!.on('keydown-E', () => this.tryEnter());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      if (p.y > HORIZON) this.goTo(Phaser.Math.Clamp(p.x, 40, GAME_WIDTH - 40), Phaser.Math.Clamp(p.y, WALK_Y_MIN, WALK_Y_MAX));
    });

    // ─── HUD ───
    this.hud = new PointsHud(this, 16, 12, BALANCE.pointsPerDay);
    this.hud.set(game.day.currentDay, game.pointsLeft, BALANCE.totalDays);
    const weatherLabel = { sun: '☀ Nắng', rain: '☂ Mưa nhẹ', wind: '≋ Gió' }[game.day.weather];
    txt(this, 16, 40, weatherLabel, 20, C.cream, { stroke: '#0b0716', strokeThickness: 4 }).setDepth(80);
    this.add.image(120, 52, 'icon-laurel').setDepth(80).setVisible(game.day.philosopherBadge);
    if (game.day.philosopherBadge) txt(this, 136, 42, 'Triết gia', 18, C.green, { stroke: '#0b0716', strokeThickness: 3 }).setDepth(80);
    new Button(this, GAME_WIDTH - 90, 30, 'CHỈ SỐ', () => this.showStats(), { w: 150, h: 40, size: 20 });
    if (game.newGamePlus > 0) txt(this, GAME_WIDTH - 170, 16, `NG+${game.newGamePlus}`, 20, C.gold, { stroke: '#0b0716', strokeThickness: 3 }).setOrigin(1, 0).setDepth(80);
    this.prompt = txt(this, GAME_WIDTH / 2, WALK_Y_MIN - 46, '', 22, C.gold, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5).setDepth(80);

    this.setupWeather();

    // Hết điểm => kết thúc ngày
    if (game.pointsLeft === 0) {
      this.prompt.setText('Hết điểm đầu ngày — mặt trời sắp lặn...');
      this.endDayBtn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, game.isLastDay() ? 'KẾT THÚC NGÀY 10 ▶' : 'KẾT THÚC NGÀY ▶', () => this.endDay(), {
        w: 280,
        h: 50,
        fill: C.orangeHex,
      });
      this.tweens.add({ targets: this.endDayBtn, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });
      this.time.delayedCall(4000, () => { if (this.scene.isActive() && !this.entering) this.endDay(); });
    } else {
      this.prompt.setText(`Còn ${game.pointsLeft} điểm — đi vào WheyStation (trái) hoặc Athens (phải)`);
    }

    this.cameras.main.fadeIn(400, 0, 0, 0);
    Sfx.playBgm('town', 132);
  }

  private setupWeather(): void {
    const w = game.day.weather;
    if (w === 'rain') {
      this.add.particles(0, 0, 'drop', {
        x: { min: 0, max: GAME_WIDTH },
        y: -10,
        lifespan: 1400,
        speedY: { min: 300, max: 420 },
        speedX: -40,
        quantity: 2,
        frequency: 40,
        alpha: { start: 0.9, end: 0.3 },
      }).setDepth(60);
    } else if (w === 'wind') {
      this.add.particles(0, 0, 'leaf', {
        x: -10,
        y: { min: 100, max: GAME_HEIGHT - 60 },
        lifespan: 4000,
        speedX: { min: 160, max: 260 },
        speedY: { min: -30, max: 30 },
        rotate: { start: 0, end: 360 },
        quantity: 1,
        frequency: 250,
      }).setDepth(60);
    } else {
      this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: HORIZON },
        lifespan: 1500,
        alpha: { start: 0.8, end: 0 },
        scale: { start: 1, end: 0.2 },
        quantity: 1,
        frequency: 500,
      }).setDepth(-60);
    }
  }

  update(_t: number, delta: number): void {
    if (this.entering) return;
    const speed = 0.22 * delta;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    if (dx !== 0 || dy !== 0) this.target = null;
    if (this.target) {
      const tx = this.target.x - this.player.x;
      const ty = this.target.y - this.player.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 4) {
        const enter = this.target.enter;
        this.target = null;
        if (enter) this.enter(enter);
      } else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }
    if (dx !== 0 || dy !== 0) {
      this.player.x = Phaser.Math.Clamp(this.player.x + dx * speed, 40, GAME_WIDTH - 40);
      this.player.y = Phaser.Math.Clamp(this.player.y + dy * speed, WALK_Y_MIN, WALK_Y_MAX + 20);
      if (dx !== 0) this.player.setFlipX(dx < 0);
      this.walkTimer += delta;
      if (this.walkTimer > 160) {
        this.walkTimer = 0;
        this.walkFrame = this.walkFrame === 'walk1' ? 'walk2' : 'walk1';
        this.player.setTexture(ensureAvatar(this, game.stats.stats, this.walkFrame, 2));
        Sfx.step();
      }
    } else if (this.walkFrame !== 'idle') {
      this.walkFrame = 'idle';
      this.player.setTexture(ensureAvatar(this, game.stats.stats, 'idle', 2));
    }
    this.player.setDepth(10 + this.player.y / 100);

    // gợi ý vào cửa
    if (game.pointsLeft > 0) {
      const near = this.nearDoor();
      if (near === 'gym') this.prompt.setText('SPACE / E: vào WHEYSTATION  (−1 điểm mỗi bài tập)');
      else if (near === 'athens') this.prompt.setText('SPACE / E: vào ATHENS  (−1 điểm mỗi lượt học)');
      else this.prompt.setText(`Còn ${game.pointsLeft} điểm — đi tới cửa WheyStation (trái) hoặc Athens (phải)`);
    }
  }

  private nearDoor(): 'gym' | 'athens' | null {
    if (this.player.y > WALK_Y_MIN + 40) return null;
    if (Math.abs(this.player.x - GYM_DOOR_X) < 70) return 'gym';
    if (Math.abs(this.player.x - ATHENS_DOOR_X) < 70) return 'athens';
    return null;
  }

  private goTo(x: number, y: number, enter?: 'gym' | 'athens'): void {
    if (enter && game.pointsLeft === 0) {
      this.prompt.setText('Hết điểm rồi — hãy kết thúc ngày!');
      return;
    }
    this.target = { x, y, enter };
  }

  private tryEnter(): void {
    const near = this.nearDoor();
    if (near) this.enter(near);
  }

  private enter(which: 'gym' | 'athens'): void {
    if (this.entering) return;
    if (game.pointsLeft === 0) {
      this.prompt.setText('Hết điểm rồi — hãy kết thúc ngày!');
      return;
    }
    this.entering = true;
    Sfx.door();
    this.tweens.add({ targets: this.player, y: this.player.y - 30, alpha: 0, duration: 350 });
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(which === 'gym' ? SCENE.gym : SCENE.athens));
  }

  private endDay(): void {
    if (this.entering) return;
    this.entering = true;
    this.endDayBtn?.setEnabled(false);
    Sfx.stopBgm();
    Sfx.dayEnd();
    // nhân vật đi ra giữa quảng trường, đèn bật, trời tối dần
    this.tweens.add({ targets: this.player, x: GAME_WIDTH / 2, y: WALK_Y_MIN + 30, duration: 900 });
    this.tweens.add({ targets: this.lampLights, alpha: 0.35, duration: 1200, delay: 400 });
    this.tweens.addCounter({
      from: 0.66,
      to: 1,
      duration: 1600,
      onUpdate: (tw) => this.sky.set(tw.getValue() ?? 1),
      onComplete: () => this.scene.start(SCENE.dayEnd),
    });
  }

  private showStats(): void {
    const m = modal(this, 720, 440);
    m.root.add(txt(this, 0, -195, 'CHỈ SỐ NHÂN VẬT', 30, C.gold).setOrigin(0.5));
    m.root.add(txt(this, -330, -150, 'THỂ CHẤT (WheyStation)', 22, C.orange));
    m.root.add(txt(this, 20, -150, 'KIẾN THỨC (Athens)', 22, C.sky));
    PHYSICAL_KEYS.forEach((k, i) => {
      m.root.add(new StatBar(this, -330, -110 + i * 36, PHYSICAL_LABEL[k], game.stats.physical(k), 0, C.orangeHex, 260));
    });
    KNOWLEDGE_KEYS.forEach((k, i) => {
      m.root.add(new StatBar(this, 20, -110 + i * 36, KNOWLEDGE_LABEL[k].length > 10 ? KNOWLEDGE_LABEL[k].slice(0, 9) + '.' : KNOWLEDGE_LABEL[k], game.stats.knowledge(k), 0, C.skyHex, 260));
    });
    m.root.add(txt(this, 0, 125, 'Thử thách cuối sẽ dùng đến tất cả 12 chỉ số. Tích luỹ bao nhiêu là đủ — hãy tự khám phá!', 18, C.cream).setOrigin(0.5));
    m.root.add(txt(this, 0, 150, `Tổng đã dùng: Gym ${game.totalGym} · Học ${game.totalStudy} · Combo bonus: ${Math.floor(game.comboCount / BALANCE.combosPerBonus)}`, 18, C.gray).setOrigin(0.5));
    m.root.add(new Button(this, 0, 190, 'ĐÓNG', () => m.close(), { w: 180, h: 42, size: 20 }));
  }
}
