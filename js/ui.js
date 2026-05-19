export function showToast(message, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

export function goToStep(step) {
  document.querySelectorAll('#control-panel > div[id^="step"], #result-panel').forEach(el => {
    el.classList.add('hidden');
  });

  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.classList.remove('active');
  });

  if (step === 'result') {
    document.getElementById('result-panel').classList.remove('hidden');
  } else {
    document.getElementById(`step${step}`).classList.remove('hidden');
    document.querySelectorAll(`.step-dot[data-step="${step}"]`).forEach(dot => {
      dot.classList.add('active');
    });
  }
}

export function toggleActionMenu() {
  const subContainer = document.getElementById('action-sub-container');
  subContainer.classList.toggle('show');
}

export function hideActionMenu() {
  document.getElementById('action-sub-container').classList.remove('show');
}

export function renderUploadedImages(images) {
  const container = document.getElementById('uploaded-images');
  container.innerHTML = '';

  images.forEach((src, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative inline-block rounded-md overflow-hidden border border-gray-200';
    imgContainer.style.width = '100px';
    imgContainer.style.height = '100px';

    const img = document.createElement('img');
    img.src = src;
    img.className = 'w-full h-full object-cover';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs';
    removeBtn.innerHTML = '<i class="fa fa-times"></i>';
    removeBtn.onclick = () => {
      return index;
    };

    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    container.appendChild(imgContainer);
  });

  return container;
}

export function generateShareLink(url) {
  const shareLinkEl = document.getElementById('share-link');
  const shareContainer = document.getElementById('share-link-container');

  shareLinkEl.value = url;
  shareContainer.classList.remove('hidden');
}

export function copyShareLink() {
  const shareLinkEl = document.getElementById('share-link');
  const copyBtn = document.getElementById('copy-link');

  try {
    navigator.clipboard.writeText(shareLinkEl.value).then(() => {
      copyBtn.textContent = '已复制';
      copyBtn.classList.add('copy-btn-success');

      setTimeout(() => {
        copyBtn.textContent = '复制';
        copyBtn.classList.remove('copy-btn-success');
      }, 2000);

      showToast('链接已复制到剪贴板', 'success');
    }).catch(() => {
      shareLinkEl.select();
      document.execCommand('copy');

      copyBtn.textContent = '已复制';
      copyBtn.classList.add('copy-btn-success');

      setTimeout(() => {
        copyBtn.textContent = '复制';
        copyBtn.classList.remove('copy-btn-success');
      }, 2000);
    });
  } catch (error) {
    showToast('复制失败，请手动复制', 'error');
  }
}