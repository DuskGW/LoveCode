export const BACKEND_CONFIG = {
  API_BASE: '/backend',
  MAX_RETRY: 3,
  TIMEOUT: 15000,
  COMPRESS_IMAGES: true
};

export const DEFAULT_CONFIG = {
  isFriend: false,
  friendName: '亲爱的',
  images: [],
  selectedColor: 'random',
  selectedAnimation: 'float',
  duration: 4,
  floatTexts: [],
  density: 'medium',
  uploadedFileHashes: []
};

export const COLORS = [
  { name: '樱花粉', value: 'pastel-pink', color: '#FFB7C5' },
  { name: '玫瑰红', value: 'rose-red', color: '#FF6B9D' },
  { name: '薄荷绿', value: 'pastel-green', color: '#98FB98' },
  { name: '天空蓝', value: 'pastel-blue', color: '#87CEEB' },
  { name: '薰衣草紫', value: 'pastel-purple', color: '#E6E6FA' },
  { name: '柠檬黄', value: 'pastel-yellow', color: '#FFFACD' },
  { name: '随机颜色', value: 'random', color: 'linear-gradient(45deg, #FFB7C5, #FF6B9D, #FF7F7F, #FFB347, #98FB98, #7CCD7C, #87CEEB, #DDA0DD, #E6E6FA, #FFFACD)' }
];

export const ANIMATIONS = [
  { name: '飘升', value: 'float', class: 'float-animation' },
  { name: '飘落', value: 'fall', class: 'float-fall' }
];

export const DENSITY_OPTIONS = [
  { name: '稀疏', value: 'low', batchSize: 2, interval: 1000 },
  { name: '适中', value: 'medium', batchSize: 5, interval: 500 },
  { name: '密集', value: 'high', batchSize: 8, interval: 300 }
];