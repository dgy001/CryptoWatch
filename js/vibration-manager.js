/**
 * 智能振动管理系统
 * 为不同事件提供个性化的触觉反馈
 */

class VibrationManager {
    constructor() {
        // 振动模式定义（毫秒）
        this.PATTERNS = {
            // 价格相关
            priceUp: [100, 50, 100],               // 价格上涨：双击振动
            priceDown: [300],                      // 价格下跌：长振动
            priceMajorUp: [100, 50, 100, 50, 100], // 大幅上涨：三次双击
            priceMajorDown: [500],                 // 大幅下跌：超长振动
            
            // 交易相关
            newTransaction: [50, 50, 50, 50, 50],  // 新交易：五次短促
            largeTransaction: [200, 100, 200],     // 大额交易：强烈提醒
            
            // 系统相关
            success: [100],                        // 成功操作：单次短振动
            error: [200, 100, 200, 100, 200],     // 错误：警告振动
            apiError: [300, 200, 300],             // API错误：严重警告
            
            // 提醒相关
            priceAlert: [150, 100, 150, 100, 150], // 价格提醒：持续提醒
            criticalAlert: [300, 200, 300, 200, 300], // 重要警报：强烈振动
            
            // 交互相关
            click: [50],                           // 点击反馈：轻微振动
            longPress: [100, 50, 50],              // 长按：确认振动
            swipe: [30],                           // 滑动：微妙反馈
            
            // 连接状态
            connected: [100, 50, 100],             // 连接成功：双击
            disconnected: [400],                   // 连接断开：长振动
            reconnecting: [50, 50, 50]             // 重连中：快速提示
        };
        
        // 振动设置
        this.settings = {
            enabled: true,
            intensity: 1.0,  // 强度倍数
            enabledEvents: new Set([
                'priceAlert', 'criticalAlert', 'error', 'apiError',
                'newTransaction', 'largeTransaction', 'success'
            ])
        };
        
        // 振动历史（防止过频振动）
        this.lastVibration = 0;
        this.minInterval = 100; // 最小振动间隔
        
        this.init();
    }
    
    init() {
        // 从localStorage读取用户设置
        this.loadSettings();
        
        // 检查浏览器支持
        this.checkSupport();
        
        console.log('振动管理器初始化完成', {
            支持振动: this.isSupported,
            振动开启: this.settings.enabled
        });
    }
    
    // 检查浏览器支持
    checkSupport() {
        this.isSupported = 'vibrate' in navigator;
        if (!this.isSupported) {
            console.warn('当前浏览器不支持振动API');
        }
    }
    
    // 加载用户设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('vibrationSettings');
            if (saved) {
                Object.assign(this.settings, JSON.parse(saved));
                this.settings.enabledEvents = new Set(this.settings.enabledEvents);
            }
        } catch (error) {
            console.warn('加载振动设置失败:', error);
        }
    }
    
    // 保存用户设置
    saveSettings() {
        try {
            const toSave = {
                ...this.settings,
                enabledEvents: Array.from(this.settings.enabledEvents)
            };
            localStorage.setItem('vibrationSettings', JSON.stringify(toSave));
        } catch (error) {
            console.warn('保存振动设置失败:', error);
        }
    }
    
    // 主要振动方法
    vibrate(eventType, options = {}) {
        // 检查是否支持和启用
        if (!this.canVibrate(eventType)) {
            return false;
        }
        
        // 防止过频振动
        const now = Date.now();
        if (now - this.lastVibration < this.minInterval) {
            return false;
        }
        
        // 获取振动模式
        let pattern = this.getPattern(eventType, options);
        if (!pattern) {
            return false;
        }
        
        // 应用强度调整
        pattern = this.applyIntensity(pattern);
        
        // 执行振动
        try {
            navigator.vibrate(pattern);
            this.lastVibration = now;
            
            // 调试日志
            this.logVibration(eventType, pattern);
            
            return true;
        } catch (error) {
            console.warn('振动执行失败:', error);
            return false;
        }
    }
    
    // 检查是否可以振动
    canVibrate(eventType) {
        return this.isSupported && 
               this.settings.enabled && 
               this.settings.enabledEvents.has(eventType);
    }
    
    // 获取振动模式
    getPattern(eventType, options) {
        let pattern = this.PATTERNS[eventType];
        
        if (!pattern) {
            console.warn('未知的振动事件类型:', eventType);
            return null;
        }
        
        // 根据选项调整模式
        if (options.intensity) {
            pattern = pattern.map(duration => 
                Math.round(duration * options.intensity)
            );
        }
        
        if (options.repeat && options.repeat > 1) {
            const originalPattern = [...pattern];
            for (let i = 1; i < options.repeat; i++) {
                pattern.push(200); // 间隔
                pattern.push(...originalPattern);
            }
        }
        
        return pattern;
    }
    
    // 应用强度调整
    applyIntensity(pattern) {
        if (this.settings.intensity === 1.0) {
            return pattern;
        }
        
        return pattern.map(duration => 
            Math.round(duration * this.settings.intensity)
        );
    }
    
    // 记录振动日志
    logVibration(eventType, pattern) {
        if (window.DEBUG_MODE) {
            console.log(`🔮 振动事件: ${eventType}`, {
                模式: pattern,
                强度: this.settings.intensity,
                时间: new Date().toLocaleTimeString()
            });
        }
    }
    
    // 便捷方法：价格变化振动
    priceChange(oldPrice, newPrice, coinSymbol) {
        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
        const absChange = Math.abs(changePercent);
        
        let eventType;
        let options = {};
        
        if (absChange >= 10) {
            // 大幅变化
            eventType = changePercent > 0 ? 'priceMajorUp' : 'priceMajorDown';
        } else if (absChange >= 1) {
            // 普通变化
            eventType = changePercent > 0 ? 'priceUp' : 'priceDown';
        } else {
            // 微小变化，不振动
            return false;
        }
        
        // 根据变化幅度调整强度
        if (absChange >= 20) {
            options.intensity = 1.5;
        } else if (absChange >= 15) {
            options.intensity = 1.3;
        }
        
        console.log(`💰 ${coinSymbol} 价格${changePercent > 0 ? '上涨' : '下跌'} ${absChange.toFixed(2)}%`);
        
        return this.vibrate(eventType, options);
    }
    
    // 便捷方法：交易振动
    transaction(amount, type = 'normal') {
        let eventType = 'newTransaction';
        let options = {};
        
        // 判断交易规模
        if (amount >= 1000000) { // 100万
            eventType = 'largeTransaction';
            options.intensity = 1.5;
        } else if (amount >= 100000) { // 10万
            options.intensity = 1.2;
        }
        
        return this.vibrate(eventType, options);
    }
    
    // 便捷方法：系统反馈
    feedback(type, message = '') {
        const eventMap = {
            'success': 'success',
            'error': 'error',
            'warning': 'error',
            'info': 'click'
        };
        
        const eventType = eventMap[type] || 'click';
        
        if (message && window.DEBUG_MODE) {
            console.log(`🔔 系统反馈 [${type}]: ${message}`);
        }
        
        return this.vibrate(eventType);
    }
    
    // 设置管理
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        
        // 更新事件集合
        if (newSettings.enabledEvents) {
            this.settings.enabledEvents = new Set(newSettings.enabledEvents);
        }
        
        this.saveSettings();
        
        // 测试振动
        if (this.settings.enabled) {
            this.vibrate('success');
        }
    }
    
    // 获取设置
    getSettings() {
        return {
            ...this.settings,
            enabledEvents: Array.from(this.settings.enabledEvents),
            isSupported: this.isSupported
        };
    }
    
    // 测试振动
    test(eventType = 'click') {
        console.log('🧪 测试振动:', eventType);
        return this.vibrate(eventType);
    }
    
    // 停止所有振动
    stop() {
        if (this.isSupported) {
            navigator.vibrate(0);
        }
    }
    
    // 启用/禁用振动
    toggle(enabled = null) {
        this.settings.enabled = enabled !== null ? enabled : !this.settings.enabled;
        this.saveSettings();
        
        console.log(`振动${this.settings.enabled ? '已启用' : '已禁用'}`);
        
        if (this.settings.enabled) {
            this.vibrate('success');
        }
        
        return this.settings.enabled;
    }
}

// 创建全局振动管理器实例
window.vibrationManager = new VibrationManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibrationManager;
} 