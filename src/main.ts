import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH } from './config/constants';
import { AthensScene } from './scenes/AthensScene';
import { BootScene } from './scenes/BootScene';
import { BossScene } from './scenes/BossScene';
import { DayEndScene } from './scenes/DayEndScene';
import { EndingScene } from './scenes/EndingScene';
import { ExerciseScene } from './scenes/ExerciseScene';
import { GymScene } from './scenes/GymScene';
import { PauseScene } from './scenes/PauseScene';
import { QuizScene } from './scenes/QuizScene';
import { TitleScene } from './scenes/TitleScene';
import { TownScene } from './scenes/TownScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: C.bg,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, TownScene, GymScene, ExerciseScene, AthensScene, QuizScene, DayEndScene, BossScene, EndingScene, PauseScene],
};

const phaserGame = new Phaser.Game(config);

// Hook debug khi chạy dev (npm run dev): window.__q2q.state / window.__q2q.game
if (import.meta.env.DEV) {
  import('./systems/GameState').then(({ game }) => {
    (window as unknown as { __q2q: unknown }).__q2q = { game: phaserGame, state: game };
  });
}
