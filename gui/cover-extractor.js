import path from 'path';
import fs from 'fs/promises';

/**
 * 查找 images 目录中的封面文件
 * epub2MD CLI 可能会保存封面为 cover-image.png 或 cover.jpg 等
 * @param {string} outputDir - 输出目录路径
 * @returns {Promise<string|null>} 封面文件名，如果没有找到返回 null
 */
export async function findCoverImage(outputDir) {
    try {
        const imagesDir = path.join(outputDir, 'images');

        // 检查 images 目录是否存在
        try {
            await fs.access(imagesDir);
        } catch {
            console.log('images 目录不存在');
            return null;
        }

        const files = await fs.readdir(imagesDir);

        // 可能的封面文件名模式
        const coverPatterns = [
            'cover-image.png',
            'cover-image.jpg',
            'cover-image.jpeg',
            'cover.png',
            'cover.jpg',
            'cover.jpeg',
            'cover.gif'
        ];

        // 查找封面文件
        for (const pattern of coverPatterns) {
            if (files.includes(pattern)) {
                console.log('找到封面文件:', pattern);
                return pattern;
            }
        }

        // 如果没找到精确匹配，尝试模糊匹配
        const coverFile = files.find(f =>
            f.toLowerCase().includes('cover') &&
            /\.(png|jpg|jpeg|gif)$/i.test(f)
        );

        if (coverFile) {
            console.log('找到封面文件（模糊匹配）:', coverFile);
            return coverFile;
        }

        console.log('未找到封面文件');
        return null;

    } catch (error) {
        console.error('查找封面文件时出错:', error);
        return null;
    }
}

/**
 * 确保 MD 中有正确的封面引用
 * @param {string} mdFilePath - Markdown 文件路径
 * @param {string} coverFilename - 封面文件名（相对于 images 目录）
 */
async function ensureCoverReference(mdFilePath, coverFilename) {
    try {
        const content = await fs.readFile(mdFilePath, 'utf8');

        // 如果已经有正确的引用
        if (content.includes(`./images/${coverFilename}`)) {
            console.log('MD 文件已有正确的封面引用');
            return;
        }

        // 检查是否有错误的封面引用需要替换
        const wrongPatterns = [
            /!\[封面\]\(\.\/images\/cover\.[^)]+\)/g,
            /!\[\]\(\.\/images\/cover\.[^)]+\)/g,
            /!\[cover\]\(\.\/images\/cover\.[^)]+\)/gi
        ];

        let updated = content;
        let replaced = false;

        for (const pattern of wrongPatterns) {
            if (pattern.test(content)) {
                updated = updated.replace(pattern, `![封面](./images/${coverFilename})`);
                replaced = true;
                console.log('已替换错误的封面引用');
                break;
            }
        }

        // 如果没有任何封面引用，在开头添加
        if (!replaced && !content.includes('./images/cover')) {
            updated = `![封面](./images/${coverFilename})\n\n---\n\n` + content;
            console.log('已在开头添加封面引用');
            replaced = true;
        }

        if (replaced) {
            await fs.writeFile(mdFilePath, updated, 'utf8');
            console.log('已更新 MD 文件的封面引用');
        }

    } catch (error) {
        console.error('更新封面引用时出错:', error);
    }
}

/**
 * 处理封面：查找现有封面，复制为标准名称，并添加到 MD
 * @param {string} outputDir - 输出目录路径
 * @param {string} mdFileName - Markdown 文件名（可选）
 */
export async function processCover(outputDir, mdFileName = null) {
    console.log('\n=== 开始处理封面 ===');

    // 1. 查找封面文件
    const coverFilename = await findCoverImage(outputDir);

    if (!coverFilename) {
        console.log('未找到封面文件，跳过');
        return false;
    }

    // 2. 如果封面不是 cover.jpg，复制一份
    const standardName = 'cover.jpg';
    if (coverFilename !== standardName) {
        try {
            const imagesDir = path.join(outputDir, 'images');
            const sourcePath = path.join(imagesDir, coverFilename);
            const targetPath = path.join(imagesDir, standardName);

            await fs.copyFile(sourcePath, targetPath);
            console.log(`已复制 ${coverFilename} -> ${standardName}`);
        } catch (error) {
            console.error('复制封面文件时出错:', error);
            // 如果复制失败，使用原文件名
        }
    }

    // 3. 查找 Markdown 文件
    let mdFiles = [];
    if (mdFileName) {
        mdFiles = [path.join(outputDir, mdFileName)];
    } else {
        // 查找所有 .md 文件
        const files = await fs.readdir(outputDir);
        mdFiles = files
            .filter(f => f.endsWith('.md'))
            .map(f => path.join(outputDir, f));
    }

    // 4. 为每个 Markdown 文件确保有正确的封面引用
    for (const mdFile of mdFiles) {
        try {
            // 始终使用 cover.jpg 作为引用
            await ensureCoverReference(mdFile, standardName);
        } catch (error) {
            console.error(`处理 ${mdFile} 时出错:`, error);
        }
    }

    console.log('=== 封面处理完成 ===\n');
    return true;
}


/**
 * 查找 images 目录中的封面文件
 * epub2MD CLI 可能会保存封面为 cover-image.png 或 cover.jpg 等
 * @param {string} outputDir - 输出目录路径
 * @returns {Promise<string|null>} 封面文件名，如果没有找到返回 null
 */
export async function findCoverImage(outputDir) {
    try {
        const imagesDir = path.join(outputDir, 'images');

        // 检查 images 目录是否存在
        try {
            await fs.access(imagesDir);
        } catch {
            console.log('images 目录不存在');
            return null;
        }

        const files = await fs.readdir(imagesDir);

        // 可能的封面文件名模式
        const coverPatterns = [
            'cover-image.png',
            'cover-image.jpg',
            'cover-image.jpeg',
            'cover.png',
            'cover.jpg',
            'cover.jpeg',
            'cover.gif'
        ];

        // 查找封面文件
        for (const pattern of coverPatterns) {
            if (files.includes(pattern)) {
                console.log('找到封面文件:', pattern);
                return pattern;
            }
        }

        // 如果没找到精确匹配，尝试模糊匹配
        const coverFile = files.find(f =>
            f.toLowerCase().includes('cover') &&
            /\.(png|jpg|jpeg|gif)$/i.test(f)
        );

        if (coverFile) {
            console.log('找到封面文件（模糊匹配）:', coverFile);
            return coverFile;
        }

        console.log('未找到封面文件');
        return null;

    } catch (error) {
        console.error('查找封面文件时出错:', error);
        return null;
    }
}

/**
 * 在 Markdown 文件开头添加封面引用
 * @param {string} mdFilePath - Markdown 文件路径
 * @param {string} coverFilename - 封面文件名（相对于 images 目录）
 */
export async function addCoverToMarkdown(mdFilePath, coverFilename) {
    try {
        const content = await fs.readFile(mdFilePath, 'utf8');

        // 检查是否已经有封面引用
        if (content.includes('![封面]') || content.includes('![cover]') || content.includes('![](./images/')) {
            console.log('Markdown 文件已包含封面引用，跳过');
            return;
        }

        // 在开头添加封面
        const coverMarkdown = `![封面](./images/${coverFilename})\n\n---\n\n`;
        const newContent = coverMarkdown + content;

        await fs.writeFile(mdFilePath, newContent, 'utf8');
        console.log('已添加封面到 Markdown 文件');

    } catch (error) {
        console.error('添加封面到 Markdown 时出错:', error);
    }
}

/**
 * 处理封面：查找现有封面并添加到 MD
 * @param {string} outputDir - 输出目录路径
 * @param {string} mdFileName - Markdown 文件名（可选）
 */
export async function processCover(outputDir, mdFileName = null) {
    console.log('\n=== 开始处理封面 ===');

    // 1. 查找封面文件
    const coverFilename = await findCoverImage(outputDir);

    if (!coverFilename) {
        console.log('未找到封面文件，跳过');
        return false;
    }

    // 2. 查找 Markdown 文件
    let mdFiles = [];
    if (mdFileName) {
        mdFiles = [path.join(outputDir, mdFileName)];
    } else {
        // 查找所有 .md 文件
        const files = await fs.readdir(outputDir);
        mdFiles = files
            .filter(f => f.endsWith('.md'))
            .map(f => path.join(outputDir, f));
    }

    // 3. 为每个 Markdown 文件添加封面
    for (const mdFile of mdFiles) {
        try {
            await addCoverToMarkdown(mdFile, coverFilename);
        } catch (error) {
            console.error(`处理 ${mdFile} 时出错:`, error);
        }
    }

    console.log('=== 封面处理完成 ===\n');
    return true;
}
