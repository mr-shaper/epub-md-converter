import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import Epub from 'epub-gen';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3737;

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // 使用安全的文件名（时间戳+随机数+扩展名），避免中文文件名导致的 ADM-ZIP 或文件系统问题
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.epub' || ext === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('只支持 .epub 或 .zip 文件'));
        }
    }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 清理旧文件（超过1小时）
async function cleanupOldFiles() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1小时

    for (const dir of ['uploads', 'outputs']) {
        const dirPath = path.join(__dirname, dir);
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                if (file === '.gitkeep') continue;
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    await fs.rm(filePath, { recursive: true, force: true });
                    console.log(`已清理旧文件: ${file}`);
                }
            }
        } catch (error) {
            console.error(`清理 ${dir} 时出错:`, error);
        }
    }
}

// 每30分钟清理一次
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// 文件上传接口
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传 EPUB 文件' });
        }

        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// EPUB 转换接口
app.post('/convert', async (req, res) => {
    try {
        const { filename, options } = req.body;

        if (!filename) {
            return res.status(400).json({ error: '缺少文件名' });
        }

        const epubPath = path.join(__dirname, 'uploads', filename);

        // 检查文件是否存在
        try {
            await fs.access(epubPath);
        } catch {
            return res.status(404).json({ error: '文件不存在' });
        }

        console.log('开始转换:', epubPath, options);

        // 使用 CLI 包装器进行转换
        const { convertEpubViaCLI } = await import('./converter-wrapper.js');

        const result = await convertEpubViaCLI(epubPath, {
            merge: options?.merge || false,
            autocorrect: options?.autocorrect || false,
            localize: options?.localize || false,
            mergeFileName: options?.mergeFileName || 'merged.md'
        });

        console.log('转换成功:', result);

        // 获取输出目录的完整路径
        // CLI 会在 EPUB 文件所在目录创建同名文件夹
        const epubBaseName = path.basename(epubPath, '.epub');
        const outputDir = path.join(path.dirname(epubPath), epubBaseName);

        console.log('查找输出目录:', outputDir);

        // 收集输出文件
        const files = await fs.readdir(outputDir, { recursive: true });
        const outputFiles = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ext === '.md' || ext === '.png' || ext === '.jpg' || ext === '.jpeg';
        });

        res.json({
            success: true,
            message: '转换完成',
            outputDir: epubBaseName,
            customFilename: options?.mergeFileName || null, // 传递用户自定义文件名
            files: outputFiles,
            merge: options?.merge || false
        });

    } catch (error) {
        console.error('转换错误:', error);
        res.status(500).json({
            error: '转换失败: ' + error.message,
            details: error.stack
        });
    }
});

// Markdown 转 EPUB 接口
app.post('/convert-to-epub', async (req, res) => {
    try {
        const { filename, options } = req.body;
        if (!filename) return res.status(400).json({ error: '缺少文件名' });

        const zipPath = path.join(__dirname, 'uploads', filename);
        // 解压目录名加上时间戳防止冲突
        const extractDir = path.join(__dirname, 'uploads', path.basename(filename, '.zip') + '-' + Date.now());

        console.log('开始反向转换:', filename);
        console.log('ZIP 文件路径:', zipPath);

        // Debug: 检查文件是否存在
        try {
            await fs.access(zipPath);
            console.log('文件存在检查: 通过');
        } catch (e) {
            console.error('文件存在检查: 失败 - 文件不存在!');
            // 列出 uploads 目录下的文件帮助调试
            const uploadsFiles = await fs.readdir(path.join(__dirname, 'uploads'));
            console.log('Uploads 目录内容:', uploadsFiles);
            return res.status(404).json({ error: '找不到上传的文件 (ADM-ZIP Pre-check)' });
        }

        // 1. 解压 ZIP
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);

        // 2. 寻找 MD 文件 (支持嵌套目录)
        async function findMdFile(dir) {
            const items = await fs.readdir(dir);
            for (const item of items) {
                // 忽略隐藏文件 (如 ._xxx.md) 和 __MACOSX 目录
                if (item.startsWith('.') || item === '__MACOSX') continue;

                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    const found = await findMdFile(fullPath);
                    if (found) return found;
                } else if (item.toLowerCase().endsWith('.md')) {
                    return fullPath;
                }
            }
            return null;
        }

        const mdFilePath = await findMdFile(extractDir);
        if (!mdFilePath) throw new Error('ZIP 中未找到 .md 文件');

        // 获取 MD 文件所在的实际目录
        const contentDir = path.dirname(mdFilePath);
        const mdFile = path.basename(mdFilePath);

        console.log('找到 MD 文件:', mdFilePath);
        console.log('内容目录:', contentDir);

        // 3. 读取 MD 内容并解析
        const mdContent = await fs.readFile(mdFilePath, 'utf-8');

        // 配置 marked renderer 处理图片路径
        const renderer = new marked.Renderer();
        renderer.image = function ({ href, title, text }) {
            let imagePath = href;
            // 移除可能的前缀
            imagePath = imagePath.replace(/^(\.\/|\/)/, '');

            // 检查图片是否存在 (基于 contentDir)
            const absolutePath = path.join(contentDir, imagePath);
            // epub-gen 需要绝对路径
            return `<img src="${absolutePath}" alt="${text || ''}" />`;
        };

        const htmlContent = marked(mdContent, { renderer });

        // 4. 生成 EPUB
        const outputFilename = mdFile.replace(/\.md$/i, '.epub');
        // 确保使用绝对路径
        const outputDir = path.join(__dirname, 'outputs');
        await fs.mkdir(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, outputFilename);

        console.log('正在生成 EPUB:', outputPath);

        // 尝试查找封面 (基于 contentDir)
        let coverPath = undefined;
        const imagesDir = path.join(contentDir, 'images');
        try {
            const imageFiles = await fs.readdir(imagesDir);
            const foundCover = imageFiles.find(f => f.toLowerCase().startsWith('cover.'));
            if (foundCover) {
                coverPath = path.join(imagesDir, foundCover);
                console.log('找到封面:', coverPath);
            }
        } catch (e) {
            console.log('未找到 images 目录或封面:', e.message);
        }

        const epubOptions = {
            title: mdFile.replace(/\.md$/i, ''),
            author: "EPUB-MD Converter",
            content: [
                {
                    title: "Content",
                    data: htmlContent
                }
            ],
            cover: coverPath,
            verbose: true
        };

        await new Epub(epubOptions, outputPath).promise;
        console.log('EPUB 生成成功');

        res.json({
            success: true,
            message: 'EPUB 生成完成',
            downloadUrl: `/download-epub/${encodeURIComponent(outputFilename)}`
        });

    } catch (error) {
        console.error('反向转换错误:', error);
        res.status(500).json({ error: '转换失败: ' + error.message });
    }
});

// 单独的 EPUB 下载接口
// 单独的 EPUB 下载接口
app.get('/download-epub/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const decodedFilename = decodeURIComponent(filename); // 手动尝试解码，尽管 express 通常会自动处理
        const filePath = path.join(__dirname, 'outputs', filename); // 这里直接用 filename，假设 express 已经解码
        const filePathDecoded = path.join(__dirname, 'outputs', decodedFilename);

        console.log('下载请求:', filename);
        console.log('尝试路径 (直接):', filePath);

        // 安全检查
        if (!path.normalize(filePath).startsWith(path.join(__dirname, 'outputs'))) {
            return res.status(403).send('Forbidden');
        }

        try {
            await fs.access(filePath);
            res.download(filePath);
        } catch (e1) {
            console.log('直接路径未找到，尝试手动解码路径:', filePathDecoded);
            try {
                await fs.access(filePathDecoded);
                res.download(filePathDecoded);
            } catch (e2) {
                console.error('文件下载失败 - 文件不存在');
                console.error('尝试路径 1:', filePath);
                console.error('尝试路径 2:', filePathDecoded);

                // 列出 outputs 目录
                const outputFiles = await fs.readdir(path.join(__dirname, 'outputs'));
                console.log('Outputs 目录内容:', outputFiles);

                res.status(404).send('File not found');
            }
        }
    } catch (e) {
        console.error('下载接口未知错误:', e);
        res.status(500).send('Server Error');
    }
});

// 文件下载接口
app.get('/download/:dirname/:filename(*)', async (req, res) => {
    try {
        const { dirname, filename } = req.params;
        const filePath = path.join(__dirname, 'outputs', dirname, filename);

        // 安全检查
        const normalizedPath = path.normalize(filePath);
        const outputsDir = path.join(__dirname, 'outputs');

        if (!normalizedPath.startsWith(outputsDir)) {
            return res.status(403).json({ error: '无效的文件路径' });
        }

        await fs.access(filePath);
        res.download(filePath);
    } catch (error) {
        console.error('下载错误:', error);
        res.status(404).json({ error: '文件不存在' });
    }
});

// ZIP 下载（包含 MD 文件和 images 文件夹）
app.get('/download-all/:dirname', async (req, res) => {
    try {
        const { dirname } = req.params;
        const { customFilename } = req.query; // 获取自定义文件名

        // 文件实际在 uploads 文件夹中
        const dirPath = path.join(__dirname, 'uploads', dirname);

        // 安全检查
        const normalizedPath = path.normalize(dirPath);
        const uploadsDir = path.join(__dirname, 'uploads');

        if (!normalizedPath.startsWith(uploadsDir)) {
            return res.status(403).json({ error: '无效的路径' });
        }

        await fs.access(dirPath);

        console.log('创建 ZIP 压缩包:', dirPath);
        console.log('自定义文件名:', customFilename);

        // 确定 ZIP 文件名和文件夹名
        let zipName, folderName;
        if (customFilename) {
            // 使用用户自定义的文件名（去掉 .md 扩展名和首尾空格，添加 .zip）
            const baseName = customFilename.trim().replace(/\.md$/i, '');
            zipName = `${baseName}.zip`;
            folderName = baseName;
        } else {
            // 使用默认名称
            zipName = `${dirname}.zip`;
            folderName = dirname;
        }

        // 设置响应头，使用 UTF-8 编码支持中文
        // 注意：不要在 res.attachment() 中使用 encodeURIComponent，会导致文件名前多下划线
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);

        // 创建 archiver 实例
        const archive = archiver('zip', {
            zlib: { level: 9 } // 最高压缩级别
        });

        // 错误处理
        archive.on('error', (err) => {
            console.error('ZIP 创建错误:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'ZIP 创建失败' });
            }
        });

        // 监听完成事件以进行清理
        archive.on('end', async () => {
            console.log('ZIP 下载完成，准备清理临时文件');

            // 等待一小段时间确保下载完成
            setTimeout(async () => {
                try {
                    // 删除转换后的文件夹
                    await fs.rm(dirPath, { recursive: true, force: true });
                    console.log('已清理临时文件:', dirname);

                    // 删除原始 EPUB 文件
                    const epubFiles = await fs.readdir(uploadsDir);
                    for (const file of epubFiles) {
                        if (file.startsWith(dirname.split('-').slice(0, 2).join('-')) && file.endsWith('.epub')) {
                            await fs.unlink(path.join(uploadsDir, file));
                            console.log('已删除 EPUB 文件:', file);
                        }
                    }
                } catch (cleanupError) {
                    console.error('清理文件时出错:', cleanupError);
                }
            }, 2000); // 2秒后清理
        });

        // 将 archive 输出管道到响应
        archive.pipe(res);

        // 智能处理封面：如果有 cover-image.* 但没有 cover.jpg，在 ZIP 中添加为 cover.jpg
        const imagesDir = path.join(dirPath, 'images');
        try {
            const imageFiles = await fs.readdir(imagesDir);
            const coverImageFile = imageFiles.find(f => f.startsWith('cover-image.'));
            const hasCoverJpg = imageFiles.includes('cover.jpg');

            if (coverImageFile && !hasCoverJpg) {
                console.log(`发现封面文件 ${coverImageFile}，将同时添加为 cover.jpg`);

                // 先添加所有其他文件
                for (const file of imageFiles) {
                    const filePath = path.join(imagesDir, file);
                    archive.file(filePath, { name: `${folderName}/images/${file}` });
                }

                // 额外添加封面作为 cover.jpg
                const coverPath = path.join(imagesDir, coverImageFile);
                archive.file(coverPath, { name: `${folderName}/images/cover.jpg` });

                console.log('已在 ZIP 中创建 cover.jpg');
            } else {
                // 正常添加 images 目录
                archive.directory(imagesDir, `${folderName}/images`);
            }
        } catch (err) {
            console.error('处理 images 目录时出错:', err);
            // 如果出错，使用默认方式
            archive.directory(imagesDir, `${folderName}/images`);
        }

        // 添加 MD 文件和其他文件（不包括 images 目录）
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            if (file !== 'images') {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    archive.file(filePath, { name: `${folderName}/${file}` });
                }
            }
        }

        // 完成归档
        await archive.finalize();

    } catch (error) {
        console.error('下载错误:', error);
        if (!res.headersSent) {
            res.status(404).json({ error: '目录不存在' });
        }
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n✨ epub2MD GUI 服务器已启动！\n`);
    console.log(`📱 请在浏览器中访问: \x1b[36mhttp://localhost:${PORT}\x1b[0m\n`);
    console.log(`按 Ctrl+C 停止服务器\n`);
});
