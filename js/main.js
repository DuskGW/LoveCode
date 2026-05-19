import { stateManager } from './state.js';
import { showToast, showLoading } from './ui.js';
import { saveConfigToBackend, loadConfigFromBackend, incrementViewCount } from './api.js';
import { createImageCarousel, startFloatAnimation, stopFloatAnimation, createAutoPlayGuide } from './animation.js';
import { openTemplateModal } from './templates.js';
import { COLORS, ANIMATIONS, DENSITY_OPTIONS, BACKEND_CONFIG } from './config.js';
import { ImageCompressor, createProgressIndicator, safeJsonParse, generateId, debounce } from './utils.js';

let isMusicPlaying = false;
const bgMusic = document.getElementById('background-music');

const CHAT_STAGES = {
  START: 'start',
  NAME: 'name',
  IMAGE: 'image',
  COLOR: 'color',
  ANIMATION: 'animation',
  DENSITY: 'density',
  SPEED: 'speed',
  TEXTS: 'texts',
  COMPLETE: 'complete'
};

let currentChatStage = CHAT_STAGES.START;

document.addEventListener('DOMContentLoaded', () => {
  tryCleanupOldStorage();
  setupGlobalErrorHandler();
  
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('id');

  if (shareId) {
    showLoading(true);
    loadConfigFromBackend(shareId).then(config => {
      showLoading(false);
      if (config) {
        Object.keys(config).forEach(key => {
          stateManager.set(key, config[key]);
        });
        incrementViewCount(shareId);
        startPlay();
      }
    }).catch(() => {
      showLoading(false);
    });
  }
  
  initEventListeners();
});

function tryCleanupOldStorage() {
  try {
    const keysToCleanup = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('blessing_')) {
        keysToCleanup.push(key);
      }
    }
    
    keysToCleanup.forEach(key => {
      if (key !== LOCAL_STORAGE_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('清理旧数据失败:', e);
  }
}

function initEventListeners() {
  document.getElementById('btn-self').addEventListener('click', () => {
    stateManager.set('isFriend', false);
    stateManager.set('friendName', '亲爱的');
    openChatPanel();
    currentChatStage = CHAT_STAGES.IMAGE;
    showBotMessage('好的！接下来请上传背景图片，可以选择1-5张哦~', CHAT_STAGES.IMAGE);
  });

  document.getElementById('btn-friend').addEventListener('click', () => {
    stateManager.set('isFriend', true);
    openChatPanel();
    currentChatStage = CHAT_STAGES.NAME;
    showBotMessage('好的！那请问你朋友的名字是什么呢？', CHAT_STAGES.NAME);
  });

  document.getElementById('chat-back').addEventListener('click', closeChatPanel);
  document.getElementById('chat-send').addEventListener('click', handleChatSend);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleChatSend();
    }
  });

  document.getElementById('start-play').addEventListener('click', startPlay);
  document.getElementById('restart-btn').addEventListener('click', restart);
  document.getElementById('generate-share').addEventListener('click', () => {
    showLoading(true);
    generateShareLink().finally(() => {
      showLoading(false);
    });
  });
  document.getElementById('copy-link').addEventListener('click', copyShareLink);

  document.getElementById('action-main-btn').addEventListener('click', toggleActionMenu);
  document.getElementById('home-button').addEventListener('click', () => {
    if (stateManager.get('isPlaying')) {
      stopPlay();
      document.getElementById('control-panel').classList.add('hidden');
      document.getElementById('result-panel').classList.remove('hidden');
      hideActionMenu();
      return;
    }
    restart();
    hideActionMenu();
  });
  document.getElementById('share-button').addEventListener('click', () => {
    if (stateManager.get('isPlaying')) {
      stopPlay();
    }
    document.getElementById('control-panel').classList.add('hidden');
    document.getElementById('result-panel').classList.remove('hidden');
    showLoading(true);
    generateShareLink().finally(() => {
      showLoading(false);
      hideActionMenu();
    });
  });
  
  document.getElementById('author-button').addEventListener('click', () => {
    window.open('https://github.com/DuskGW/LoveCode', '_blank');
    hideActionMenu();
  });
  document.getElementById('music-toggle').addEventListener('click', () => {
    toggleBackgroundMusic();
    hideActionMenu();
  });

  document.body.addEventListener('touchstart', () => {
    if (!isMusicPlaying && bgMusic.paused) {
      bgMusic.play().catch(() => {});
    }
  }, { once: true });
}

function openChatPanel() {
  document.getElementById('control-panel').classList.add('hidden');
  document.getElementById('chat-panel').classList.remove('hidden');
  document.getElementById('chat-input').value = '';
  document.getElementById('chat-messages').innerHTML = `
    <div class="chat-message bot">
      <img src="images/robot.gif" alt="LoveCode小助手" class="message-avatar bot">
      <div class="message-content">
        <p>嗨~ 我是你的LoveCode小助手，让我来帮你创建一份特别的祝福吧！</p>
      </div>
    </div>
  `;
  scrollChatToBottom();
}

function closeChatPanel() {
  document.getElementById('chat-panel').classList.add('hidden');
  document.getElementById('control-panel').classList.remove('hidden');
  currentChatStage = CHAT_STAGES.START;
}

function showBotMessage(message, nextStage = null) {
  const messagesContainer = document.getElementById('chat-messages');
  
  setTimeout(() => {
    const botMessage = document.createElement('div');
    botMessage.className = 'chat-message bot';
    botMessage.innerHTML = `
      <img src="images/robot.gif" alt="LoveCode小助手" class="message-avatar bot">
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    messagesContainer.appendChild(botMessage);
    scrollChatToBottom();
    
    if (nextStage) {
      currentChatStage = nextStage;
      showStageOptions(nextStage);
    }
  }, 300);
}

function showUserMessage(message) {
  const messagesContainer = document.getElementById('chat-messages');
  
  const userMessage = document.createElement('div');
  userMessage.className = 'chat-message user';
  userMessage.innerHTML = `
    <div class="message-avatar user">
      <i class="fa fa-user"></i>
    </div>
    <div class="message-content">
      <p>${message}</p>
    </div>
  `;
  messagesContainer.appendChild(userMessage);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showStageOptions(stage) {
  const choicesContainer = document.getElementById('chat-choices');
  choicesContainer.innerHTML = '';
  document.getElementById('chat-input').style.display = 'none';
  document.getElementById('chat-send').style.display = 'none';

  switch (stage) {
    case CHAT_STAGES.NAME:
      document.getElementById('chat-input').style.display = 'block';
      document.getElementById('chat-send').style.display = 'flex';
      document.getElementById('chat-input').placeholder = '请输入朋友的名字';
      document.getElementById('chat-input').focus();
      break;

    case CHAT_STAGES.IMAGE:
      showImageUpload();
      break;

    case CHAT_STAGES.COLOR:
      showColorOptions();
      break;

    case CHAT_STAGES.ANIMATION:
      showAnimationOptions();
      break;

    case CHAT_STAGES.DENSITY:
      showDensityOptions();
      break;

    case CHAT_STAGES.SPEED:
      showSpeedSlider();
      break;

    case CHAT_STAGES.TEXTS:
      showTextsInput();
      break;

    case CHAT_STAGES.COMPLETE:
      choicesContainer.innerHTML = `
        <div class="complete-btn-container">
          <button class="complete-btn" onclick="goToResult()">太棒了！点击完成创建</button>
        </div>
      `;
      break;
  }
}

function showImageUpload() {
  const choicesContainer = document.getElementById('chat-choices');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <label for="chat-image-upload" class="chat-image-upload">
        <i class="fa fa-cloud-upload text-3xl text-gray-400 mb-2"></i>
        <p>点击或拖拽图片到此处上传作为背景图轮播</p>
        <p class="text-sm text-gray-500 mt-1">最多5张图片，单张不超过10MB</p>
        <input id="chat-image-upload" type="file" accept="image/*" multiple class="hidden">
      </label>
      <div id="chat-image-preview" class="chat-image-preview"></div>
      <button class="chat-choice mt-3 w-full" onclick="confirmImageUpload()" id="confirm-image-btn" disabled>确认上传并继续</button>
    </div>
  `;

  const imageUpload = document.getElementById('chat-image-upload');
  imageUpload.addEventListener('change', async (e) => {
    await handleChatImageUpload(e.target.files);
  });

  const uploadArea = document.querySelector('label[for="chat-image-upload"]');
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      await handleChatImageUpload(e.dataTransfer.files);
    }
  });

  const existingImages = stateManager.get('images');
  if (existingImages.length > 0) {
    renderImagePreview();
  }
}

window.confirmImageUpload = function() {
  const images = stateManager.get('images');
  if (images.length > 0) {
    showUserMessage(`已上传 ${images.length} 张图片`);
    showBotMessage('图片上传完成！接下来选择飘字的颜色主题吧~', CHAT_STAGES.COLOR);
  }
};

function renderImagePreview() {
  const previewContainer = document.getElementById('chat-image-preview');
  previewContainer.innerHTML = '';
  const images = stateManager.get('images');
  
  images.forEach((image, index) => {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';
    imageWrapper.innerHTML = `
      <img src="${image}" alt="图片${index + 1}">
      <button class="image-delete-btn" onclick="deleteImage(${index})">
        <i class="fa fa-times"></i>
      </button>
    `;
    previewContainer.appendChild(imageWrapper);
  });
  
  const confirmBtn = document.getElementById('confirm-image-btn');
  if (images.length > 0) {
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  } else {
    confirmBtn.disabled = true;
    confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }
}

window.deleteImage = function(index) {
  const images = stateManager.get('images');
  const fileHashes = stateManager.get('uploadedFileHashes') || [];
  
  images.splice(index, 1);
  fileHashes.splice(index, 1);
  
  stateManager.set('images', [...images]);
  stateManager.set('uploadedFileHashes', [...fileHashes]);
  
  renderImagePreview();
  showToast('图片已删除', 'success');
}

async function handleChatImageUpload(files) {
  const currentImages = [...stateManager.get('images')];
  
  const existingFileHashes = stateManager.get('uploadedFileHashes') || [];
  let newFileHashes = [...existingFileHashes];

  if (currentImages.length + files.length > 5) {
    showToast('最多上传5张图片', 'error');
    return;
  }

  const progressIndicator = createProgressIndicator(document.body);
  let processedCount = 0;
  const totalFiles = Array.from(files).filter(f => f.type.startsWith('image/')).length;
  let newImagesAdded = 0;

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          showToast('图片大小超过10MB限制', 'error');
          continue;
        }

        const fileHash = await calculateFileHash(file);
        
        if (existingFileHashes.includes(fileHash)) {
          showToast(`"${file.name}" 已上传过，请勿重复上传`, 'warning');
          continue;
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const compressor = new ImageCompressor({
          maxWidth: 1200,
          maxHeight: 1200,
          maxSizeKB: 500
        });

        const compressedDataUrl = await compressor.compress(dataUrl, (progress) => {
          const overallProgress = Math.floor(
            (processedCount / totalFiles) * 100 + (progress / totalFiles)
          );
          progressIndicator.update(overallProgress);
        });

        currentImages.push(compressedDataUrl);
        stateManager.set('images', [...currentImages]);
        
        newFileHashes.push(fileHash);
        stateManager.set('uploadedFileHashes', newFileHashes);

        processedCount++;
        newImagesAdded++;
      } catch (error) {
        console.error('图片处理失败:', error);
        showToast('图片处理失败', 'error');
      }
    }
  }

  progressIndicator.update(100);
  setTimeout(() => progressIndicator.remove(), 500);

  if (newImagesAdded > 0) {
    renderImagePreview();
    showToast(`已成功上传 ${newImagesAdded} 张图片，可继续添加或删除`, 'success');
  }
}

async function calculateFileHash(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const hash = simpleHash(arrayBuffer);
      resolve(hash);
    };
    reader.onerror = () => {
      resolve(`${file.name}_${file.size}_${file.lastModified}`);
    };
    reader.readAsArrayBuffer(file);
  });
}

function simpleHash(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function showColorOptions() {
  const choicesContainer = document.getElementById('chat-choices');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <p class="text-sm text-gray-500 mb-4">🎨 选个颜色作为漂浮气泡背景色吧~</p>
      <div class="chat-color-options-grid">
        ${COLORS.map(color => `
          <div 
            class="chat-color-item" 
            data-color="${color.value}"
            onclick="selectColor('${color.value}')"
          >
            <div 
              class="chat-color-circle ${color.value === 'random' ? 'selected' : ''}" 
              style="${color.value === 'random' ? `background: ${color.color}` : `background-color: ${color.color}`}"
            >
              ${color.value === 'random' ? '<i class="fa fa-random text-white text-xs"></i>' : ''}
            </div>
            <span class="chat-color-name">${color.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.selectColor = function(color) {
  stateManager.set('selectedColor', color);
  document.querySelectorAll('.chat-color-circle').forEach(el => el.classList.remove('selected'));
  const colorItem = document.querySelector(`[data-color="${color}"]`);
  if (colorItem) {
    colorItem.querySelector('.chat-color-circle').classList.add('selected');
  }
  
  showUserMessage(COLORS.find(c => c.value === color)?.name || '随机');
  showBotMessage('颜色选好啦！接下来选择飘字的动画效果~', CHAT_STAGES.ANIMATION);
};

function showAnimationOptions() {
  const choicesContainer = document.getElementById('chat-choices');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <p class="text-sm text-gray-500 mb-2">选择动画效果</p>
      <div class="chat-animation-options">
        ${ANIMATIONS.map(anim => `
          <div 
            class="chat-animation-option ${anim.value === 'float' ? 'selected' : ''}" 
            data-animation="${anim.value}"
            onclick="selectAnimation('${anim.value}')"
          >
            <i class="fa ${getAnimationIcon(anim.value)} mr-1"></i>${anim.name}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getAnimationIcon(type) {
  const icons = {
    float: 'fa-arrow-up',
    fall: 'fa-arrow-down'
  };
  return icons[type] || 'fa-circle';
}

window.selectAnimation = function(animation) {
  stateManager.set('selectedAnimation', animation);
  document.querySelectorAll('.chat-animation-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-animation="${animation}"]`).classList.add('selected');
  
  showUserMessage(ANIMATIONS.find(a => a.value === animation)?.name || '飘升');
  showBotMessage('动画效果很棒！接下来选择飘字的密度~', CHAT_STAGES.DENSITY);
};

function showDensityOptions() {
  const choicesContainer = document.getElementById('chat-choices');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <p class="text-sm text-gray-500 mb-2">选择飘字密度</p>
      <div class="chat-density-options">
        ${DENSITY_OPTIONS.map(density => `
          <div 
            class="chat-density-option ${density.value === 'medium' ? 'selected' : ''}" 
            data-density="${density.value}"
            onclick="selectDensity('${density.value}')"
          >
            ${density.name}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.selectDensity = function(density) {
  stateManager.set('density', density);
  document.querySelectorAll('.chat-density-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-density="${density}"]`).classList.add('selected');
  
  showUserMessage(DENSITY_OPTIONS.find(d => d.value === density)?.name || '适中');
  showBotMessage('密度选好了！接下来调整飘动速度~', CHAT_STAGES.SPEED);
};

function showSpeedSlider() {
  const choicesContainer = document.getElementById('chat-choices');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <p class="text-sm text-gray-500 mb-2">调整飘动速度</p>
      <input 
        type="range" 
        id="chat-speed-slider" 
        min="1" 
        max="8" 
        value="4" 
        class="chat-speed-slider accent-blue-500"
      />
      <div class="chat-speed-label">
        <span>快</span>
        <span>当前: ${getSpeedLabel(4)}</span>
        <span>慢</span>
      </div>
      <button class="chat-choice mt-3 w-full" onclick="confirmSpeed()">确认速度</button>
    </div>
  `;

  const slider = document.getElementById('chat-speed-slider');
  const label = document.querySelector('.chat-speed-label span:nth-child(2)');
  
  slider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    stateManager.set('duration', value);
    label.textContent = `当前: ${getSpeedLabel(value)}`;
  });
}

function getSpeedLabel(value) {
  const labels = {
    1: '极快',
    2: '快速',
    3: '较快',
    4: '适中',
    5: '较慢',
    6: '慢速',
    7: '很慢',
    8: '极慢'
  };
  return labels[value] || '适中';
}

window.confirmSpeed = function() {
  const duration = stateManager.get('duration');
  showUserMessage(getSpeedLabel(duration));
  showBotMessage('速度调整完成！最后一步，输入飘字内容~', CHAT_STAGES.TEXTS);
};

function showTextsInput() {
  const choicesContainer = document.getElementById('chat-choices');
  const name = stateManager.get('friendName');
  
  choicesContainer.innerHTML = `
    <div class="w-full">
      <p class="text-sm text-gray-500 mb-2">输入飘字内容（每行一条）</p>
      <textarea 
        id="chat-texts" 
        class="chat-textarea"
        placeholder="每行一条祝福内容，名字会自动添加在前面"
      >记得好好吃饭哦
早点休息喔
别熬夜啦
要注意身体
天冷了多穿点衣服
出门记得带伞
累了就休息一下吧
不开心可以找我呀
你已经很棒了
别太勉强自己
慢慢来没关系的
我一直都在你身边
有我陪着你
你不是一个人
我想你了
要保重身体
别想太多
开心最重要
做自己就好
你值得被爱
我相信你可以的
加油但别太拼了
心情不好就说出来吧
允许自己脆弱也没关系
今天也要好好爱自己
再难的事我们一起扛
委屈了就哭出来没关系
你永远是我的偏爱
别把所有事都自己扛
偶尔偷懒也很正常
你笑起来真的很好看
无论怎样我都支持你
记得吃早餐哦
出门注意安全
累了就靠在我肩上歇会儿
不开心就吃点好吃的
你在我心里永远是最棒的
别因为别人的错惩罚自己
偶尔emo也没关系我陪你
要相信一切都会好起来的
好好睡觉明天又是新的一天
记得多喝水别等渴了才喝
你不需要完美真实的你就很好
别总想着远方身边的风景也很美
我喜欢的是真实的你不是完美的你
遇到难题了我们一起想办法
别硬撑我随时可以当你的后盾
今天的你已经很了不起了
别担心一切有我
想做什么就去做我支持你
你可以偶尔依赖我一下的
别觉得孤单我一直都在
好好吃饭好好睡觉好好爱自己
你值得被世界温柔以待
别给自己太大压力放轻松
就算暂时迷茫也没关系
我会一直在你能看到的地方
累了就停一停我等你
你真的很优秀别怀疑自己
不管怎样我都喜欢你
今天的你也有在认真生活呀
要记得你很重要
别把情绪都藏起来我愿意听
你可以偶尔软弱我会接住你
好好生活慢慢相遇我等你
别着急我们还有很多时间
你值得被认真对待
照顾好自己我会一直在这里
别太累我会心疼的
记得吃水果补充维生素
你笑起来的时候眼睛里有光
别因为别人的错误影响自己的心情
你已经很棒了真的
有我在别怕
慢慢来我陪你
你不需要和别人比做自己就好
好好睡觉梦里有我
别总熬夜身体最重要
多出去走走晒晒太阳
你在我心里永远是第一位
别硬扛我可以帮你
不管发生什么我都在
你已经很勇敢了
别对自己太严格偶尔放松一下
我喜欢你所以你怎样都好
好好吃饭我才能放心
早点休息明天见
多喝热水别感冒了
别熬夜我会担心的
要注意身体我还想陪你很久
天冷了多穿点别冻着
出门带伞别淋雨
累了就歇会儿我等你
不开心就找我我随时在
你真的很棒别怀疑
别勉强自己不行就退一步
慢慢来我们有的是时间
我一直在从未离开
有我陪着你别怕
你不是一个人在战斗
我想你了很想很想
要保重身体我还没陪够你
别想太多开心就好
开心最重要其他都是其次
做自己就好我喜欢真实的你
你值得被爱很值得
我相信你可以的你要相信自己
加油但别太拼了身体要紧
心情不好就说出来我听着
允许自己脆弱这没什么不好
今天阳光很好记得多笑笑
你的努力我都看在眼里
别给自己设限你比想象中强大
偶尔放慢脚步也是一种智慧
你身上有很多闪光点
我喜欢和你在一起的时光
和你聊天总是很开心
你的存在本身就是一种美好
别害怕犯错那是成长的一部分
你对待生活的态度很动人
和你分享的每一刻都很珍贵
你让我觉得世界很美好
你的笑容能治愈一切
我很珍惜我们的友谊
你是个很温暖的人
你的善良值得被温柔以待
和你在一起很安心
你总是那么体贴
你的坚持让我很佩服
你对待朋友很真诚
你身上有种特别的魅力
你的想法总是很有趣
和你相处很舒服
你是个值得深交的朋友
你的乐观总能感染我
遇到你真好
谢谢你出现在我的生命里
有你这样的朋友很幸运
你让我成为更好的自己
认识你是我的荣幸
你是我想珍惜的人
你在我心里很重要
你值得拥有最好的一切
你的努力一定会有回报
你比你想象的更优秀
你的未来一定会很精彩
我对你有信心
你总能给我带来惊喜
你的潜力无限
你是独一无二的
你的存在对我很重要
你值得被全世界温柔对待
我很欣赏你
你是个很特别的人
你的优点很多
你总是那么可靠
你做事很认真
你很有才华
你很有想法
你很有幽默感
你很懂得照顾别人
你很有同理心
你很善良
你很真诚
你很勇敢
你很坚强
你很乐观
你很聪明
你很可爱
你很棒</textarea>
      <div class="flex justify-center mt-3">
        <button class="chat-choice template-btn" onclick="openTemplate()">📖 选择其他模板</button>
      </div>
      <button class="chat-choice mt-2 w-full" onclick="confirmTexts()">确认内容</button>
    </div>
  `;
}

window.openTemplate = function() {
  const textarea = document.getElementById('chat-texts');
  openTemplateModal((content) => {
    textarea.value = content;
  });
};

window.confirmTexts = function() {
  const textarea = document.getElementById('chat-texts');
  const friendName = stateManager.get('friendName');
  const lines = textarea.value.split('\n').map(text => text.trim()).filter(text => text.length > 0);
  
  if (lines.length === 0) {
    showToast('请至少输入一条飘字内容', 'error');
    return;
  }
  
  const floatTexts = lines.map(line => {
    if (line.includes('{name}')) {
      return line.replace(/{name}/g, friendName);
    } else {
      return `${friendName}${line}`;
    }
  });
  
  stateManager.set('floatTexts', floatTexts);
  showUserMessage(`已输入 ${floatTexts.length} 条祝福`);
  showBotMessage('所有配置都完成啦！点击下方按钮完成创建~', CHAT_STAGES.COMPLETE);
};

window.goToResult = function() {
  document.getElementById('chat-panel').classList.add('hidden');
  document.getElementById('result-panel').classList.remove('hidden');
};

function handleChatSend() {
  const input = document.getElementById('chat-input');
  const value = input.value.trim();
  
  if (!value) return;
  
  input.value = '';
  showUserMessage(value);
  
  switch (currentChatStage) {
    case CHAT_STAGES.NAME:
      if (value.length > 0 && value.length <= 20) {
        stateManager.set('friendName', value);
        showBotMessage(`好的，祝福将送给 ${value}！接下来请上传背景图片~`, CHAT_STAGES.IMAGE);
      } else {
        showBotMessage('名字需要在1-20个字符之间哦，请重新输入~');
      }
      break;
  }
}

function toggleActionMenu() {
  const subContainer = document.getElementById('action-sub-container');
  subContainer.classList.toggle('show');
}

function hideActionMenu() {
  document.getElementById('action-sub-container').classList.remove('show');
}

function toggleBackgroundMusic() {
  if (isMusicPlaying) {
    bgMusic.pause();
    document.querySelector('#music-toggle i').className = 'fa fa-music text-primary text-xl';
    document.querySelector('#music-toggle').classList.remove('music-pulse');
    showToast('背景音乐已暂停', 'info');
  } else {
    bgMusic.play().then(() => {
      document.querySelector('#music-toggle i').className = 'fa fa-pause text-primary text-xl';
      document.querySelector('#music-toggle').classList.add('music-pulse');
      showToast('背景音乐已播放', 'success');
    }).catch(err => {
      showToast('点击屏幕后才能播放音乐', 'warning');
      document.body.addEventListener('click', () => {
        bgMusic.play();
        document.querySelector('#music-toggle i').className = 'fa fa-pause text-primary text-xl';
        document.querySelector('#music-toggle').classList.add('music-pulse');
      }, { once: true });
    });
  }
  isMusicPlaying = !isMusicPlaying;
}

function startPlay() {
  stateManager.set('isPlaying', true);
  const playArea = document.getElementById('play-area');
  playArea.classList.remove('hidden');
  document.getElementById('control-panel').classList.add('hidden');
  document.getElementById('result-panel').classList.add('hidden');
  document.getElementById('action-container').classList.remove('hidden');

  playArea.innerHTML = '<div id="float-container" class="fixed inset-0 z-30 pointer-events-none"></div>';
  createImageCarousel(stateManager.get('images'), stateManager.get('duration'));

  if (!isMusicPlaying) {
    toggleBackgroundMusic();
  }

  if (stateManager.get('isSharedPlay')) {
    createAutoPlayGuide(stateManager.get('friendName')).then(() => {
      startFloatAnimation(stateManager.getAll());
    });
  } else {
    startFloatAnimation(stateManager.getAll());
  }
}

function stopPlay() {
  stateManager.set('isPlaying', false);
  document.getElementById('play-area').classList.add('hidden');
  document.getElementById('control-panel').classList.remove('hidden');
  document.getElementById('action-container').classList.add('hidden');
  stopFloatAnimation();
}

function restart() {
  stateManager.reset();
  clearLocalBackup();
  
  document.getElementById('chat-panel').classList.add('hidden');
  document.getElementById('control-panel').classList.remove('hidden');
  document.getElementById('result-panel').classList.add('hidden');
  
  if (isMusicPlaying) {
    toggleBackgroundMusic();
  }
  
  currentChatStage = CHAT_STAGES.START;
  
  stateManager.set('uploadedFileHashes', []);
}

const LOCAL_STORAGE_KEY = 'blessing_float_backup';
const BACKUP_EXPIRE_TIME = 24 * 60 * 60 * 1000;

function saveLocalBackup() {
  try {
    const state = stateManager.getAll();
    if (!state || typeof state !== 'object') return;
    
    state._backupTime = Date.now();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('本地保存失败:', e);
  }
}

function clearLocalBackup() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {}
}

function setupGlobalErrorHandler() {
  let isInitialized = false;
  
  setTimeout(() => {
    isInitialized = true;
  }, 1000);

  window.onerror = function(message, source, lineno, colno, error) {
    console.error('全局错误:', { message, source, lineno, colno, error });
    
    if (isInitialized) {
      showToast('发生错误，请刷新页面重试', 'error');
    }
    return true;
  };

  window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的 Promise 拒绝:', event.reason);
    
    if (isInitialized) {
      showToast('操作失败，请重试', 'error');
    }
  });
}

function copyShareLink() {
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

async function generateShareLink() {
  const shareLinkEl = document.getElementById('share-link');
  const shareContainer = document.getElementById('share-link-container');

  shareLinkEl.value = '生成中...';
  shareContainer.classList.remove('hidden');

  try {
    const state = stateManager.getAll();
    const shareId = await saveConfigToBackend(state);

    if (!shareId) {
      throw new Error('生成ID失败');
    }

    stateManager.set('shareId', shareId);

    const shareUrl = new URL(`${window.location.origin}${window.location.pathname}`);
    shareUrl.searchParams.set('id', shareId);
    shareUrl.searchParams.set('t', Date.now().toString().substr(0, 10));

    shareLinkEl.value = shareUrl.toString();
    showToast('分享链接已生成', 'success');
  } catch (error) {
    console.error('生成分享链接失败:', error);
    shareLinkEl.value = '生成失败，请重试';
    showToast('生成失败：' + error.message, 'error');
  }
}