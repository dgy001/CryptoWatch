// 页面内通知系统 - 轻量级弹窗
class PageNotifications {
    constructor() {
        this.notifications = new Set();
        this.maxNotifications = 3; // 最多同时显示3个通知
    }
    
    // 显示通知
    show(options = {}) {
        const {
            type = 'info',
            title = '提示',
            message = '',
            duration = 4000,
            icon = null
        } = options;
        
        // 如果通知太多，移除最旧的
        if (this.notifications.size >= this.maxNotifications) {
            const oldest = this.notifications.values().next().value;
            this.remove(oldest);
        }
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `page-notification page-notification-${type}`;
        
        // 图标映射
        const iconMap = {
            info: 'ℹ',
            warning: '⚠',
            error: '✕',
            success: '✓'
        };
        
        const displayIcon = icon || iconMap[type] || iconMap.info;
        
        notification.innerHTML = `
            <div class="page-notification-content">
                <div class="page-notification-icon">${displayIcon}</div>
                <div class="page-notification-text">
                    <div class="page-notification-title">${title}</div>
                    <div class="page-notification-message">${message}</div>
                </div>
                <button class="page-notification-close">&times;</button>
            </div>
        `;
        
        // 添加关闭按钮事件
        const closeBtn = notification.querySelector('.page-notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification);
        });
        
        // 添加到页面
        document.body.appendChild(notification);
        this.notifications.add(notification);
        
        // 计算位置（从右上角开始堆叠）
        this.updatePositions();
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    }
    
    // 移除通知
    remove(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.add('hide');
        this.notifications.delete(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.updatePositions();
        }, 300);
    }
    
    // 更新所有通知的位置
    updatePositions() {
        const notificationArray = Array.from(this.notifications);
        notificationArray.forEach((notification, index) => {
            const topOffset = 20 + (index * 80); // 每个通知间隔80px
            notification.style.top = `${topOffset}px`;
        });
    }
    
    // 便捷方法
    info(message, title = '提示', duration = 4000) {
        return this.show({
            type: 'info',
            title,
            message,
            duration
        });
    }
    
    success(message, title = '成功', duration = 4000) {
        return this.show({
            type: 'success',
            title,
            message,
            duration
        });
    }
    
    warning(message, title = '警告', duration = 5000) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration
        });
    }
    
    error(message, title = '错误', duration = 6000) {
        return this.show({
            type: 'error',
            title,
            message,
            duration
        });
    }
    
    // 清除所有通知
    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// 创建全局实例
window.PageNotify = new PageNotifications();

// 兼容性别名
window.Toast = window.PageNotify; 