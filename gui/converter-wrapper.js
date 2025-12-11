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
        mergeFileName = 'merged.md'
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

        return {
            success: true,
            outputDir: outputDir,
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
 * @returns {string} 输出目录路径
 */
function parseOutputDir(epubPath, stdout, isMerged) {
    // 尝试从输出中提取路径
    const successMatch = stdout.match(/output[:\s]+(.+?)(?:\n|$)/i);
    if (successMatch) {
        return path.basename(successMatch[1].trim());
    }

    const mergeMatch = stdout.match(/Output file[:\s]+(.+?)(?:\n|$)/i);
    if (mergeMatch) {
        const fullPath = mergeMatch[1].trim();
        return path.basename(path.dirname(fullPath));
    }

    // 如果无法解析，使用默认值
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
