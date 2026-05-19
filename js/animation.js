import { COLORS, ANIMATIONS, DENSITY_OPTIONS } from './config.js';

export function createImageCarousel(images, duration) {
  const carouselContainer = document.querySelector('.carousel-container');
  if (!carouselContainer) return;

  carouselContainer.innerHTML = '';

  images.forEach((src, index) => {
    const item = document.createElement('div');
    item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
    item.style.backgroundImage = `url(${src})`;
    carouselContainer.appendChild(item);
  });

  if (images.length > 1) {
    let currentIndex = 0;
    const items = document.querySelectorAll('.carousel-item');
    const interval = (8 - duration) * 1000 + 3000;

    if (window.carouselInterval) clearInterval(window.carouselInterval);

    window.carouselInterval = setInterval(() => {
      items[currentIndex].classList.remove('active');
      currentIndex = (currentIndex + 1) % items.length;
      items[currentIndex].classList.add('active');
    }, interval);
  }
}

export function startFloatAnimation(state) {
  if (window.floatInterval) clearInterval(window.floatInterval);

  if (state.floatTimer) {
    clearInterval(state.floatTimer);
    state.floatTimer = null;
  }

  const floatContainer = document.getElementById('float-container');
  if (!floatContainer) return;

  floatContainer.innerHTML = '';

  const displayTexts = state.floatTexts.map(text => {
    return text.replace(/{name}/g, state.friendName || '亲爱的');
  });

  const densityConfig = DENSITY_OPTIONS.find(d => d.value === state.density) || DENSITY_OPTIONS[1];
  const batchSize = densityConfig.batchSize;
  const batchInterval = densityConfig.interval;
  const perFloatDelay = 100;

  for (let i = 0; i < 10; i++) {
    const randomText = displayTexts[Math.floor(Math.random() * displayTexts.length)];
    createFloatText(randomText, state);
  }

  state.floatTimer = setInterval(() => {
    for (let i = 0; i < batchSize; i++) {
      setTimeout(() => {
        const randomText = displayTexts[Math.floor(Math.random() * displayTexts.length)];
        createFloatText(randomText, state);
      }, i * perFloatDelay);
    }
  }, batchInterval);

  return state.floatTimer;
}

export function createFloatText(text, state) {
  const container = document.getElementById('float-container');
  if (!container) return;

  const floatEl = document.createElement('div');
  floatEl.className = 'absolute whitespace-nowrap px-4 py-2 rounded-full shadow-lg';

  const animationConfig = ANIMATIONS.find(a => a.value === state.selectedAnimation) || ANIMATIONS[0];
  floatEl.classList.add(animationConfig.class);

  if (state.selectedColor === 'random') {
    const colorOptions = COLORS.filter(c => c.value !== 'random');
    const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    floatEl.classList.add(randomColor.value);
  } else {
    floatEl.classList.add(state.selectedColor);
  }

  floatEl.textContent = text;
  floatEl.style.left = `${Math.random() * 90 + 5}%`;
  floatEl.style.fontSize = `${Math.random() * 6 + 12}px`;
  floatEl.style.opacity = '0';
  floatEl.style.zIndex = '30';

  const xOffset = (Math.random() - 0.5) * 100;
  floatEl.style.setProperty('--x-offset', xOffset);

  const duration = Math.random() * 2 + 10;
  floatEl.style.animationDuration = `${duration}s`;

  container.appendChild(floatEl);

  setTimeout(() => {
    if (floatEl.parentNode) {
      floatEl.style.opacity = '0';
      floatEl.style.transition = 'opacity 0.5s';
      setTimeout(() => floatEl.remove(), 500);
    }
  }, duration * 1000);
}

export function stopFloatAnimation() {
  if (window.floatInterval) clearInterval(window.floatInterval);
  if (window.carouselInterval) clearInterval(window.carouselInterval);
}

export function createAutoPlayGuide(friendName) {
  const guide = document.createElement('div');
  guide.className = 'auto-play-guide';
  guide.innerHTML = `
    <h3 class="text-2xl mb-4">准备好了吗？</h3>
    <p class="mb-2">即将开始播放为 ${friendName} 准备的祝福</p>
    <button class="auto-play-btn" id="start-shared-play">开始观看</button>
  `;

  const playArea = document.getElementById('play-area');
  if (playArea) {
    playArea.appendChild(guide);
  }

  return new Promise(resolve => {
    document.getElementById('start-shared-play').addEventListener('click', () => {
      guide.remove();
      resolve();
    });
  });
}