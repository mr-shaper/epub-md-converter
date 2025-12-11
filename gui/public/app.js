// 全局变量
let uploadedFile = null;
let convertedData = null;

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
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');
const mergeOption = document.getElementById('mergeOption');
const mergeFilenameDiv = document.getElementById('mergeFilenameDiv');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // 文件上传
    fileInput.addEventListener('change', handleFileSelect);

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

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    // 验证文件类型
    if (!file.name.endsWith('.epub')) {
        showError('请选择 .epub 文件');
        return;
    }

    // 显示文件信息
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';

    // 上传文件
    await uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('epub', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadedFile = data;
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

    // 收集选项
    const options = {
        merge: mergeOption.checked,
        autocorrect: document.getElementById('autocorrectOption').checked,
        localize: document.getElementById('localizeOption').checked,
        mergeFileName: mergeOption.checked ? document.getElementById('mergeFilename').value : undefined
    };

    // 显示进度
    optionsSection.style.display = 'none';
    progressSection.style.display = 'block';
    progressSection.scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadedFile.filename,
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
    resultMessage.textContent = `已成功转换为 Markdown 格式${data.merge ? '（已合并）' : ''}`;

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.onclick = () => downloadResult(data);
}

function downloadResult(data) {
    // 下载合并的文件或第一个 Markdown 文件
    const downloadUrl = `/download-all/${data.outputDir}`;
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
