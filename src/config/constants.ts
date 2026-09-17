export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const FONT = 'VT323';

/** Bảng màu pixel-art dùng chung toàn game */
export const C = {
  bg: 0x0b0716,
  panel: 0x1a1030,
  panelLight: 0x2a1d4a,
  borderHex: 0xf6d8a8,
  cream: '#f6d8a8',
  white: '#ffffff',
  gold: '#ffd166',
  goldHex: 0xffd166,
  red: '#ef476f',
  redHex: 0xef476f,
  green: '#06d6a0',
  greenHex: 0x06d6a0,
  blue: '#118ab2',
  blueHex: 0x118ab2,
  sky: '#7ec8e3',
  skyHex: 0x7ec8e3,
  purple: '#9b5de5',
  purpleHex: 0x9b5de5,
  orange: '#ff8c42',
  orangeHex: 0xff8c42,
  gray: '#8d99ae',
  grayHex: 0x8d99ae,
  dark: '#0b0716',
} as const;

export const SCENE = {
  boot: 'BootScene',
  title: 'TitleScene',
  town: 'TownScene',
  gym: 'GymScene',
  exercise: 'ExerciseScene',
  athens: 'AthensScene',
  quiz: 'QuizScene',
  dayEnd: 'DayEndScene',
  boss: 'BossScene',
  ending: 'EndingScene',
} as const;
