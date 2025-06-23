// 全局价格提醒系统
class GlobalPriceAlerts {
    constructor() {
        this.alerts = {};
        this.trackedCoins = [];
        this.lastPrices = {};
        this.updateInterval = null;
        this.isInitialized = false;
        
        // API配置
        this.COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
        this.CG_API_KEY = 'CG-ssXWaw72QCZGNRBNxVtFYCWy';
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // 检查是否在价格提醒页面，如果是则不启动全局监控
        if (window.location.pathname.includes('price-alert.html')) {
            console.log('在价格提醒页面，全局价格提醒系统暂停运行');
            return;
        }
        
        this.loadState();
        this.requestNotificationPermission();
        this.startPriceUpdates();
        this.isInitialized = true;
        
        console.log('全局价格提醒系统已启动');
    }
    
    loadState() {
        try {
            const storedAlerts = localStorage.getItem('coinAlerts');
            this.alerts = storedAlerts ? JSON.parse(storedAlerts) : {};
            
            const storedCoins = localStorage.getItem('trackedCoins');
            this.trackedCoins = storedCoins ? JSON.parse(storedCoins) : [];
            
            const storedLastPrices = localStorage.getItem('lastPrices');
            this.lastPrices = storedLastPrices ? JSON.parse(storedLastPrices) : {};
            
            console.log('已加载价格提醒状态:', {
                alerts: Object.keys(this.alerts).length,
                coins: this.trackedCoins.length
            });
        } catch (error) {
            console.error('加载价格提醒状态失败:', error);
        }
    }
    
    saveState() {
        try {
            localStorage.setItem('lastPrices', JSON.stringify(this.lastPrices));
        } catch (error) {
            console.error('保存价格提醒状态失败:', error);
        }
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
    
    startPriceUpdates() {
        // 清除现有定时器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // 如果有监控的币种，开始定时更新
        if (this.trackedCoins.length > 0) {
            this.updatePrices(); // 立即执行一次
            this.updateInterval = setInterval(() => {
                this.updatePrices();
            }, 30000); // 30秒更新一次
        }
    }
    
    async updatePrices() {
        if (this.trackedCoins.length === 0) return;
        
        try {
            const coinIds = this.trackedCoins.map(coin => coin.id).join(',');
            const response = await fetch(
                `${this.COINGECKO_BASE_URL}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // 检查每个币种的价格变化
            Object.keys(data).forEach(coinId => {
                const newPrice = data[coinId].usd;
                if (newPrice !== null && newPrice !== undefined) {
                    this.checkAlerts(coinId, newPrice);
                    this.lastPrices[coinId] = newPrice;
                }
            });
            
            this.saveState();
            
        } catch (error) {
            console.error('全局价格更新失败:', error);
        }
    }
    
    checkAlerts(coinId, newPrice) {
        if (!this.alerts[coinId] || newPrice === null) return;
        
        const prevPrice = this.lastPrices[coinId];
        const now = Date.now();
        
        this.alerts[coinId].forEach(alert => {
            // 跳过非活跃的提醒
            if ((!alert.active && !alert.repeat) || (alert.repeat && alert.manuallyDeactivated)) {
                return;
            }
            
            let triggered = false;
            
            // 检查触发条件
            switch (alert.condition) {
                case 'above':
                    if (newPrice >= alert.price) triggered = true;
                    break;
                case 'below':
                    if (newPrice <= alert.price) triggered = true;
                    break;
                case 'crosses':
                    if (prevPrice !== undefined) {
                        const crossedUp = prevPrice < alert.price && newPrice >= alert.price;
                        const crossedDown = prevPrice > alert.price && newPrice <= alert.price;
                        if (crossedUp || crossedDown) triggered = true;
                    }
                    break;
            }
            
            // 触发提醒
            if (triggered) {
                if (alert.repeat) {
                    // 重复提醒：检查间隔时间
                    if (now - alert.lastTriggered >= alert.interval) {
                        this.triggerNotification(coinId, alert, newPrice);
                        alert.lastTriggered = now;
                        this.saveAlerts();
                    }
                } else {
                    // 单次提醒：只触发一次
                    if (alert.active) {
                        this.triggerNotification(coinId, alert, newPrice);
                        alert.active = false;
                        this.saveAlerts();
                    }
                }
            }
        });
    }
    
    triggerNotification(coinId, alert, currentPrice) {
        const coin = this.trackedCoins.find(c => c.id === coinId);
        if (!coin) return;
        
        console.log('触发价格提醒:', coin.name, alert.condition, alert.price);
        
        // 播放提醒声音
        if (alert.sound) {
            const audio = new Audio(alert.sound);
            audio.play().catch(e => console.log('音频播放失败:', e));
        }
        
        // 显示浏览器通知
        if ('Notification' in window && Notification.permission === 'granted') {
            const conditionText = this.getConditionText(alert.condition);
            new Notification(`${coin.name} 价格提醒`, {
                body: `${conditionText} $${alert.price}\n当前价格: $${currentPrice.toFixed(8)}`,
                icon: coin.thumb || coin.large,
                tag: `price-alert-${coinId}-${alert.id}`, // 避免重复通知
                requireInteraction: true // 需要用户交互才关闭
            });
        }
        
        // 显示页面内通知
        this.showPageNotification(coin, alert, currentPrice);
    }
    
    showPageNotification(coin, alert, currentPrice) {
        // 创建页面内通知
        const notification = document.createElement('div');
        notification.className = 'global-price-notification';
        
        const conditionText = this.getConditionText(alert.condition);
        
        notification.innerHTML = `
            <div class="global-notification-header">
                <img src="${coin.thumb || coin.large}" alt="${coin.name}" class="global-notification-icon">
                <div class="global-notification-title">${coin.name} 价格提醒</div>
                <button class="global-notification-close">&times;</button>
            </div>
            <div class="global-notification-body">
                <div class="global-notification-text">${conditionText} $${alert.price}</div>
                <div class="global-notification-current">当前价格: $${currentPrice.toFixed(8)}</div>
            </div>
        `;
        
        // 添加关闭按钮事件
        notification.querySelector('.global-notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 自动关闭（10秒后）
        setTimeout(() => {
            this.removeNotification(notification);
        }, 10000);
        
        // 添加显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }
    
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    getConditionText(condition) {
        switch (condition) {
            case 'above': return '价格上涨至';
            case 'below': return '价格下跌至';
            case 'crosses': return '价格穿过';
            default: return '价格变动至';
        }
    }
    
    saveAlerts() {
        try {
            localStorage.setItem('coinAlerts', JSON.stringify(this.alerts));
        } catch (error) {
            console.error('保存提醒状态失败:', error);
        }
    }
    
    // 公共方法：重新加载状态（当其他页面更新了提醒设置时调用）
    reloadState() {
        // 检查是否在价格提醒页面，如果是则不重新启动
        if (window.location.pathname.includes('price-alert.html')) {
            return;
        }
        
        this.loadState();
        this.startPriceUpdates();
    }
    
    // 公共方法：停止监控
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('全局价格提醒系统已停止');
    }
}

// 创建全局实例
window.globalPriceAlerts = new GlobalPriceAlerts(); 