import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.epub') {
            cb(null, true);
        } else {
            cb(new Error('只支持 .epub 文件'));
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
app.post('/upload', upload.single('epub'), async (req, res) => {
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
