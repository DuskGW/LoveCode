import { BACKEND_CONFIG } from './config.js';
import { showToast } from './ui.js';

export async function requestWithRetry(url, options, retryCount = 0) {
  try {
    const defaultHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache'
    };

    const response = await axios({
      url,
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      timeout: BACKEND_CONFIG.TIMEOUT
    });
    return response;
  } catch (error) {
    if (retryCount < BACKEND_CONFIG.MAX_RETRY && error.code !== 'ECONNABORTED') {
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
      return requestWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}

export async function saveConfigToBackend(state) {
  try {
    const shareId = state.shareId || Math.random().toString(36).substr(2, 9);

    const configData = {
      id: shareId,
      config: {
        isFriend: state.isFriend,
        friendName: state.friendName,
        images: state.images.map(img => {
          return img.replace(/^data:image\/jpeg;base64,/, '');
        }),
        selectedColor: state.selectedColor,
        selectedAnimation: state.selectedAnimation || 'float',
        duration: state.duration,
        density: state.density || 'medium',
        floatTexts: state.floatTexts
      },
      expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createTime: Date.now(),
      client: navigator.userAgent.substring(0, 200),
      viewCount: 0
    };

    const response = await requestWithRetry(
      `${BACKEND_CONFIG.API_BASE}/save.php`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: configData
      }
    );

    if (response.data.success) {
      showToast('保存成功', 'success');
      return shareId;
    } else {
      throw new Error('保存失败: ' + (response.data.message || '未知错误'));
    }
  } catch (error) {
    console.error('云端保存失败:', error);
    showToast('保存失败：' + error.message, 'error');
    throw error;
  }
}

export async function loadConfigFromBackend(shareId) {
  try {
    const response = await requestWithRetry(
      `${BACKEND_CONFIG.API_BASE}/load.php?id=${shareId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || '配置不存在或已过期');
    }

    const configData = response.data.data;

    if (Date.now() > configData.expire) {
      showToast('分享链接已过期', 'error');
      return false;
    }

    configData.config.images = configData.config.images.map(img => {
      return `data:image/jpeg;base64,${img}`;
    });

    return {
      ...configData.config,
      shareId,
      isSharedPlay: true,
      viewCount: configData.viewCount || 0
    };
  } catch (error) {
    console.error('云端加载失败:', error);
    showToast('加载失败：' + error.message, 'error');
    return false;
  }
}

export async function incrementViewCount(shareId) {
  try {
    await requestWithRetry(
      `${BACKEND_CONFIG.API_BASE}/stats.php`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          id: shareId,
          action: 'view'
        }
      }
    );
  } catch (error) {
    console.error('统计更新失败:', error);
  }
}