# LoveCode - 动态祝福网页生成器

一款精美的动态祝福网页生成工具，可以创建带有漂浮文字动画的个性化祝福页面。

## 功能特点

- **图片轮播背景** - 支持上传 1-5 张图片作为背景轮播
- **多彩颜色主题** - 提供多种预设颜色可选
- **多种动画效果** - 支持飘升、飘落等多种动画
- **自定义密度和速度** - 可调整飘字的密度和速度
- **丰富的祝福语库** - 预置 200+ 条温馨祝福语
- **一键分享** - 生成分享链接，好友即可查看
- **响应式设计** - 完美支持移动端和桌面端
- **背景音乐** - 自动播放温馨背景音乐

## 快速开始

### 方式一：直接使用

1. 克隆项目到本地
```bash
git clone https://github.com/DuskGW/LoveCode.git
```

2. 使用本地服务器运行（如 VS Code Live Server）

### 方式二：部署到服务器

1. 将所有文件上传到 Web 服务器
2. 确保服务器支持 PHP（用于后端）
3. 配置后端文件地址

## 部署指南

### 环境要求

- PHP 7.4+ （后端 API 需要）
- Web 服务器（Apache/Nginx 等）
- HTTPS 支持（推荐，用于安全地加载外部资源）

### 部署步骤

#### 1. 服务器部署

**Apache 服务器：**

1. 将项目文件上传到 `/var/www/html/` 或您的网站根目录
2. 确保 `backend/` 目录有写入权限：
```bash
chmod 755 backend/
chmod 777 backend/data/  # 如果有 data 目录
```

**Nginx 服务器：**

1. 将项目文件上传到网站根目录
2. 配置 Nginx 支持 PHP：
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.php index.html;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

#### 2. 配置后端

在 `js/config.js` 中修改后端地址：

```javascript
export const BACKEND_CONFIG = {
  API_BASE: '/backend',      // 修改为您的后端路径
  MAX_RETRY: 3,
  TIMEOUT: 15000,
  COMPRESS_IMAGES: true
};
```

#### 3. 修改分享链接域名

在 `js/main.js` 中修改分享链接的域名：

```javascript
// 在 generateShareLink 函数中
const shareUrl = new URL(`https://yourdomain.com${window.location.pathname}`);
shareUrl.searchParams.set('id', shareId);
```

#### 4. 配置背景音乐（可选）

在 `index.html` 中修改背景音乐链接：

```html
<audio id="background-music" loop preload="auto" volume="0.3">
  <source src="您的音乐URL.mp3" type="audio/mpeg">
</audio>
```

#### 5. 伪静态配置

**Apache (.htaccess)：**
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

**Nginx：**
```nginx
if ($scheme = http) {
    return 301 https://$server_name$request_uri;
}
```

### 常见问题

**Q: 分享功能无法使用？**
A: 确保 PHP 后端已正确部署，并且 `backend/` 目录有写入权限。

**Q: 图片无法上传？**
A: 检查 PHP 的 `upload_max_filesize` 和 `post_max_size` 配置。

**Q: 背景音乐无法播放？**
A: 某些浏览器需要用户交互后才能播放音频，确保音乐播放按钮被点击过。

### Docker 部署（可选）

```dockerfile
FROM php:7.4-apache
COPY . /var/www/html/
RUN chmod -R 755 /var/www/html/backend/
EXPOSE 80
```

构建并运行：
```bash
docker build -t lovecode .
docker run -d -p 8080:80 lovecode
```

## 项目结构

```
LoveCode/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── main.js         # 主逻辑
│   ├── config.js       # 配置文件
│   ├── state.js        # 状态管理
│   ├── animation.js    # 动画控制
│   ├── api.js          # API 调用
│   ├── templates.js    # 模板管理
│   ├── ui.js           # UI 组件
│   └── utils.js        # 工具函数
├── backend/
│   ├── load.php        # 加载配置
│   ├── save.php        # 保存配置
│   └── stats.php       # 统计数据
└── images/
    └── robot.gif       # 机器人图标
```

## 技术栈

- **前端框架**: Tailwind CSS
- **动画**: CSS Keyframes + JavaScript
- **后端**: PHP + JSON 文件存储
- **图片处理**: Canvas API
- **HTTP 请求**: Axios

## 配置说明

### 颜色配置

在 `js/config.js` 中可以修改颜色主题：

```javascript
export const COLORS = [
  { name: '樱花粉', value: 'pastel-pink', color: '#FFB7C5' },
  // 添加更多颜色...
];
```

### 动画配置

```javascript
export const ANIMATIONS = [
  { name: '飘升', value: 'float', class: 'float-animation' },
  { name: '飘落', value: 'fall', class: 'float-fall' }
];
```

### 后端配置

```javascript
export const BACKEND_CONFIG = {
  API_BASE: '/backend',      // API 地址
  MAX_RETRY: 3,              // 最大重试次数
  TIMEOUT: 15000,            // 请求超时（毫秒）
  COMPRESS_IMAGES: true      // 是否压缩图片
};
```

## 自定义祝福语

在 `js/main.js` 的 `showTextsInput()` 函数中，可以修改默认的祝福语内容。

## API 接口

### 保存配置
- **URL**: `POST /backend/save.php`
- **参数**: JSON 格式的配置数据
- **返回**: 分享 ID

### 加载配置
- **URL**: `GET /backend/load.php?id={shareId}`
- **返回**: 配置数据

### 更新统计
- **URL**: `POST /backend/stats.php`
- **参数**: 分享 ID

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 开源协议

本项目采用 [MIT 开源协议](LICENSE)。

## 致谢

- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Axios](https://axios-http.com/) - HTTP 请求库

## 联系方式

- GitHub: [DuskGW/LoveCode](https://github.com/DuskGW/LoveCode)
- 邮箱: duskgw@qq.com

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request
