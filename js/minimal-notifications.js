// 极简通知系统
class MinimalNotifications {
    constructor() {
        this.currentNotification = null;
    }
    
    // 显示通知
    show(options = {}) {
        const {
            type = 'info',
            title = '提示',
            message = '',
            buttons = [{ text: '确定', primary: true }],
            onClose = null
        } = options;
        
        // 如果已有通知，先关闭
        if (this.currentNotification) {
            this.close();
        }
        
        // 创建通知元素
        const overlay = document.createElement('div');
        overlay.className = 'minimal-notification-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'minimal-notification-dialog';
        
        // 图标映射
        const iconMap = {
            info: 'ℹ',
            warning: '⚠',
            error: '✕',
            success: '✓'
        };
        
        dialog.innerHTML = `
            <div class="minimal-notification-header">
                <div class="minimal-notification-icon ${type}">
                    ${iconMap[type] || iconMap.info}
                </div>
                <h3 class="minimal-notification-title">${title}</h3>
            </div>
            <div class="minimal-notification-body">
                <p class="minimal-notification-message">${message}</p>
            </div>
            <div class="minimal-notification-actions">
                ${buttons.map((btn, index) => `
                    <button class="minimal-notification-btn ${btn.primary ? 'primary' : ''}" 
                            data-action="${index}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 添加事件监听
        const actionButtons = dialog.querySelectorAll('.minimal-notification-btn');
        actionButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const button = buttons[index];
                if (button.action) {
                    button.action();
                }
                // 先设置结果，再关闭
                if (this.currentNotification && this.currentNotification.resolve) {
                    this.currentNotification.resolve(button);
                }
                this.close();
                if (onClose) {
                    onClose(button);
                }
            });
        });
        
        // 点击遮罩关闭（可选）
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (this.currentNotification && this.currentNotification.resolve) {
                    this.currentNotification.resolve(null);
                }
                this.close();
                if (onClose) {
                    onClose(null);
                }
            }
        });
        
        // ESC键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (this.currentNotification && this.currentNotification.resolve) {
                    this.currentNotification.resolve(null);
                }
                this.close();
                if (onClose) {
                    onClose(null);
                }
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // 显示动画
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        this.currentNotification = {
            overlay,
            dialog,
            handleEscape
        };
        
        return new Promise((resolve) => {
            this.currentNotification.resolve = resolve;
        });
    }
    
    // 关闭当前通知
    close() {
        if (!this.currentNotification) return;
        
        const { overlay, handleEscape } = this.currentNotification;
        
        overlay.classList.remove('show');
        document.removeEventListener('keydown', handleEscape);
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
        
        this.currentNotification = null;
    }
    
    // 便捷方法：信息提示
    info(message, title = '提示') {
        return this.show({
            type: 'info',
            title,
            message,
            buttons: [{ text: '确定', primary: true }]
        });
    }
    
    // 便捷方法：警告提示
    warning(message, title = '警告') {
        return this.show({
            type: 'warning',
            title,
            message,
            buttons: [{ text: '确定', primary: true }]
        });
    }
    
    // 便捷方法：错误提示
    error(message, title = '错误') {
        return this.show({
            type: 'error',
            title,
            message,
            buttons: [{ text: '确定', primary: true }]
        });
    }
    
    // 便捷方法：成功提示
    success(message, title = '成功') {
        return this.show({
            type: 'success',
            title,
            message,
            buttons: [{ text: '确定', primary: true }]
        });
    }
    
    // 便捷方法：确认对话框
    confirm(message, title = '确认') {
        return this.show({
            type: 'warning',
            title,
            message,
            buttons: [
                { text: '取消', primary: false },
                { text: '确定', primary: true }
            ]
        }).then((result) => {
            return result && result.text === '确定';
        });
    }
    
    // 便捷方法：输入对话框
    prompt(message, title = '输入', defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'minimal-notification-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = 'minimal-notification-dialog';
            
            dialog.innerHTML = `
                <div class="minimal-notification-header">
                    <div class="minimal-notification-icon info">ℹ</div>
                    <h3 class="minimal-notification-title">${title}</h3>
                </div>
                <div class="minimal-notification-body">
                    <p class="minimal-notification-message">${message}</p>
                    <input type="text" class="minimal-input" value="${defaultValue}" 
                           style="margin-top: var(--minimal-space-md); width: 100%;">
                </div>
                <div class="minimal-notification-actions">
                    <button class="minimal-notification-btn" data-action="cancel">取消</button>
                    <button class="minimal-notification-btn primary" data-action="ok">确定</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const input = dialog.querySelector('.minimal-input');
            const cancelBtn = dialog.querySelector('[data-action="cancel"]');
            const okBtn = dialog.querySelector('[data-action="ok"]');
            
            const cleanup = () => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 300);
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            
            okBtn.addEventListener('click', () => {
                cleanup();
                resolve(input.value);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    cleanup();
                    resolve(input.value);
                } else if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            });
            
            // 显示动画
            setTimeout(() => {
                overlay.classList.add('show');
                input.focus();
                input.select();
            }, 10);
        });
    }
}

// 创建全局实例
window.MinimalNotify = new MinimalNotifications();

// 替换原生alert函数（可选）
window.minimalAlert = window.MinimalNotify.info.bind(window.MinimalNotify);
window.minimalConfirm = window.MinimalNotify.confirm.bind(window.MinimalNotify);
window.minimalPrompt = window.MinimalNotify.prompt.bind(window.MinimalNotify); 