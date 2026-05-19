export class ImageCompressor {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || 1200,
      maxHeight: options.maxHeight || 1200,
      initialQuality: options.initialQuality || 0.9,
      minQuality: options.minQuality || 0.5,
      maxSizeKB: options.maxSizeKB || 500,
      step: options.step || 0.1,
      ...options
    };
  }

  async compress(dataUrl, onProgress = null) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.compressImage(img, onProgress).then(resolve).catch(reject);
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      img.src = dataUrl;
    });
  }

  async compressImage(img, onProgress = null) {
    let width = img.width;
    let height = img.height;
    
    if (onProgress) onProgress(20);

    if (width > this.options.maxWidth || height > this.options.maxHeight) {
      const ratio = Math.min(this.options.maxWidth / width, this.options.maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    if (onProgress) onProgress(40);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, width, height);
    
    if (onProgress) onProgress(60);

    let quality = this.options.initialQuality;
    let compressedDataUrl = '';
    let attemptCount = 0;
    const maxAttempts = Math.floor((this.options.initialQuality - this.options.minQuality) / this.options.step) + 1;

    while (quality >= this.options.minQuality) {
      compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const sizeKB = (compressedDataUrl.length - 22) * 0.75 / 1024;

      if (sizeKB <= this.options.maxSizeKB) {
        break;
      }

      quality -= this.options.step;
      attemptCount++;

      if (onProgress) {
        const progress = 60 + Math.floor(40 * (attemptCount / maxAttempts));
        onProgress(Math.min(progress, 100));
      }
    }

    if (onProgress) onProgress(100);

    return compressedDataUrl;
  }
}

export function createProgressIndicator(container) {
  const progressContainer = document.createElement('div');
  progressContainer.className = 'fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50';
  progressContainer.id = 'image-progress-container';
  
  const title = document.createElement('div');
  title.className = 'text-sm font-semibold mb-2';
  title.textContent = '图片处理中...';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'w-48 h-2 bg-gray-200 rounded-full overflow-hidden';
  
  const progressFill = document.createElement('div');
  progressFill.className = 'h-full bg-blue-500 transition-all duration-300';
  progressFill.style.width = '0%';
  progressFill.id = 'image-progress-fill';
  
  const progressText = document.createElement('div');
  progressText.className = 'text-xs text-gray-500 mt-1';
  progressText.textContent = '0%';
  progressText.id = 'image-progress-text';
  
  progressBar.appendChild(progressFill);
  progressContainer.appendChild(title);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);
  container.appendChild(progressContainer);
  
  return {
    update: (percent) => {
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
    },
    remove: () => {
      progressContainer.remove();
    }
  };
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

export function generateId(length = 9) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
