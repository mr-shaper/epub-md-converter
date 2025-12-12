import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 通过子进程调用 epub2MD CLI 工具进行转换
 * @param {string} epubPath - EPUB 文件的完整路径
 * @param {Object} options - 转换选项
 * @returns {Promise<Object>} 转换结果
 */
export async function convertEpubViaCLI(epubPath, options = {}) {
    const {
        merge = false,
        autocorrect = false,
        localize = false,
        mergeFileName = 'merged.md',
        extractCoverImage = true  // 默认提取封面
    } = options;

    // 构建命令行参数
    const args = [];

    // 添加主命令（autocorrect 或 convert）
    if (autocorrect) {
        args.push('-a');
    } else {
        args.push('-c');
    }

    // 添加合并选项
    if (merge) {
        if (mergeFileName && mergeFileName !== 'merged.md') {
            args.push(`--merge="${mergeFileName}"`);
        } else {
            args.push('--merge');
        }
    }

    // 添加本地化选项
    if (localize) {
        args.push('--localize');
    }

    // 添加 EPUB 文件路径（用引号包裹以处理空格）
    args.push(`"${epubPath}"`);

    // 构建完整命令
    const cliPath = path.join(__dirname, '..', 'lib', 'bin', 'cli.cjs');
    const command = `node "${cliPath}" ${args.join(' ')}`;

    console.log('执行命令:', command);

    try {
        // 执行命令，设置较长的超时时间（5分钟）
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            timeout: 5 * 60 * 1000 // 5 minutes
        });

        // 记录输出
        if (stdout) {
            console.log('CLI 输出:', stdout);
        }
        if (stderr) {
            console.error('CLI 警告:', stderr);
        }

        // 解析输出，查找输出目录
        const outputDir = parseOutputDir(epubPath, stdout, merge);

        // 查找并引用封面图片（如果启用）
        let coverExtracted = false;
        if (extractCoverImage) {
            try {
                const { processCover } = await import('./cover-extractor.js');
                const baseDir = path.dirname(epubPath);
                const fullOutputDir = path.join(baseDir, outputDir);

                console.log('查找封面文件:', fullOutputDir);
                coverExtracted = await processCover(
                    fullOutputDir,  // 只需要输出目录
                    merge ? mergeFileName : null
                );
            } catch (coverError) {
                console.error('封面处理失败（非致命）:', coverError.message);
                // 封面处理失败不影响主流程
            }
        }

        return {
            success: true,
            outputDir: outputDir,
            coverExtracted: coverExtracted,
            stdout: stdout,
            stderr: stderr
        };

    } catch (error) {
        console.error('CLI 执行错误:', error);

        // 提取有用的错误信息
        let errorMessage = error.message;
        if (error.stdout) {
            errorMessage += '\n输出: ' + error.stdout;
        }
        if (error.stderr) {
            errorMessage += '\n错误: ' + error.stderr;
        }

        throw new Error(`EPUB 转换失败: ${errorMessage}`);
    }
}

/**
 * 从 CLI 输出中解析输出目录
 * @param {string} epubPath - 原始 EPUB 路径
 * @param {string} stdout - CLI 标准输出
 * @param {boolean} isMerged - 是否合并模式
 * @returns {string} 输出目录路径（基本名称）
 */
function parseOutputDir(epubPath, stdout, isMerged) {
    // 当合并时，CLI 输出类似：Output file: /path/to/dirname/filename.md
    // 我们需要返回 dirname
    const mergeMatch = stdout.match(/Output file[:\\s]+(.+?)(?:\n|$)/i);
    if (mergeMatch) {
        const fullPath = mergeMatch[1].trim();
        // 从完整路径获取目录名
        const dirPath = path.dirname(fullPath);
        return path.basename(dirPath);
    }

    // 非合并模式，输出类似：output: /path/to/dirname
    const successMatch = stdout.match(/output[:\\s]+(.+?)(?:\n|$)/i);
    if (successMatch) {
        return path.basename(successMatch[1].trim());
    }

    // 如果无法解析，使用 EPUB 文件名（去掉 .epub 扩展名）
    const baseName = path.basename(epubPath, '.epub');
    return baseName;
}

/**
 * 检查 CLI 是否可用
 * @returns {Promise<boolean>}
 */
export async function checkCLIAvailable() {
    try {
        const cliPath = path.join(__dirname, '..', 'lib', 'bin', 'cli.cjs');
        const { stdout } = await execAsync(`node "${cliPath}" -h`);
        return stdout.includes('epub2md');
    } catch (error) {
        console.error('CLI 检查失败:', error);
        return false;
    }
}
