// 全局变量
let uploadedFile = null;
let convertedData = null;
let selectedFile = null;
let isReverseMode = false; // 默认为 EPUB 转 MD 模式

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadSection = document.getElementById('uploadSection');
const optionsSection = document.getElementById('optionsSection');
const progressSection = document.getElementById('progressSection');
const resultSection = document.getElementById('resultSection');
const convertBtn = document.getElementById('convertBtn');
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');
const mergeOption = document.getElementById('mergeOption');
const mergeFilenameDiv = document.getElementById('mergeFilenameDiv');
const mergeFilenameInput = document.getElementById('mergeFilename'); // Added for easier access
const modeToggle = document.getElementById('modeToggle');
const subtitleText = document.getElementById('subtitleText');
const uploadTitle = document.querySelector('.upload-area h2');
const uploadText = document.querySelector('.upload-area p');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateUIForMode(); // 初始化 UI
});

function setupEventListeners() {
    // 模式切换监听
    modeToggle.addEventListener('change', (e) => {
        isReverseMode = e.target.checked;
        updateUIForMode();
        resetAll(); // 切换模式时重置状态
    });

    // 文件上传
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.onclick = () => fileInput.click();

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 合并选项变化
    mergeOption.addEventListener('change', (e) => {
        mergeFilenameDiv.style.display = e.target.checked ? 'block' : 'none';
    });
}

function updateUIForMode() {
    if (isReverseMode) {
        // 反向模式 UI
        subtitleText.textContent = '将 Markdown (ZIP) 转换为 EPUB 电子书';
        uploadTitle.textContent = '拖拽 ZIP 文件到这里';
        uploadText.textContent = 'ZIP 需包含 .md 文件和 images 文件夹';
        fileInput.accept = '.zip';
        // 隐藏不相关的选项
        document.querySelector('.options-grid').style.display = 'none';
        mergeFilenameDiv.style.display = 'none'; // 确保合并文件名输入框隐藏
    } else {
        // 默认模式 UI (还原)
        subtitleText.textContent = '轻松将 EPUB 电子书转换为 Markdown 格式';
        uploadTitle.textContent = '拖拽 EPUB 文件到这里';
        uploadText.textContent = '或点击选择文件';
        fileInput.accept = '.epub';
        // 显示选项
        document.querySelector('.options-grid').style.display = 'grid';
        // 根据 mergeOption 状态显示合并文件名输入框
        mergeFilenameDiv.style.display = mergeOption.checked ? 'block' : 'none';
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // 根据模式验证文件类型
    if (isReverseMode) {
        if (ext !== '.zip') {
            showError('反向转换模式请上传 .zip 文件');
            return;
        }
    } else {
        if (ext !== '.epub') {
            showError('请选择 EPUB 文件');
            return;
        }
    }

    uploadedFile = file;

    // 显示文件信息
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('uploadArea').style.display = 'none';

    // 在反向模式下，等待上传完成后再显示"开始转换"按钮
    // document.getElementById('optionsSection').style.display = 'block'; // 移至 uploadFile 成功后

    // 自动填充合并文件名逻辑 (仅在正向模式且是EPUB时)
    if (!isReverseMode && ext === '.epub') {
        const epubName = file.name;
        const baseName = epubName.substring(0, epubName.length - 5); // 去掉 .epub
        const suggestedName = baseName + '.md';
        document.getElementById('mergeFilename').value = suggestedName;
        console.log('自动填充合并文件名:', suggestedName);
    } else if (isReverseMode) {
        // 反向模式下，自动填充 EPUB 文件名
        const zipName = file.name;
        const baseName = zipName.substring(0, zipName.lastIndexOf('.'));
        const suggestedName = baseName + '.epub';
        document.getElementById('mergeFilename').value = suggestedName; // 暂时复用这个输入框，虽然它叫 mergeFilename
        console.log('自动填充 EPUB 文件名:', suggestedName);
    }

    // 上传文件
    await uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file); // 统一使用 'file' 作为字段名

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // 上传成功，更新 uploadedFile 为服务器返回的数据（包含安全文件名）
            // data.filename 是服务器上的安全文件名
            // data.originalName 是原始文件名
            uploadedFile = data;

            // 显示选项区域 (确保上传完成后才显示，避免 race condition)
            optionsSection.style.display = 'block';

            // 滚动到选项区域
            optionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            showError(data.error || '上传失败');
        }
    } catch (error) {
        console.error('上传错误:', error);
        showError('上传失败: ' + error.message);
    }
}

async function convertEpub() {
    if (!uploadedFile) {
        showError('请先上传文件');
        return;
    }

    // 显示进度
    optionsSection.style.display = 'none';
    progressSection.style.display = 'block';
    progressSection.scrollIntoView({ behavior: 'smooth' });

    // 判断使用哪个接口
    const endpoint = isReverseMode ? '/convert-to-epub' : '/convert';

    // 收集选项
    const options = isReverseMode ? {
        epubFilename: mergeFilenameInput.value || 'output.epub' // 反向模式下，这个是 EPUB 文件名
    } : {
        merge: mergeOption.checked,
        autocorrect: document.getElementById('autocorrectOption').checked,
        localize: document.getElementById('localizeOption').checked,
        mergeFileName: mergeOption.checked ? document.getElementById('mergeFilename').value : undefined
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadedFile.filename, // 使用服务器生成的安全文件名
                options: options
            })
        });

        const data = await response.json();

        if (data.success) {
            convertedData = data;
            showResult(data);
        } else {
            showError(data.error || '转换失败');
            progressSection.style.display = 'none';
            optionsSection.style.display = 'block';
        }
    } catch (error) {
        console.error('转换错误:', error);
        showError('转换失败: ' + error.message);
        progressSection.style.display = 'none';
        optionsSection.style.display = 'block';
    }
}

function showResult(data) {
    progressSection.style.display = 'none';
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });

    const resultMessage = document.getElementById('resultMessage');
    const downloadBtn = document.getElementById('downloadBtn');

    if (isReverseMode) {
        // 反向模式结果
        resultMessage.textContent = '已成功生成 EPUB 电子书';
        downloadBtn.innerHTML = '<span class="icon">📥</span> 下载 EPUB 文件';
        downloadBtn.onclick = () => window.location.href = data.downloadUrl;
    } else {
        // 正向模式结果
        resultMessage.textContent = `已成功转换为 Markdown 格式${data.merge ? '（已合并）' : ''} `;
        downloadBtn.innerHTML = '<span class="icon">📥</span> 下载 Markdown 文件';
        downloadBtn.onclick = () => downloadResult(data);
    }
}

function downloadResult(data) {
    // 构建下载URL，包含自定义文件名
    const customFilename = document.getElementById('mergeFilename').value || 'merged.md';
    const downloadUrl = `/download-all/${data.outputDir}?customFilename=${encodeURIComponent(customFilename)}`;

    console.log('下载URL:', downloadUrl);
    window.location.href = downloadUrl;
}

function resetUpload() {
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    fileInput.value = '';
    uploadedFile = null;
    optionsSection.style.display = 'none';
}

function resetAll() {
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    optionsSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    fileInput.value = '';
    uploadedFile = null;
    convertedData = null;

    // 重置选项
    document.getElementById('mergeFilename').value = 'merged.md';

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    errorMessage.textContent = message;
    errorToast.style.display = 'flex';

    setTimeout(() => {
        errorToast.style.display = 'none';
    }, 5000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
