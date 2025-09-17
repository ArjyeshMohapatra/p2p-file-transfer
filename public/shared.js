async function copyText(text) {
    // modern and secure way of copying to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            showMessage('Code copied to clipboard', 'success');
        } catch (err) {
            console.error('Failed to copy code:', err);
            showMessage('Failed to copy code', 'error');
        }
        return // prevents fallback method from running unnecessarily
    }

    // Fallback for insecure pages (like http://)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        showMessage('Code copied to clipboard', 'success');
        return document.execCommand("copy"); // an old API to copy content
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showMessage('Failed to copy code', 'error');
    } finally {
        textArea.remove();
    }
}

function navigateWithAnimation(url) {
    const body = document.body;
    body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 450);
}

function showMessage(msgText, type = 'info') {
    const message = document.getElementById('message');
    if (!message) return;
    message.textContent = msgText;
    message.className = ''; // Clear previous classes
    message.classList.add(type);
    message.classList.add('show');

    setTimeout(() => {
        message.classList.remove('show');
    }, 2400);
}

function getIconByFileType(fileName) {
    // const ext = fileName.split('.').pop().toLowerCase();
    const index = fileName.lastIndexOf('.');
    const ext = index > 0 && index < fileName.length - 1 ? fileName.slice(index + 1).toLowerCase() : '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'fa-file-image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'fa-file-video';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'fa-file-audio';
    if (['pdf'].includes(ext)) return 'fa-file-pdf';
    if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'fa-file-word';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'fa-file-excel';
    if (['ppt', 'pptx', 'odp'].includes(ext)) return 'fa-file-powerpoint';
    if (['txt', 'md', 'log'].includes(ext)) return 'fa-file-lines';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-file-zipper';
    if (['html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'json5', 'xml', 'yml', 'yaml', 'toml', 'ini', 'conf', 'svg'].includes(ext)) {
        return 'fa-file-code';
    }
    if (['js', 'mjs', 'cjs'].includes(ext)) return 'fa-brands fa-js';
    if (['php'].includes(ext)) return 'fa-brands fa-php';
    if (['py', 'pyw'].includes(ext)) return 'fa-brands fa-python';
    if (['swift'].includes(ext)) return 'fa-brands fa-swift';
    if (['r', 'rscript'].includes(ext)) return 'fa-brands fa-r-project';
    if (['ts', 'tsx', 'jsx', 'java', 'kt', 'kts', 'scala', 'c', 'h', 'hh', 'hpp', 'cpp', 'cxx', 'cc', 'cs', 'go', 'rs', 'rb', 'sh', 'bash', 'zsh', 'ps1', 'psm1', 'bat', 'cmd', 'sql'].includes(ext)) {
        return 'fa-file-code';
    }
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showConfirm(message, onYes, onNo) {
    const overlay = document.getElementById("confirmDialog");
    const msg = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    msg.textContent = message;
    overlay.style.display = "flex";

    yesBtn.onclick = () => {
        overlay.style.display = "none";
        if (onYes) onYes();
    };

    noBtn.onclick = () => {
        overlay.style.display = "none";
        if (onNo) onNo();
    };
}

let screenWakeLock = null;
async function toggleWakeLock(enable) {
    const checkbox = document.getElementById('keepScreenOnCheckbox');
    if (!('wakeLock' in navigator)) {
        console.log('Screen Wake Lock API not supported.');
        showMessage('Keep screen on feature is not supported by this browser.', 'info');
        if (checkbox) {
            checkbox.checked = false;
            checkbox.disabled = true;
            return;
        }
    }
    if (enable) {
        try {
            screenWakeLock = await navigator.wakeLock.request('screen');
            screenWakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock was released automatically.');
                showMessage('Screen lock released.', 'info');
                if (checkbox) checkbox.checked = false;
            })
            console.log('Screen Wake Lock is active.');
            showMessage('Screen will stay on.', 'success');
        } catch (error) {
            console.error(`${error.name}, ${error.message}`);
            showMessage('Could not activate screen lock.', 'error');
            if (checkbox) checkbox.checked = false;
        }
    } else {
        // if the lock is already active, release it
        if (screenWakeLock !== null) {
            await screenWakeLock.release();
            screenWakeLock = null;
            console.log('Screen Wake Lock released.');
        }
    }
}

function handleBeforeUnload(event) {
    // checks if a connection object exists and is open
    const isConnected = window.connection && window.connection.open;

    // checks if the sender is actively transferring a file.
    const isSenderTransferring = window.isTransferring;

    // checks if the receiver has any files in its list (which implies a transfer has started).
    const isReceiverActive = window.incomingFiles && Object.keys(window.incomingFiles).length > 0;

    if (isConnected || isSenderTransferring || isReceiverActive) {
        event.preventDefault();
        event.returnValue = '';
    }
}

function initializeDarkMode() {
    const darkModeButton = document.getElementById("darkModeButton");
    if (!darkModeButton) return;

    function setDarkIcon(state) {
        darkModeButton.innerHTML = state === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }

    if (localStorage.getItem('theme') === 'dark') {
        setDarkIcon('dark');
    } else {
        setDarkIcon('light');
    }

    darkModeButton.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        setDarkIcon(isDark ? 'dark' : 'light');
    });
}

function pageShow() {
    window.addEventListener("pageshow", () => {
        const body = document.body;
        body.classList.remove("fade-out");
        body.classList.add("fade-in");
    });
}