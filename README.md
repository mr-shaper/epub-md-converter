# epub-md-converter

一个现代化的 EPUB 到 Markdown 转换工具，带有漂亮的 Web GUI 界面。

## ✨ 特性

- 🎨 **现代化 GUI**: 深色主题，玻璃态效果，流畅动画
- 📁 **拖拽上传**: 支持拖拽 EPUB 文件上传
- 🔄 **智能转换**: 使用 epub2MD CLI 进行稳定转换
- ✅ **多种选项**: 
  - 章节合并
  - 中英文自动校正
  - 图片本地化
  - 自动填充文件名
- 🖼️ **封面支持**: 自动提取并包含封面图片，Obsidian 完美显示
- 📦 **ZIP 下载**: 完整文件夹结构（MD + images + cover）
- 🌏 **中文友好**: 完美支持中文文件名，无乱码
- 🗑️ **自动清理**: 下载后自动删除临时文件
- 📱 **响应式设计**: 适配各种屏幕尺寸

## 🚀 快速开始

### 安装

```bash
cd epub-md-converter
npm install
cd gui
npm install
```

### 启动

**方式一：双击启动**（推荐）
```
双击 "启动 epub2MD GUI.command" 文件
```

**方式二：命令行启动**
```bash
./start-gui.sh
```

### 使用

1. 访问 http://localhost:3737
2. 上传 EPUB 文件（自动填充文件名）
3. 配置转换选项
4. 下载 ZIP 压缩包
5. 解压后在 Obsidian 中打开，封面自动显示

## 📚 文档

- [GUI 使用说明](GUI使用说明.md)
- [CLI 使用指南](使用指南.md)
- [故障排除](故障排除.md)

## 🛠️ 技术栈

### 后端
- **Node.js + Express**: Web 服务器
- **Multer**: 文件上传处理
- **Archiver**: ZIP 压缩
- **epub2MD**: EPUB 解析和转换

### 前端
- **HTML5 + CSS3**: 现代化界面
- **Vanilla JavaScript**: 无框架依赖
- **Drag & Drop API**: 拖拽上传

## 📂 项目结构

```
epub-md-converter/
├── gui/                        # GUI 应用
│   ├── server.js              # Express 服务器
│   ├── converter-wrapper.js   # CLI 包装器
│   ├── public/                # 前端文件
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── uploads/               # 临时文件存储
├── lib/                       # epub2MD 编译后的库
├── src/                       # epub2MD 源代码
├── start-gui.sh               # 启动脚本
├── 启动 epub2MD GUI.command   # Mac 双击启动文件
└── README.md
```

## 🎯 功能说明

### 转换选项

- **合并章节**: 将所有章节合并为单个 MD 文件
- **自动校正**: 优化中英文之间的空格和标点
- **本地化图片**: 下载远程图片到本地

### 文件处理

- 上传的 EPUB 文件临时存储在 `gui/uploads/`
- 转换后生成完整文件夹结构
- 下载 ZIP 包含 MD 文件和 images 文件夹
- 下载完成 2 秒后自动清理临时文件

## 🔧 开发

### 本地开发

```bash
# 安装依赖
npm install
cd gui && npm install

# 启动开发服务器
cd gui
node server.js
```

### 构建

```bash
npm run build
```

## 📝 许可证

MIT License

基于 [epub2MD](https://github.com/uxiew/epub2MD) 项目

## 🙏 致谢

- [epub2MD](https://github.com/uxiew/epub2MD) - 核心转换引擎
- [Express](https://expressjs.com/) - Web 框架
- [Archiver](https://archiverjs.com/) - ZIP 压缩库

## 📞 支持

如遇到问题，请查看：
- [故障排除文档](故障排除.md)
- [GitHub Issues](https://github.com/mr-shaper/epub-md-converter/issues)

## 📝 更新日志

### v1.1.0 (2025-12-11)

**新功能**:
- ✨ 自动提取并包含封面图片（cover.jpg）
- 🎯 文件名自动填充（从 EPUB 文件名提取）
- 🌏 完美支持中文文件名，无乱码

**修复**:
- 🐛 修复 ZIP 下载 URL 错误
- 🐛 修复文件名编码问题
- 🐛 修复封面图片缺失问题

**改进**:
- 🎨 更新品牌标识（EPUB-MD Converter）
- 📦 优化 ZIP 创建逻辑
- 🔧 改进错误处理

---

**享受阅读！** 📚✨
