import Phaser from 'phaser';
import { px, pixelTexture } from './Pixel';

const SKIN = 0xf1c27d;
const SKIN_D = 0xc68642;

/** Sinh toàn bộ texture pixel-art tĩnh của game (gọi 1 lần trong BootScene) */
export function generateTextures(scene: Phaser.Scene): void {
  // ───────── NPC: Huấn luyện viên ─────────
  pixelTexture(
    scene,
    'npc-trainer',
    [
      '....cccc....',
      '...cccccc...',
      '..ccccccccc.',
      '...ssssss...',
      '...seSSes...',
      '...ssssss...',
      '...sSmmSs...',
      '....ssss....',
      '..rrrrrrrr..',
      '.rrrrrrrrrr.',
      'ssrrrrrrrrss',
      'ssrrryyrrrss',
      'ss.rrrrrr.ss',
      '...rrrrrr...',
      '...bbbbbb...',
      '...bb..bb...',
      '...ss..ss...',
      '...ss..ss...',
      '..kkk..kkk..',
    ],
    { c: 0x1d3557, s: SKIN, S: SKIN_D, e: 0x222222, m: 0x8b3a3a, r: 0xe63946, y: 0xffd166, b: 0x222b45, k: 0x111111 },
    3,
  );

  // ───────── NPC: Giáo sư ─────────
  pixelTexture(
    scene,
    'npc-professor',
    [
      '....wwww....',
      '...wssssw...',
      '...ssssss...',
      '...seSSes...',
      '...ssssss...',
      '...wwwwww...',
      '..wwwwwwww..',
      '...wwwwww...',
      '..tttttttt..',
      '.tttgggtttt.',
      'sstttgtttsss',
      'ss.ttttttBBs',
      '...tttttt.B.',
      '...tttttt.B.',
      '...tttttt.B.',
      '...tt..tt.B.',
      '...tt..tt...',
      '...ss..ss...',
      '..kkk..kkk..',
    ],
    { w: 0xf0f0f0, s: SKIN, S: SKIN_D, e: 0x222222, t: 0xe9e4d4, g: 0xffd166, B: 0x8b5a2b, k: 0x5c4033 },
    3,
  );

  // ───────── Icons ─────────
  pixelTexture(
    scene,
    'icon-hourglass',
    ['bbbbbbbb', '.gggggg.', '.gggggg.', '..gggg..', '...gg...', '..g..g..', '.g....g.', '.gggggg.', 'bbbbbbbb'],
    { b: 0x8b5a2b, g: 0xffd166 },
    3,
  );
  pixelTexture(
    scene,
    'icon-hourglass-empty',
    ['bbbbbbbb', '.g....g.', '.g....g.', '..g..g..', '...gg...', '..g..g..', '.g....g.', '.g....g.', 'bbbbbbbb'],
    { b: 0x8b5a2b, g: 0x5a4a6a },
    3,
  );
  pixelTexture(
    scene,
    'icon-dumbbell',
    ['.k....k.', 'kk....kk', 'kkkkkkkk', 'kk....kk', '.k....k.'],
    { k: 0xf6d8a8 },
    3,
  );
  pixelTexture(
    scene,
    'icon-book',
    ['bbbbbbbb', 'bwwwwwwb', 'bwbbbbwb', 'bwwwwwwb', 'bwbbbbwb', 'bwwwwwwb', 'bbbbbbbb'],
    { b: 0x118ab2, w: 0xf6d8a8 },
    3,
  );
  pixelTexture(
    scene,
    'icon-laurel',
    ['..g..g..', '.g.gg.g.', 'g..gg..g', 'g..gg..g', '.g.gg.g.', '..gggg..'],
    { g: 0x06d6a0 },
    3,
  );
  pixelTexture(scene, 'icon-star', ['..y..', '.yyy.', 'yyyyy', '.yyy.', 'y...y'], { y: 0xffd166 }, 2);
  pixelTexture(scene, 'icon-heart', ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], { r: 0xef476f }, 3);
  pixelTexture(scene, 'icon-check', ['....g', '...g.', 'g.g..', '.g...'], { g: 0x06d6a0 }, 3);
  pixelTexture(scene, 'icon-cross', ['r...r', '.r.r.', '..r..', '.r.r.', 'r...r'], { r: 0xef476f }, 3);
  pixelTexture(scene, 'icon-lock', ['.ggg.', 'g...g', 'ggggg', 'gggog', 'ggggg'], { g: 0x8d99ae, o: 0x222222 }, 3);
  pixelTexture(scene, 'icon-badge', ['.yyy.', 'yyyyy', 'yyyyy', '.yyy.', '.r.r.', 'r...r'], { y: 0xffd166, r: 0xef476f }, 3);

  // ───────── Bầu trời ─────────
  pixelTexture(
    scene,
    'sun',
    ['...yyyy...', '..yyyyyy..', '.yyyyyyyy.', 'yyyyyyyyyy', 'yyyyyyyyyy', 'yyyyyyyyyy', 'yyyyyyyyyy', '.yyyyyyyy.', '..yyyyyy..', '...yyyy...'],
    { y: 0xffd166 },
    4,
  );
  pixelTexture(
    scene,
    'moon',
    ['...wwww...', '..wwwwww..', '.wwwwwwww.', 'wwwwwwww..', 'wwwwwww...', 'wwwwwww...', 'wwwwwwww..', '.wwwwwwww.', '..wwwwww..', '...wwww...'],
    { w: 0xfdf6e3 },
    4,
  );
  pixelTexture(scene, 'star', ['w'], { w: 0xffffff }, 2);
  pixelTexture(
    scene,
    'cloud',
    ['....wwww......', '..wwwwwwww....', '.wwwwwwwwwww..', 'wwwwwwwwwwwwww', 'wwwwwwwwwwwwww', '.wwwwwwwwwwww.'],
    { w: 0xffffff },
    4,
  );

  // ───────── Quảng trường ─────────
  pixelTexture(
    scene,
    'lamp',
    ['.yyy.', 'yyyyy', 'yyyyy', '.kkk.', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '.kkk.', 'kkkkk'],
    { y: 0xffd166, k: 0x2b2b2b },
    4,
  );
  pixelTexture(
    scene,
    'tree',
    ['....gggg....', '..gggggggg..', '.gGgggggGgg.', 'gggggGgggggg', 'ggGggggggGgg', '.gggggggggg.', '..ggGggggg..', '....bbbb....', '....bbbb....', '....bbbb....', '...bbbbbb...'],
    { g: 0x2d6a4f, G: 0x40916c, b: 0x6f4e37 },
    4,
  );
  pixelTexture(scene, 'bush', ['..gggg..', '.gGgggg.', 'ggggGggg', '.gggggg.'], { g: 0x2d6a4f, G: 0x52b788 }, 4);
  pixelTexture(scene, 'drop', ['b', 'b', 'B'], { b: 0x9ad0ec, B: 0xffffff }, 2);
  pixelTexture(scene, 'leaf', ['.g', 'gg', 'g.'], { g: 0xa7c957 }, 2);
  pixelTexture(scene, 'spark', ['y'], { y: 0xffd166 }, 3);
  pixelTexture(scene, 'sweat', ['b', 'B'], { b: 0x9ad0ec, B: 0xffffff }, 2);

  // Gạch nền
  pixelTexture(
    scene,
    'tile-ground',
    ['gggggggg', 'gGgggggg', 'gggggGgg', 'gggggggg', 'ggGggggg', 'gggggggG', 'gggggggg', 'gggGgggg'],
    { g: 0x6a994e, G: 0x7fb069 },
    4,
  );
  pixelTexture(
    scene,
    'tile-road',
    ['rrrrrrrr', 'rrrrRrrr', 'rrrrrrrr', 'Rrrrrrrr', 'rrrrrrrr', 'rrrrrrRr', 'rrRrrrrr', 'rrrrrrrr'],
    { r: 0x8d8d8d, R: 0x9e9e9e },
    4,
  );
  pixelTexture(
    scene,
    'tile-plaza',
    ['pppppppP', 'ppppppPP', 'pppppppP', 'PPPPPPPP', 'pppPpppp', 'ppPPpppp', 'pppPpppp', 'PPPPPPPP'],
    { p: 0xc9b79c, P: 0xb5a184 },
    4,
  );
  pixelTexture(
    scene,
    'tile-gymfloor',
    ['kkkkkkkk', 'kKkkkkkk', 'kkkkkkkk', 'kkkkkKkk', 'kkkkkkkk', 'kkKkkkkk', 'kkkkkkkk', 'kkkkkkKk'],
    { k: 0x2b2d42, K: 0x3a3d5c },
    4,
  );
  pixelTexture(
    scene,
    'tile-marble',
    ['wwwwwwww', 'wWwwwwww', 'wwwwwWww', 'wwwwwwww', 'wwWwwwww', 'wwwwwwwW', 'wwwwwwww', 'wwwWwwww'],
    { w: 0xe9e4d4, W: 0xd6d0bd },
    4,
  );

  // ───────── Máy tập (6) ─────────
  const M = { m: 0x8d99ae, d: 0x495057, r: 0xe63946, k: 0x212529, y: 0xffd166 };
  pixelTexture(
    scene,
    'machine-nguc',
    ['d..........d', 'dm........md', 'dm..kkkk..md', 'dm.kkkkkk.md', 'dm.kkrrkk.md', 'dm..kkkk..md', 'dm........md', 'dmmmmmmmmmmd', 'd....dd....d', 'd....dd....d', 'dddddddddddd'],
    M,
    4,
  );
  pixelTexture(
    scene,
    'machine-vai',
    ['..m......m..', '..m......m..', 'mmmm....mmmm', '..d......d..', '..d......d..', '..d.rrrr.d..', '..d.rrrr.d..', '..d.kkkk.d..', '..ddkkkkdd..', '....dddd....', 'dddddddddddd'],
    M,
    4,
  );
  pixelTexture(
    scene,
    'machine-lung',
    ['mmmmmmmmmmmm', 'm....dd....m', 'm....dd....m', 'm...mmmm...m', 'm..........m', 'm..rrrrrr..m', 'm..rrrrrr..m', 'm...kkkk...m', 'm...kkkk...m', 'm....dd....m', 'dddddddddddd'],
    M,
    4,
  );
  pixelTexture(
    scene,
    'machine-tay',
    ['............', '.kk......kk.', 'kkkkmmmmkkkk', '.kk......kk.', '............', '....rrrr....', '...rrrrrr...', '...rrrrrr...', '....dddd....', '....dddd....', 'dddddddddddd'],
    M,
    4,
  );
  pixelTexture(
    scene,
    'machine-bung',
    ['............', '............', '............', '..........m.', '.........mm.', 'rrrrrrrrrmm.', 'rrrrrrrrrmm.', 'dddddddddd..', 'd........d..', 'd........d..', 'dddddddddddd'],
    M,
    4,
  );
  pixelTexture(
    scene,
    'machine-chan',
    ['........kkkk', '.......kkkkk', '......kk..kk', '.....kk.....', '....dd......', '...rrrr.....', '..rrrrrr....', '.rrrrrrrr...', '.dddddddd...', '..dd..dd....', 'dddddddddddd'],
    M,
    4,
  );

  // ───────── Athens: góc học tập ─────────
  pixelTexture(
    scene,
    'desk',
    ['..bbbbbbbb..', '.bbbbbbbbbb.', 'wwwwwwwwwwww', 'wWWWWWWWWWWw', 'wwwwwwwwwwww', '.w........w.', '.w........w.', '.w........w.'],
    { b: 0x118ab2, w: 0x8b5a2b, W: 0xa5713a },
    4,
  );
  pixelTexture(
    scene,
    'scroll',
    ['pppppppp', 'p......p', 'p.gggg.p', 'p......p', 'p.gggg.p', 'p......p', 'pppppppp'],
    { p: 0xf6d8a8, g: 0x8b5a2b },
    3,
  );
  pixelTexture(
    scene,
    'column',
    ['wwwwwwww', 'wwwwwwww', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', '.wWwwWw.', 'wwwwwwww', 'wwwwwwww'],
    { w: 0xf0ede4, W: 0xcfc9b8 },
    4,
  );
  pixelTexture(
    scene,
    'bust',
    ['..wwww..', '.wwwwww.', '.wwwwww.', '..wwww..', '...ww...', '.wwwwww.', 'wwwwwwww', '.WWWWWW.', '.WWWWWW.'],
    { w: 0xf0ede4, W: 0xb5b0a0 },
    3,
  );

  buildGym(scene);
  buildAthens(scene);
  buildBoss(scene);
  buildTv(scene);
}

/** Toà nhà WheyStation (texture 'bld-gym', 240x180) */
function buildGym(scene: Phaser.Scene): void {
  if (scene.textures.exists('bld-gym')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const u = 4;
  // thân nhà
  px(g, 0x2b2d42, 0, 6, 60, 39, u);
  px(g, 0x3a3d5c, 1, 7, 58, 37, u);
  // mái
  px(g, 0x1d3557, 0, 2, 60, 5, u);
  px(g, 0x457b9d, 2, 0, 56, 3, u);
  // biển hiệu
  px(g, 0x111111, 8, 9, 44, 9, u);
  px(g, 0xe63946, 9, 10, 42, 7, u);
  // tạ đơn trên biển
  px(g, 0xf6d8a8, 12, 12, 2, 4, u);
  px(g, 0xf6d8a8, 14, 13, 6, 2, u);
  px(g, 0xf6d8a8, 20, 12, 2, 4, u);
  // cửa kính (mờ hơi)
  px(g, 0x8d99ae, 22, 24, 16, 21, u);
  px(g, 0xa8dadc, 23, 25, 14, 19, u);
  px(g, 0xcfeff0, 24, 26, 5, 6, u);
  px(g, 0x8d99ae, 29, 25, 2, 19, u);
  px(g, 0xf6d8a8, 27, 35, 1, 2, u);
  px(g, 0xf6d8a8, 32, 35, 1, 2, u);
  // cửa sổ
  for (const wx of [5, 44]) {
    px(g, 0x8d99ae, wx, 24, 11, 10, u);
    px(g, 0xa8dadc, wx + 1, 25, 9, 8, u);
    px(g, 0x8d99ae, wx + 5, 25, 1, 8, u);
  }
  // đèn treo
  px(g, 0xffd166, 4, 20, 2, 1, u);
  px(g, 0xffd166, 54, 20, 2, 1, u);
  g.generateTexture('bld-gym', 60 * u, 45 * u);
  g.destroy();
}

/** Toà nhà Athens (texture 'bld-athens', 240x180) */
function buildAthens(scene: Phaser.Scene): void {
  if (scene.textures.exists('bld-athens')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const u = 4;
  // bậc thang
  px(g, 0xcfc9b8, 0, 41, 60, 4, u);
  px(g, 0xe9e4d4, 2, 38, 56, 3, u);
  // nền + tường sau
  px(g, 0xd6d0bd, 4, 12, 52, 26, u);
  px(g, 0xe9e4d4, 6, 13, 48, 25, u);
  // cửa
  px(g, 0x6f4e37, 25, 22, 10, 16, u);
  px(g, 0x8b5a2b, 26, 23, 8, 15, u);
  px(g, 0xffd166, 32, 30, 1, 1, u);
  // cột
  for (const cx of [6, 17, 37, 48]) {
    px(g, 0xf0ede4, cx, 12, 6, 26, u);
    px(g, 0xcfc9b8, cx + 1, 14, 1, 22, u);
    px(g, 0xcfc9b8, cx + 4, 14, 1, 22, u);
    px(g, 0xf0ede4, cx - 1, 11, 8, 2, u);
    px(g, 0xf0ede4, cx - 1, 37, 8, 2, u);
  }
  // mái tam giác (pediment)
  px(g, 0xf0ede4, 2, 9, 56, 3, u);
  for (let i = 0; i < 9; i++) {
    px(g, 0xf0ede4, 2 + i * 3, 9 - i, 56 - i * 6, 1, u);
  }
  px(g, 0xffd166, 27, 5, 6, 3, u); // hoạ tiết vàng
  g.generateTexture('bld-athens', 60 * u, 45 * u);
  g.destroy();
}

/** Boss "Vòng xoáy biện chứng" — 3 texture theo pha */
function buildBoss(scene: Phaser.Scene): void {
  const variants: Array<[string, number, number, number]> = [
    ['boss-1', 0x9b5de5, 0x5a189a, 0x240046],
    ['boss-2', 0xef476f, 0x9d0208, 0x370617],
    ['boss-3', 0xffd166, 0xf48c06, 0x6a040f],
  ];
  for (const [key, c1, c2, c3] of variants) {
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    // vòng xoáy: các cung tròn lệch tâm
    for (let r = 96; r > 8; r -= 8) {
      const t = r / 96;
      const col = t > 0.66 ? c3 : t > 0.33 ? c2 : c1;
      g.fillStyle(col, 1);
      const ang = (96 - r) * 0.35;
      const ox = Math.cos(ang) * (96 - r) * 0.15;
      const oy = Math.sin(ang) * (96 - r) * 0.15;
      // vẽ "vòng" bằng các ô vuông pixel
      for (let a = 0; a < Math.PI * 2; a += 0.12) {
        const x = cx + ox + Math.cos(a + ang) * r;
        const y = cy + oy + Math.sin(a + ang) * r;
        g.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 6, 6);
      }
    }
    // mắt
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 34, cy - 12, 20, 20);
    g.fillRect(cx + 14, cy - 12, 20, 20);
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - 28, cy - 6, 10, 10);
    g.fillRect(cx + 18, cy - 6, 10, 10);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}

/** Khung TV/gương pixel-art cho video huấn luyện viên */
function buildTv(scene: Phaser.Scene): void {
  if (scene.textures.exists('tv-frame')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const w = 232;
  const h = 300;
  g.fillStyle(0x2b2d42, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x8d99ae, 1);
  g.fillRect(6, 6, w - 12, h - 12);
  g.fillStyle(0x111111, 1);
  g.fillRect(14, 14, w - 28, h - 52);
  // nút bấm & loa
  g.fillStyle(0xef476f, 1);
  g.fillRect(w - 40, h - 30, 10, 10);
  g.fillStyle(0x06d6a0, 1);
  g.fillRect(w - 26, h - 30, 10, 10);
  g.fillStyle(0x495057, 1);
  for (let i = 0; i < 6; i++) g.fillRect(20 + i * 12, h - 28, 6, 8);
  g.generateTexture('tv-frame', w, h);
  g.destroy();
}
