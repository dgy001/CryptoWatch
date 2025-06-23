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
            refresh: [80, 40, 80],                 // 刷新：双击振动
            
            // 连接状态
            connected: [100, 50, 100],             // 连接成功：双击
            disconnected: [400],                   // 连接断开：长振动
            monitoring: [60, 40, 60]               // 开始监控：确认振动
        };
        
        // 振动设置
        this.settings = {
            enabled: true,
            intensity: 1.0,  // 强度倍数
            enabledEvents: new Set([
                'newTransaction', 'largeTransaction', 'success', 'error',
                'apiError', 'connected', 'disconnected', 'monitoring'
            ])
        };
        
        // 振动历史（防止过频振动）
        this.lastVibration = 0;
        this.minInterval = 100; // 最小振动间隔
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.checkSupport();
        console.log('🔮 振动管理器初始化完成', {
            支持振动: this.isSupported,
            振动开启: this.settings.enabled
        });
    }
    
    checkSupport() {
        this.isSupported = 'vibrate' in navigator;
        if (!this.isSupported) {
            console.warn('当前浏览器不支持振动API');
        }
    }
    
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
    
    vibrate(eventType, options = {}) {
        if (!this.canVibrate(eventType)) {
            return false;
        }
        
        const now = Date.now();
        if (now - this.lastVibration < this.minInterval) {
            return false;
        }
        
        let pattern = this.getPattern(eventType, options);
        if (!pattern) {
            return false;
        }
        
        pattern = this.applyIntensity(pattern);
        
        try {
            navigator.vibrate(pattern);
            this.lastVibration = now;
            this.logVibration(eventType, pattern);
            return true;
        } catch (error) {
            console.warn('振动执行失败:', error);
            return false;
        }
    }
    
    canVibrate(eventType) {
        return this.isSupported && 
               this.settings.enabled && 
               this.settings.enabledEvents.has(eventType);
    }
    
    getPattern(eventType, options) {
        let pattern = this.PATTERNS[eventType];
        
        if (!pattern) {
            console.warn('未知的振动事件类型:', eventType);
            return null;
        }
        
        if (options.intensity) {
            pattern = pattern.map(duration => 
                Math.round(duration * options.intensity)
            );
        }
        
        return pattern;
    }
    
    applyIntensity(pattern) {
        if (this.settings.intensity === 1.0) {
            return pattern;
        }
        
        return pattern.map(duration => 
            Math.round(duration * this.settings.intensity)
        );
    }
    
    logVibration(eventType, pattern) {
        if (window.debugMode) {
            console.log(`🔮 振动事件: ${eventType}`, {
                模式: pattern,
                强度: this.settings.intensity,
                时间: new Date().toLocaleTimeString()
            });
        }
    }
    
    // 便捷方法
    feedback(type, message = '') {
        const eventMap = {
            'success': 'success',
            'error': 'error',
            'warning': 'error',
            'info': 'click'
        };
        
        const eventType = eventMap[type] || 'click';
        
        if (message && window.debugMode) {
            console.log(`🔔 系统反馈 [${type}]: ${message}`);
        }
        
        return this.vibrate(eventType);
    }
    
    transaction(amount = 0, type = 'normal') {
        let eventType = 'newTransaction';
        let options = {};
        
        if (amount >= 1000000) {
            eventType = 'largeTransaction';
            options.intensity = 1.5;
        } else if (amount >= 100000) {
            options.intensity = 1.2;
        }
        
        return this.vibrate(eventType, options);
    }
    
    test(eventType = 'click') {
        console.log('🧪 测试振动:', eventType);
        return this.vibrate(eventType);
    }
    
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

document.addEventListener('DOMContentLoaded', () => {
    const addressNameInput = document.getElementById('address-name-input');
    const addressAddInput = document.getElementById('address-add-input');
    const addressAddBtn = document.getElementById('address-add-btn');
    // const addressSelect = document.getElementById('address-select'); // 已删除
    const transactionsBody = document.getElementById('transactions-body');
    const walletsList = document.getElementById('wallets-list');
    const walletCount = document.getElementById('wallet-count');
    const monitoringStatus = document.getElementById('monitoring-status');
    const monitoringIndicator = document.getElementById('monitoring-indicator');
    const refreshBtn = document.getElementById('refresh-btn');
    const exportBtn = document.getElementById('export-btn');
    // const deleteBtn = document.getElementById('address-delete-btn'); // 已移动到钱包项目中
    const loadingSpinner = document.getElementById('loading-spinner');
    const emptyState = document.getElementById('empty-state');

    const tableContainer = document.getElementById('transactions-table-container');

    // 调试模式开关 (按F12或者在控制台输入 window.debugMode = true)
    window.debugMode = localStorage.getItem('debugMode') === 'true';
    
    // 调试日志函数
    function debugLog(message, data = null) {
        if (window.debugMode) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }

    // 启用调试模式的快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
            e.preventDefault();
            window.debugMode = !window.debugMode;
            localStorage.setItem('debugMode', window.debugMode.toString());
            
            if (window.debugMode) {
                const apiStatus = getApiKeyStatus();
                showNotification(`调试模式已开启 - API KEY状态: ${apiStatus.available}/${apiStatus.total} 可用`, 'info');
            } else {
                showNotification('调试模式已关闭', 'info');
            }
        }
        
        // 调试模式下的特殊命令
        if (window.debugMode) {
            // 按 Ctrl+I 显示API KEY状态详情
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                const status = getApiKeyStatus();
                console.log('=== API KEY 状态详情 ===');
                console.log(`总计: ${status.total} 个API KEY`);
                console.log(`当前使用: 第 ${status.current} 个`);
                console.log(`失败数量: ${status.failed} 个`);
                console.log(`可用数量: ${status.available} 个`);
                console.log(`失败的API KEY索引:`, Array.from(failedApiKeys));
                
                // 显示每个API KEY的最后几位字符
                MORALIS_API_KEYS.forEach((key, index) => {
                    const status = failedApiKeys.has(index) ? '❌失败' : '✅正常';
                    const current = index === currentApiKeyIndex ? '👉当前' : '';
                    console.log(`API KEY ${index + 1}: ...${key.slice(-8)} ${status} ${current}`);
                });
                
                showNotification(`API状态: ${status.available}/${status.total} 可用, 当前第${status.current}个`, 'info');
            }
            
            // 按 Ctrl+T 测试当前API KEY
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                testCurrentApiKey();
            }
            
            // 按 Ctrl+Shift+T 测试所有API KEY
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                testAllApiKeys();
            }
        }
    });

    // Moralis API Keys 数组，支持自动切换
    const MORALIS_API_KEYS = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImQ1YzM3NGVhLTg5YzktNDQ5Ni05MjlmLTE4NDcyZDM3MDFjNiIsIm9yZ0lkIjoiNDU0ODAyIiwidXNlcklkIjoiNDY3OTMyIiwidHlwZUlkIjoiNjNjMmUyYTAtYjNmOC00NGM4LWIxZDgtZmEyNWExY2UzYmEyIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTAzNDAyNzUsImV4cCI6NDkwNjEwMDI3NX0.L8VeEzXNG5GmSmTl4pbmzvdYuDRxErzZIyzng6TqCBk',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjFlZGU2ZjI5LWM4ZjYtNGFjNi04MTQ5LWQ0ZWQzOTRjY2I5ZSIsIm9yZ0lkIjoiNDU1MzMwIiwidXNlcklkIjoiNDY4NDcyIiwidHlwZUlkIjoiZThiZjU3YzItYTIyOC00OGZhLWE3YzctN2JiMzM2MWRjZGEyIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTA2NjU5MTcsImV4cCI6NDkwNjQyNTkxN30.OumtbP3l0AY8LUJokC9YHYRc9guPZfmtiO44JugoQJQ'
    ];
    
    // API KEY状态管理
    let currentApiKeyIndex = 0;
    let failedApiKeys = new Set(); // 记录失败的API KEY
    
    // 获取当前可用的API KEY
    function getCurrentApiKey() {
        // 如果当前API KEY失败过，尝试下一个
        while (failedApiKeys.has(currentApiKeyIndex) && failedApiKeys.size < MORALIS_API_KEYS.length) {
            currentApiKeyIndex = (currentApiKeyIndex + 1) % MORALIS_API_KEYS.length;
        }
        
        // 如果所有API KEY都失败了，重置失败记录并重新开始
        if (failedApiKeys.size >= MORALIS_API_KEYS.length) {
            failedApiKeys.clear();
            currentApiKeyIndex = 0;
            debugLog('所有API KEY都失败过，重置状态');
        }
        
        return MORALIS_API_KEYS[currentApiKeyIndex];
    }
    
    // 标记当前API KEY为失败并切换到下一个
    function markCurrentApiKeyAsFailed() {
        failedApiKeys.add(currentApiKeyIndex);
        currentApiKeyIndex = (currentApiKeyIndex + 1) % MORALIS_API_KEYS.length;
        debugLog(`API KEY ${currentApiKeyIndex} 失败，切换到下一个`);
    }
    
    // 重置所有API KEY状态
    function resetApiKeyStatus() {
        failedApiKeys.clear();
        currentApiKeyIndex = 0;
        debugLog('API KEY状态已重置');
        showNotification('API KEY状态已重置', 'info');
    }
    
    // 测试当前API KEY
    async function testCurrentApiKey() {
        const currentKey = getCurrentApiKey();
        const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik的地址
        
        try {
            showNotification('正在测试API KEY...', 'info');
            debugLog(`测试API KEY ${currentApiKeyIndex + 1}: ...${currentKey.slice(-8)}`);
            
            const response = await fetch(`https://deep-index.moralis.io/api/v2.2/${testAddress}?chain=0x1&limit=1`, {
                headers: {
                    'X-API-Key': currentKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                debugLog(`API KEY ${currentApiKeyIndex + 1} 测试成功`);
                showNotification(`API KEY ${currentApiKeyIndex + 1} 正常工作`, 'success');
                
                // 清除失败记录
                if (failedApiKeys.has(currentApiKeyIndex)) {
                    failedApiKeys.delete(currentApiKeyIndex);
                }
            } else {
                debugLog(`API KEY ${currentApiKeyIndex + 1} 测试失败: ${response.status}`);
                showNotification(`API KEY ${currentApiKeyIndex + 1} 测试失败 (${response.status})`, 'error');
                markCurrentApiKeyAsFailed();
            }
        } catch (error) {
            debugLog(`API KEY ${currentApiKeyIndex + 1} 测试出错: ${error.message}`);
            showNotification(`API KEY测试出错: ${error.message}`, 'error');
        }
    }
    
    // 测试所有API KEY
    async function testAllApiKeys() {
        showNotification('正在测试所有API KEY...', 'info');
        debugLog('开始测试所有API KEY');
        
        const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
        const results = [];
        
        for (let i = 0; i < MORALIS_API_KEYS.length; i++) {
            const key = MORALIS_API_KEYS[i];
            debugLog(`测试API KEY ${i + 1}: ...${key.slice(-8)}`);
            
            try {
                const response = await fetch(`https://deep-index.moralis.io/api/v2.2/${testAddress}?chain=0x1&limit=1`, {
                    headers: {
                        'X-API-Key': key
                    }
                });
                
                const result = {
                    index: i + 1,
                    key: `...${key.slice(-8)}`,
                    status: response.status,
                    ok: response.ok,
                    message: response.ok ? '正常' : `失败 (${response.status})`
                };
                
                if (response.ok) {
                    const data = await response.json();
                    result.details = `成功获取到 ${data.result?.length || 0} 条记录`;
                    // 清除失败记录
                    if (failedApiKeys.has(i)) {
                        failedApiKeys.delete(i);
                    }
                } else {
                    // 获取响应头信息
                    const headers = {};
                    for (const [key, value] of response.headers.entries()) {
                        headers[key] = value;
                    }
                    result.headers = headers;
                    
                    // 尝试获取错误详情
                    try {
                        const errorData = await response.text();
                        result.error = errorData;
                    } catch (e) {
                        result.error = '无法获取错误详情';
                    }
                    
                    // 标记失败
                    failedApiKeys.add(i);
                }
                
                results.push(result);
                debugLog(`API KEY ${i + 1} 测试结果:`, result);
                
            } catch (error) {
                const result = {
                    index: i + 1,
                    key: `...${key.slice(-8)}`,
                    status: 'ERROR',
                    ok: false,
                    message: `网络错误: ${error.message}`,
                    error: error.message
                };
                results.push(result);
                debugLog(`API KEY ${i + 1} 测试出错:`, result);
                failedApiKeys.add(i);
            }
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 显示测试结果
        console.log('=== 所有API KEY测试结果 ===');
        results.forEach(result => {
            console.log(`API KEY ${result.index}: ${result.message}`);
            if (result.error) {
                console.log(`  错误详情: ${result.error}`);
            }
            if (result.headers) {
                console.log(`  响应头:`, result.headers);
            }
        });
        
        const workingKeys = results.filter(r => r.ok).length;
        const totalKeys = results.length;
        
        showNotification(`测试完成: ${workingKeys}/${totalKeys} 个API KEY可用`, workingKeys > 0 ? 'success' : 'error');
        debugLog(`API KEY测试完成: ${workingKeys}/${totalKeys} 个可用`);
        
        return results;
    }
    
    // 获取API KEY状态信息
    function getApiKeyStatus() {
        const totalKeys = MORALIS_API_KEYS.length;
        const failedCount = failedApiKeys.size;
        const currentKey = currentApiKeyIndex + 1;
        return {
            total: totalKeys,
            failed: failedCount,
            current: currentKey,
            available: totalKeys - failedCount
        };
    }

    const API_URLS = {
        btc: 'https://mempool.space/api/address/',
    };
    const EXPLORER_URLS = {
        eth: 'https://etherscan.io',
        bsc: 'https://bscscan.com',
        btc: 'https://mempool.space',
    }
    const CHAIN_CONFIG = {
        eth: { id: '0x1', symbol: 'ETH', name: 'Ethereum' },
        bsc: { id: '0x38', symbol: 'BNB', name: 'BSC' },
        btc: { id: 'btc', symbol: 'BTC', name: 'Bitcoin' },
    }

    // 示例地址用于测试
    const SAMPLE_ADDRESSES = {
        eth: {
            name: 'Vitalik Buterin',
            address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        },
        btc: {
            name: '示例比特币地址',
            address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
        }
    };

    let monitoringInterval = null;
    let monitoredAddress = '';
    let displayedTxHashes = new Set();
    let savedAddresses = [];

    // 添加示例地址功能
    function addSampleAddresses() {
        if (savedAddresses.length === 0) {
            debugLog('添加示例地址');
            savedAddresses.push(SAMPLE_ADDRESSES.eth);
            savedAddresses.push(SAMPLE_ADDRESSES.btc);
            saveAddresses();
            renderAddressSelect();
            renderWalletsList();
            showNotification('已添加示例地址用于测试', 'info');
        }
    }

    // 双击标题添加示例地址
    document.querySelector('.minimal-title').addEventListener('dblclick', addSampleAddresses);

    // 更新表单状态
    function updateAddFormState() {
        const address = addressAddInput.value.trim();
        const name = addressNameInput.value.trim();
        const isAddressValid = isEvmAddress(address) || isBtcAddress(address);

        // 修复：名称输入框应该始终可用，而不是依赖地址有效性
        addressNameInput.disabled = false;
        
        // 修复：只有当地址有效且名称不为空时才启用按钮
        addressAddBtn.disabled = !(isAddressValid && name.length > 0);
        
        // 添加视觉反馈
        if (address.length === 0) {
            addressAddInput.style.borderColor = '';
        } else if (isAddressValid) {
            addressAddInput.style.borderColor = 'var(--color-success)';
        } else {
            addressAddInput.style.borderColor = 'var(--color-danger)';
        }
    }

    // 加载地址列表
    function loadAddresses() {
        const addresses = localStorage.getItem('savedAddresses');
        savedAddresses = addresses ? JSON.parse(addresses) : [];
        renderAddressSelect();
        renderWalletsList();
        updateWalletStats();
        
        if (savedAddresses.length > 0) {
            startNewMonitoring(savedAddresses[0].address);
        }
    }

    // 保存地址列表
    function saveAddresses() {
        localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
        updateWalletStats();
    }

    // 渲染地址选择器 - 已删除select元素，不再需要此函数
    function renderAddressSelect() {
        // 删除按钮已移动到各个钱包项目中，此函数保留用于兼容性
    }

    // 渲染钱包列表
    function renderWalletsList() {
        walletsList.innerHTML = '';
        
        savedAddresses.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'minimal-wallet-item';
            li.innerHTML = `
                <div class="minimal-wallet-info">
                    <div class="minimal-wallet-name">${item.name}</div>
                    <div class="minimal-wallet-address">${item.address.substring(0, 10)}...${item.address.substring(item.address.length - 8)}</div>
                </div>
                <div class="minimal-wallet-actions">
                    <button class="minimal-wallet-delete-btn" title="删除此钱包" data-index="${index}">删除</button>
                </div>
            `;
            
            // 钱包项目点击事件（排除删除按钮）
            li.addEventListener('click', (e) => {
                if (e.target.classList.contains('minimal-wallet-delete-btn')) {
                    return; // 如果点击的是删除按钮，不执行选择逻辑
                }
                
                // 移除其他钱包的active状态
                document.querySelectorAll('.minimal-wallet-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                
                startNewMonitoring(item.address);
            });
            
            // 删除按钮点击事件
            const deleteBtn = li.querySelector('.minimal-wallet-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                deleteWalletByIndex(index);
            });
            
            walletsList.appendChild(li);
        });
    }

    // 更新钱包统计
    function updateWalletStats() {
        walletCount.textContent = savedAddresses.length;
    }

    // 添加地址
    function addAddress() {
        const name = addressNameInput.value.trim();
        const address = addressAddInput.value.trim();

        // 修复：保持地址原始大小写，只在比较时转换为小写
        if (savedAddresses.some(item => item.name === name)) {
            showNotification('该名称已存在', 'error');
            return;
        }
        if (savedAddresses.some(item => item.address.toLowerCase() === address.toLowerCase())) {
            showNotification('该地址已存在', 'error');
            return;
        }

        const newAddress = { name, address };
        savedAddresses.push(newAddress);
        saveAddresses();
        renderAddressSelect();
        renderWalletsList();

        // 清空表单
        addressNameInput.value = '';
        addressAddInput.value = '';
        updateAddFormState();

        showNotification('钱包地址添加成功', 'success');
        debugLog('添加地址', newAddress);
    }

    // 通过索引删除钱包
    function deleteWalletByIndex(index) {
        if (index < 0 || index >= savedAddresses.length) {
            showNotification('钱包不存在', 'error');
            return;
        }

        const deletedAddress = savedAddresses[index];
        
        // 显示确认对话框
        if (confirm(`确定要删除钱包 "${deletedAddress.name}" 吗？`)) {
            savedAddresses.splice(index, 1);
            saveAddresses();
            renderAddressSelect();
            renderWalletsList();

            // 如果删除的是当前监控的地址，停止监控
            if (monitoredAddress === deletedAddress.address) {
                stopMonitoring();
            }

            showNotification('钱包删除成功', 'success');
            debugLog('删除钱包', deletedAddress);
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        // 添加振动反馈
        if (window.vibrationManager) {
            window.vibrationManager.feedback(type, message);
        }

        // 移除现有通知
        const existingNotification = document.querySelector('.minimal-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 创建新通知
        const notification = document.createElement('div');
        notification.className = `minimal-notification minimal-notification-${type}`;
        notification.innerHTML = `
            <div class="minimal-notification-title">${getNotificationTitle(type)}</div>
            <div class="minimal-notification-text">${message}</div>
        `;

        document.body.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    function getNotificationTitle(type) {
        switch (type) {
            case 'success': return '成功';
            case 'error': return '错误';
            case 'warning': return '警告';
            default: return '信息';
        }
    }

    // 地址验证函数
    function isEvmAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    function isBtcAddress(address) {
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address);
    }

    // 开始监控新地址
    function startNewMonitoring(address) {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
        }

        monitoredAddress = address;
        displayedTxHashes.clear();
        
        // 更新状态显示
        const addressInfo = savedAddresses.find(item => item.address === address);
        updateMonitoringStatus(addressInfo);

        // 显示监控指示器
        monitoringIndicator.style.display = 'flex';
        
        // 添加开始监控的振动反馈
        if (window.vibrationManager) {
            window.vibrationManager.vibrate('monitoring');
        }
        
        // 立即获取一次交易数据
        fetchTransactions();
        
        // 设置定时获取
        monitoringInterval = setInterval(fetchTransactions, 30000); // 30秒
        
        debugLog('开始监控地址', { address, name: addressInfo?.name });
    }

    // 停止监控
    function stopMonitoring() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
        
        monitoredAddress = '';
        displayedTxHashes.clear();
        
        // 隐藏监控指示器
        monitoringIndicator.style.display = 'none';
        
        // 恢复默认状态
        monitoringStatus.querySelector('.minimal-status-text h3').textContent = '选择一个钱包以开始监控';
        monitoringStatus.querySelector('.minimal-status-text p').textContent = '请从上方列表中选择或添加一个钱包地址开始实时监控交易活动';
        
        // 清空交易表格并显示空状态
        transactionsBody.innerHTML = '';
        showEmptyState(true, false); // 正常停止监控，显示默认空状态
        
        debugLog('停止监控');
    }

    // 更新监控状态显示
    function updateMonitoringStatus(addressInfo) {
        if (addressInfo) {
            monitoringStatus.querySelector('.minimal-status-text h3').textContent = `正在监控: ${addressInfo.name}`;
            monitoringStatus.querySelector('.minimal-status-text p').textContent = `地址: ${addressInfo.address}`;
        }
    }

    // 显示/隐藏加载状态
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
        tableContainer.style.display = 'none'; // 加载时隐藏表格
        emptyState.style.display = 'none'; // 加载时隐藏空状态
    }

    // 显示/隐藏空状态
    function showEmptyState(show, isError = false) {
        emptyState.style.display = show ? 'block' : 'none';
        tableContainer.style.display = 'none'; // 空状态时始终隐藏表格
        loadingSpinner.style.display = 'none'; // 空状态时隐藏加载
        
        // 如果不是错误状态，恢复默认的空状态内容
        if (show && !isError && emptyState) {
            emptyState.innerHTML = `
                <div class="minimal-empty-icon">○</div>
                <div class="minimal-empty-text">暂无监控货币</div>
            `;
        }
    }

    // 显示表格（有数据时）
    function showTable() {
        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';
        loadingSpinner.style.display = 'none';
    }

    // 检查API KEY状态并显示用户友好的错误信息
    function checkApiKeyStatus() {
        const status = getApiKeyStatus();
        if (status.available === 0) {
            showApiKeyError();
            return false;
        }
        return true;
    }
    
    // 显示API KEY错误信息
    function showApiKeyError() {
        const status = getApiKeyStatus();
        const debugInfo = window.debugMode ? `
            <div style="margin-top: var(--minimal-space-lg); padding: var(--minimal-space-md); background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                <div style="color: var(--minimal-text-secondary); margin-bottom: var(--minimal-space-sm);">
                    <strong>调试信息 (F12开启)：</strong>
                </div>
                <div style="color: var(--minimal-text-tertiary); font-size: var(--minimal-font-size-sm); font-family: monospace;">
                    • 总共 ${status.total} 个API KEY<br>
                    • 失败 ${status.failed} 个<br>
                    • 当前使用第 ${status.current} 个<br>
                    • 按 Ctrl+I 查看详情<br>
                    • 按 Ctrl+T 测试当前KEY<br>
                    • 按 Ctrl+Shift+T 测试所有KEY<br>
                    • 按 Ctrl+R 重置状态
                </div>
            </div>
        ` : '';
        
        const errorMessage = `
            <div style="text-align: center; padding: var(--minimal-space-lg);">
                <div style="font-size: var(--minimal-font-size-lg); margin-bottom: var(--minimal-space-md); color: var(--minimal-text-primary);">
                    ⚠️ API服务暂时不可用
                </div>
                <div style="margin-bottom: var(--minimal-space-md); color: var(--minimal-text-secondary);">
                    所有配置的Moralis API KEY都无法使用，可能的原因：
                </div>
                <ul style="text-align: left; color: var(--minimal-text-tertiary); margin-bottom: var(--minimal-space-lg);">
                    <li>API KEY已过期或无效</li>
                    <li>API调用配额已用完</li>
                    <li>Moralis服务临时维护</li>
                    <li>网络连接问题</li>
                </ul>
                <div style="margin-bottom: var(--minimal-space-lg);">
                    <button onclick="retryApiConnection()" style="
                        background: var(--minimal-bg-tertiary); 
                        color: var(--minimal-text-primary); 
                        border: 1px solid var(--minimal-border-primary); 
                        padding: 12px 24px; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-size: var(--minimal-font-size-base);
                        margin-right: var(--minimal-space-sm);
                    ">
                        🔄 重试连接
                    </button>
                    <button onclick="resetApiKeyStatus()" style="
                        background: transparent; 
                        color: var(--minimal-text-secondary); 
                        border: 1px solid var(--minimal-border-secondary); 
                        padding: 12px 24px; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-size: var(--minimal-font-size-base);
                    ">
                        🔧 重置状态
                    </button>
                </div>
                <div style="margin-bottom: var(--minimal-space-md); color: var(--minimal-text-secondary);">
                    <strong>建议解决方案：</strong>
                </div>
                <ul style="text-align: left; color: var(--minimal-text-tertiary);">
                    <li>检查Moralis控制台中的API KEY状态</li>
                    <li>确认API KEY的权限和配额限制</li>
                    <li>检查网络连接是否正常</li>
                    <li>等待几分钟后重试</li>
                    <li>联系Moralis支持获取帮助</li>
                </ul>
                ${debugInfo}
            </div>
        `;
        
        // 更新空状态显示
        if (emptyState) {
            emptyState.innerHTML = errorMessage;
            showEmptyState(true, true); // 传入isError=true
        }
        
        // 显示通知和专门的API错误振动
        showNotification('API服务不可用，请检查网络连接或稍后重试', 'error');
        if (window.vibrationManager) {
            window.vibrationManager.vibrate('apiError');
        }
        
        // 停止监控以避免重复错误
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
    }
    
    // 重试API连接
    window.retryApiConnection = function() {
        debugLog('用户手动重试API连接');
        showNotification('正在重试API连接...', 'info');
        
        // 重置失败状态
        resetApiKeyStatus();
        
        // 如果有监控地址，重新开始获取交易
        if (monitoredAddress) {
            setTimeout(() => {
                fetchTransactions();
            }, 1000);
        }
    };
    
    // 暴露测试函数到全局，方便控制台调用
    window.testAllApiKeys = testAllApiKeys;
    window.testCurrentApiKey = testCurrentApiKey;
    window.resetApiKeyStatus = resetApiKeyStatus;

    // 获取交易数据
    async function fetchTransactions() {
        if (!monitoredAddress) return;

        // 检查API KEY状态
        if (!checkApiKeyStatus()) {
            return;
        }

        showLoading(true);
        showEmptyState(false);

        try {
            let transactions = [];
            
            if (isEvmAddress(monitoredAddress)) {
                // EVM地址 - 获取多条链的交易
                const [ethTxs, bscTxs] = await Promise.all([
                    fetchEvmTransactions(monitoredAddress, 'eth'),
                    fetchEvmTransactions(monitoredAddress, 'bsc')
                ]);
                transactions = [...ethTxs, ...bscTxs];
                
                // 如果所有链都返回空数组，可能是API KEY问题
                if (ethTxs.length === 0 && bscTxs.length === 0 && failedApiKeys.size >= MORALIS_API_KEYS.length) {
                    throw new Error('所有API KEY都已失效');
                }
            } else if (isBtcAddress(monitoredAddress)) {
                // BTC地址
                transactions = await fetchBtcTransactions(monitoredAddress);
            }

            // 按时间排序
            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // 渲染交易列表
            renderTransactions(transactions);
            debugLog('获取交易成功', { count: transactions.length });
            
        } catch (error) {
            console.error('获取交易失败:', error);
            
            // 如果是API KEY相关错误，显示专门的错误页面
            if (error.message.includes('所有API KEY都已失效') || failedApiKeys.size >= MORALIS_API_KEYS.length) {
                showApiKeyError();
            } else {
                showEmptyState(true, false); // 普通错误，显示默认空状态
            showNotification('获取交易数据失败，请稍后重试', 'error');
            }
        }
    }

    // 获取EVM交易（支持API KEY自动切换）
    async function fetchEvmTransactions(address, chain, retryCount = 0) {
        const maxRetries = MORALIS_API_KEYS.length; // 最多尝试所有API KEY
        
        try {
            const chainConfig = CHAIN_CONFIG[chain];
            const url = `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chainConfig.id}`;
            const currentKey = getCurrentApiKey();
            
            debugLog(`使用API KEY ${currentApiKeyIndex + 1}/${MORALIS_API_KEYS.length} 获取${chain.toUpperCase()}交易`);
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': currentKey
                }
            });

            if (!response.ok) {
                const errorMessage = `${chain.toUpperCase()} API请求失败 (${response.status}): ${response.statusText}`;
                debugLog(errorMessage);
                
                // 如果是认证错误或速率限制，尝试下一个API KEY
                if (response.status === 401 || response.status === 403 || response.status === 429) {
                    markCurrentApiKeyAsFailed();
                    debugLog(`API KEY ${currentApiKeyIndex + 1} 失效 (${response.status})，已标记为失败`);
                    
                    if (retryCount < maxRetries - 1) {
                        debugLog(`切换到下一个API KEY重试 (重试次数: ${retryCount + 1}/${maxRetries})`);
                        return await fetchEvmTransactions(address, chain, retryCount + 1);
                    } else {
                        debugLog(`所有API KEY都已尝试，${chain.toUpperCase()}链获取失败`);
                        throw new Error(`所有API KEY都无法访问${chain.toUpperCase()}链 (${response.status})`);
                    }
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 请求成功，清除当前API KEY的失败记录（如果有的话）
            if (failedApiKeys.has(currentApiKeyIndex)) {
                failedApiKeys.delete(currentApiKeyIndex);
                debugLog(`API KEY ${currentApiKeyIndex + 1} 恢复正常`);
            }
            
            debugLog(`${chain.toUpperCase()}链成功获取到 ${(data.result || []).length} 条交易`);
            
            return (data.result || []).map(tx => ({
                hash: tx.hash,
                chain: chainConfig.name,
                type: tx.from_address.toLowerCase() === address.toLowerCase() ? 'out' : 'in',
                from: tx.from_address,
                to: tx.to_address,
                value: parseFloat(tx.value) / Math.pow(10, 18), // 转换为ETH/BNB
                symbol: chainConfig.symbol,
                timestamp: tx.block_timestamp,
                blockNumber: tx.block_number,
                explorerUrl: `${EXPLORER_URLS[chain]}/tx/${tx.hash}`
            }));
        } catch (error) {
            // 如果还有重试机会且不是网络错误，尝试下一个API KEY
            if (retryCount < maxRetries - 1 && !error.message.includes('fetch') && !error.message.includes('所有API KEY')) {
                markCurrentApiKeyAsFailed();
                debugLog(`API KEY ${currentApiKeyIndex} 错误，尝试下一个: ${error.message}`);
                return await fetchEvmTransactions(address, chain, retryCount + 1);
            }
            
            console.error(`获取${chain.toUpperCase()}交易失败:`, error);
            debugLog(`${chain.toUpperCase()}链最终获取失败: ${error.message}`);
            return [];
        }
    }

    // 获取BTC交易
    async function fetchBtcTransactions(address) {
        try {
            const response = await fetch(API_URLS.btc + address);
            const data = await response.json();
            
            const transactions = [];
            
            // 处理交易数据
            for (const tx of data.chain_stats.funded_txo_sum > 0 ? await fetchBtcTransactionDetails(address) : []) {
                transactions.push({
                    hash: tx.txid,
                    chain: 'Bitcoin',
                    type: 'in', // 简化处理
                    from: 'N/A',
                    to: address,
                    value: tx.value / 100000000, // 转换为BTC
                    symbol: 'BTC',
                    timestamp: new Date(tx.status.block_time * 1000).toISOString(),
                    blockNumber: tx.status.block_height,
                    explorerUrl: `${EXPLORER_URLS.btc}/tx/${tx.txid}`
                });
            }
            
            return transactions;
        } catch (error) {
            console.error('获取BTC交易失败:', error);
            return [];
        }
    }

    // 获取BTC交易详情
    async function fetchBtcTransactionDetails(address) {
        try {
            const response = await fetch(`${API_URLS.btc}${address}/txs`);
            return await response.json();
        } catch (error) {
            console.error('获取BTC交易详情失败:', error);
            return [];
        }
    }

    // 检测是否为移动设备
    function isMobileDevice() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // 渲染交易列表
    function renderTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            showEmptyState(true, false); // 没有交易数据，显示默认空状态
            return;
        }

        // 检查是否有新交易
        let newTransactionCount = 0;
        let totalTransactionValue = 0;
        
        transactions.forEach(tx => {
            if (!displayedTxHashes.has(tx.hash)) {
                newTransactionCount++;
                totalTransactionValue += tx.value || 0;
                displayedTxHashes.add(tx.hash);
            }
        });

        // 如果有新交易，提供振动反馈
        if (newTransactionCount > 0 && window.vibrationManager) {
            console.log(`🔔 发现 ${newTransactionCount} 个新交易，总金额: ${totalTransactionValue.toFixed(6)}`);
            window.vibrationManager.transaction(totalTransactionValue);
        }

        // 有数据时显示表格
        showTable();

        // 统一使用表格布局，但保留智能交互功能
        transactionsBody.innerHTML = '';
        transactionsBody.className = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            // 格式化金额显示
            const formattedAmount = tx.value < 0.001 
                ? tx.value.toExponential(2) 
                : tx.value.toFixed(tx.value < 1 ? 6 : 4);
            
            row.innerHTML = `
                <td><a href="${tx.explorerUrl}" target="_blank">${tx.hash.substring(0, 10)}...</a></td>
                <td>${tx.chain}</td>
                <td><span class="tx-type-${tx.type}">${tx.type === 'in' ? '接收' : '发送'}</span></td>
                <td class="address-cell" data-address="${tx.from}">${tx.from.substring(0, 10)}...</td>
                <td class="address-cell" data-address="${tx.to}">${tx.to.substring(0, 10)}...</td>
                <td>${formattedAmount} ${tx.symbol}</td>
                <td>${formatTimestamp(tx.timestamp)}</td>
            `;
            
            // 添加行点击事件打开交易详情
            row.addEventListener('click', (e) => {
                // 如果点击的是链接，不执行行点击事件
                if (e.target.tagName === 'A') return;
                window.open(tx.explorerUrl, '_blank');
            });
            
            // 添加hover效果
            row.style.cursor = 'pointer';
            
            // 添加长按事件用于复制交易哈希（移动端）
            let longPressTimer;
            row.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    // 复制交易哈希到剪贴板
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(tx.hash).then(() => {
                            showNotification('交易哈希已复制到剪贴板', 'success');
                            // 添加长按复制的振动反馈
                            if (window.vibrationManager) {
                                window.vibrationManager.vibrate('longPress');
                            }
                        });
                    } else {
                        // 降级方案
                        const textArea = document.createElement('textarea');
                        textArea.value = tx.hash;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        showNotification('交易哈希已复制到剪贴板', 'success');
                    }
                    e.preventDefault();
                }, 800);
            });
            
            row.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            });
            
            row.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
            });
            
            // 为地址单元格添加长按复制功能
            const addressCells = row.querySelectorAll('.address-cell');
            addressCells.forEach((cell, index) => {
                const address = cell.dataset.address;
                let addressLongPressTimer;
                
                cell.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    addressLongPressTimer = setTimeout(() => {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(address).then(() => {
                                showNotification(`${index === 0 ? '发送方' : '接收方'}地址已复制到剪贴板`, 'success');
                                if (window.vibrationManager) {
                                    window.vibrationManager.vibrate('longPress');
                                }
                            });
                        }
                        e.preventDefault();
                    }, 600);
                });
                
                cell.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    clearTimeout(addressLongPressTimer);
                });
                
                cell.addEventListener('touchmove', (e) => {
                    e.stopPropagation();
                    clearTimeout(addressLongPressTimer);
                });
            });
            
            transactionsBody.appendChild(row);
        });
    }

    // 格式化时间戳
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 导出交易数据
    function exportTransactions() {
        if (!transactionsBody.children.length) {
            showNotification('没有交易数据可导出', 'warning');
            return;
        }

        // 创建CSV内容
        const headers = ['交易哈希', '链', '类型', '发送方', '接收方', '金额', '时间'];
        const csvContent = [
            headers.join(','),
            ...Array.from(transactionsBody.children).map(row => 
                Array.from(row.children).map(cell => `"${cell.textContent}"`).join(',')
            )
        ].join('\n');

        // 下载文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('交易数据导出成功', 'success');
    }

    // 事件监听器
    addressNameInput.addEventListener('input', updateAddFormState);
    addressAddInput.addEventListener('input', updateAddFormState);
    addressAddBtn.addEventListener('click', addAddress);
    // addressSelect.addEventListener('change', (e) => {
    //     if (e.target.value) {
    //         startNewMonitoring(e.target.value);
    //     }
    // }); // 已删除select元素，通过点击钱包项来选择
    
    // deleteBtn.addEventListener('click', deleteSelectedAddress); // 删除按钮已移动到各个钱包项目中
    refreshBtn.addEventListener('click', () => {
        // 添加刷新的振动反馈
        if (window.vibrationManager) {
            window.vibrationManager.vibrate('refresh');
        }
        fetchTransactions();
    });
    exportBtn.addEventListener('click', exportTransactions);

    // 表单提交处理
    addressNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addressAddInput.focus();
        }
    });

    addressAddInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !addressAddBtn.disabled) {
            addAddress();
        }
    });

    // 窗口大小变化监听器 - 重新渲染交易列表以适应新的布局
    let resizeTimeout;
    let cachedTransactions = [];
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // 如果有交易数据且当前正在监控，重新渲染
            if (monitoredAddress && cachedTransactions.length > 0) {
                renderTransactions(cachedTransactions);
            }
        }, 250); // 防抖处理
    });

    // 修改renderTransactions函数以缓存交易数据
    const originalRenderTransactions = renderTransactions;
    renderTransactions = function(transactions) {
        cachedTransactions = transactions || [];
        return originalRenderTransactions.call(this, transactions);
    };

    // 初始化
    loadAddresses();
    updateAddFormState();
    
    // 初始状态：隐藏表格，显示空状态
    showEmptyState(true, false); // 应用初始化，显示默认空状态
    
    // 显示API KEY状态信息
    const apiStatus = getApiKeyStatus();
    debugLog(`应用初始化完成 - 已配置 ${apiStatus.total} 个Moralis API KEY`);
    
    // 添加快捷键：按 Ctrl+R 重置API KEY状态
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'r' && window.debugMode) {
            e.preventDefault();
            resetApiKeyStatus();
        }
        
        // 按 V 键测试振动
        if (e.key === 'v' && window.debugMode) {
            e.preventDefault();
            if (window.vibrationManager) {
                const testPatterns = ['click', 'success', 'error', 'newTransaction', 'monitoring'];
                const randomPattern = testPatterns[Math.floor(Math.random() * testPatterns.length)];
                window.vibrationManager.test(randomPattern);
                showNotification(`测试振动模式: ${randomPattern}`, 'info');
            }
        }
        
        // 按 Ctrl+V 切换振动开关
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            if (window.vibrationManager) {
                const enabled = window.vibrationManager.toggle();
                showNotification(`振动反馈已${enabled ? '开启' : '关闭'}`, enabled ? 'success' : 'info');
            }
        }
    });
    
    // 暴露振动管理器到全局，方便控制台调用
    window.testVibration = function(eventType = 'click') {
        if (window.vibrationManager) {
            return window.vibrationManager.test(eventType);
        }
        console.warn('振动管理器未初始化');
        return false;
    };
    
    window.toggleVibration = function() {
        if (window.vibrationManager) {
            return window.vibrationManager.toggle();
        }
        console.warn('振动管理器未初始化');
        return false;
    };
    
    // 显示振动功能使用帮助
    window.showVibrationHelp = function() {
        console.log(`
🔮 CryptoWatch 振动功能帮助
==========================

💡 快捷键：
  - V：测试随机振动模式 (调试模式下)
  - Ctrl+V：开启/关闭振动

🧪 控制台命令：
  - testVibration('click')：测试点击振动
  - testVibration('success')：测试成功振动
  - testVibration('error')：测试错误振动
  - testVibration('newTransaction')：测试新交易振动
  - testVibration('monitoring')：测试监控开始振动
  - toggleVibration()：切换振动开关

📱 自动振动事件：
  ✅ 成功操作 (添加钱包、连接成功等)
  ❌ 错误提示 (API错误、验证失败等)
  🔄 开始监控
  💰 发现新交易 (金额越大振动越强)
  🔄 手动刷新
  🔗 API连接问题

🛠️ 振动设置存储在 localStorage 中，页面刷新后保持。
        `);
        
        if (window.vibrationManager) {
            const settings = window.vibrationManager.getSettings();
            console.log('当前设置:', settings);
        }
    };
    
    // 在控制台显示振动功能提示
    if (window.vibrationManager && window.vibrationManager.isSupported) {
        console.log('🔮 振动功能已启用！输入 showVibrationHelp() 查看使用说明');
    }
}); 