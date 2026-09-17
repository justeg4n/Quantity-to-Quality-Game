import Phaser from 'phaser';
import { C, FONT, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { PHYSICAL_KEYS } from '../data/balance';
import { EXERCISES } from '../data/exercises';
import { generateTextures } from '../gfx/Textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }

  preload(): void {
    const bar = this.add.graphics();
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'ĐANG TẢI WHEYSTATION & ATHENS...', {
      fontFamily: FONT,
      fontSize: '26px',
      color: C.cream,
    }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(C.borderHex, 1);
      bar.fillRect(GAME_WIDTH / 2 - 202, GAME_HEIGHT / 2 - 2, 404, 28);
      bar.fillStyle(C.panel, 1);
      bar.fillRect(GAME_WIDTH / 2 - 198, GAME_HEIGHT / 2 + 2, 396, 20);
      bar.fillStyle(C.goldHex, 1);
      bar.fillRect(GAME_WIDTH / 2 - 198, GAME_HEIGHT / 2 + 2, 396 * v, 20);
    });
    this.load.on('complete', () => label.setText('SẴN SÀNG'));

    // Video demo bài tập (đã xử lý bằng scripts/process-videos.sh)
    for (const k of PHYSICAL_KEYS) {
      const ex = EXERCISES[k];
      this.load.video(`vid-${k}`, ex.videoPath, true);
      this.load.image(`poster-${k}`, ex.posterPath);
    }
  }

  async create(): Promise<void> {
    generateTextures(this);
    try {
      await document.fonts.load(`22px ${FONT}`);
    } catch {
      /* font fallback */
    }
    document.getElementById('loading')?.remove();
    this.scene.start(SCENE.title);
  }
}
