# EPUB-Markdown Bidirectional Converter

[中文说明](README_CN.md)

A modern EPUB to Markdown converter with a beautiful Web GUI.

## ✨ Features

- 🎨 **Modern GUI**: Dark theme, glassmorphism effects, smooth animations
- 📁 **Drag & Drop**: Support dragging EPUB files for upload
- 🔄 **Smart Conversion**: Uses epub2MD CLI for stable conversion
- ✅ **Multiple Options**: 
  - Merge chapters
  - Auto-correct spacing between English and Chinese
  - Localize images
  - Auto-fill filenames
- 🖼️ **Cover Support**: Automatically extracts and includes cover images, perfect for Obsidian
- 📦 **ZIP Download**: Complete folder structure (MD + images + cover)
- 🌏 **Chinese Friendly**: Full support for Chinese filenames, no encoding issues
- 🗑️ **Auto Cleanup**: Automatically deletes temporary files after download
- 📱 **Responsive Design**: Adapts to various screen sizes

## 🚀 Quick Start

### Installation

```bash
cd epub-md-converter
npm install
cd gui
npm install
```

### Launch

**Method 1: Double-click (Recommended)**
```
Double-click the "启动 epub2MD GUI.command" file
```

**Method 2: Command Line**
```bash
./start-gui.sh
```

### Usage

1. Visit http://localhost:3737
2. Upload EPUB file (filename auto-filled)
3. Configure conversion options
4. Download ZIP archive

### Reverse Conversion (Markdown → EPUB)

1. Click the toggle switch at the top right to switch to "Reverse Conversion (MD→EPUB)" mode
2. Pack your Markdown file and `images` folder into a **ZIP** file
   - ZIP Structure Example:
     ```
     book.zip
     ├── my-book.md
     └── images/
         ├── cover.jpg
         └── pic1.png
     ```
3. Drag and drop the ZIP file to upload
4. Click "Start Conversion"
5. Download the generated EPUB file

## 📚 Documentation

- [GUI User Guide](GUI使用说明.md) (Chinese)
- [CLI User Guide](使用指南.md) (Chinese)
- [Troubleshooting](故障排除.md) (Chinese)

## 🛠️ Tech Stack

### Backend
- **Node.js + Express**: Web Server
- **Multer**: File Upload Handling
- **Archiver & Adm-Zip**: ZIP Compression & Extraction
- **epub2MD**: Forward Conversion Engine
- **epub-gen**: Reverse Conversion Engine
- **Marked**: Markdown Parsing

### Frontend
- **HTML5 + CSS3**: Modern Interface
- **Vanilla JavaScript**: No Framework Dependencies
- **Drag & Drop API**: Drag & Drop Upload

## 📂 Project Structure

```
epub-md-converter/
├── gui/                        # GUI Application
│   ├── server.js              # Express Server (Handles all conversion logic)
│   ├── converter-wrapper.js   # CLI Wrapper
│   ├── public/                # Frontend Files
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── uploads/               # Temporary File Storage
├── lib/                       # Compiled epub2MD Library
├── src/                       # epub2MD Source Code
├── start-gui.sh               # Startup Script
├── 启动 epub2MD GUI.command   # Mac Double-click Startup File
└── README.md
```

## 🎯 Features

### Conversion Options

- **Merge Chapters**: Merge all chapters into a single MD file
- **Auto Correct**: Optimize spacing and punctuation between Chinese and English
- **Localize Images**: Download remote images locally

### Bidirectional Conversion

- **EPUB → Markdown**: Perfect formatting preservation, smart cover extraction
- **Markdown → EPUB**: Support image packaging, auto TOC generation, Mac hidden file filtering

### File Handling

- Uploaded EPUB files are temporarily stored in `gui/uploads/`
- Generates complete folder structure after conversion
- Download ZIP includes MD files and images folder
- Automatically cleans up temporary files 2 seconds after download completes

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install
cd gui && npm install

# Start development server
cd gui
node server.js
```

### Build

```bash
npm run build
```

## 📝 License

MIT License

Based on [epub2MD](https://github.com/uxiew/epub2MD) project

## 🙏 Acknowledgements

- [epub2MD](https://github.com/uxiew/epub2MD) - Core Conversion Engine
- [epub-gen](https://github.com/cyrilis/epub-gen) - EPUB Generator
- [Express](https://expressjs.com/) - Web Framework
- [Archiver](https://archiverjs.com/) - ZIP Library

## 📞 Support

If you encounter issues, please check:
- [Troubleshooting](故障排除.md) (Chinese)
- [GitHub Issues](https://github.com/mr-shaper/epub-md-converter/issues)

## 📝 Changelog

### v1.2.0 (2025-12-12)

**New Features**:
- ✨ **Reverse Conversion**: Support converting Markdown + Images ZIP package to EPUB ebook
- 🔄 **Dual Mode Switching**: Added mode toggle switch in frontend
- 📂 **Smart ZIP Parsing**: Support recursive MD file search, auto-ignore Mac system hidden files (`._`)
- 🛡️ **Security Enhancement**: Server-side mandatory filename sanitization to prevent Chinese encoding errors

### v1.1.0 (2025-12-11)

**New Features**:
- ✨ Smart cover image extraction and inclusion (cover.jpg)
- 🎯 Auto-fill filename (extracted from EPUB filename)
- 🌏 Full support for Chinese filenames, no mojibake

**Fixes**:
- 🐛 Fixed ZIP download URL error
- 🐛 Fixed filename encoding issues
- 🐛 Fixed missing cover image issue

**Improvements**:
- 🎨 Updated Branding (EPUB-MD Converter)
- 📦 Optimized ZIP creation logic
- 🔧 Improved error handling

---

**Enjoy Reading!** 📚✨
