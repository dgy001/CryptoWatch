document.addEventListener('DOMContentLoaded', () => {
    const addressNameInput = document.getElementById('address-name-input');
    const addressAddInput = document.getElementById('address-add-input');
    const addressAddBtn = document.getElementById('address-add-btn');
    const addressSelect = document.getElementById('address-select');
    const transactionsBody = document.getElementById('transactions-body');
    const walletsList = document.getElementById('wallets-list');
    const walletCount = document.getElementById('wallet-count');
    const monitoringStatus = document.getElementById('monitoring-status');
    const monitoringIndicator = document.getElementById('monitoring-indicator');
    const refreshBtn = document.getElementById('refresh-btn');
    const exportBtn = document.getElementById('export-btn');
    const deleteBtn = document.getElementById('address-delete-btn');
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
            showNotification(`调试模式已${window.debugMode ? '开启' : '关闭'}`, 'info');
        }
    });

    const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImQ1YzM3NGVhLTg5YzktNDQ5Ni05MjlmLTE4NDcyZDM3MDFjNiIsIm9yZ0lkIjoiNDU0ODAyIiwidXNlcklkIjoiNDY3OTMyIiwidHlwZUlkIjoiNjNjMmUyYTAtYjNmOC00NGM4LWIxZDgtZmEyNWExY2UzYmEyIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTAzNDAyNzUsImV4cCI6NDkwNjEwMDI3NX0.L8VeEzXNG5GmSmTl4pbmzvdYuDRxErzZIyzng6TqCBk';

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

    // 渲染地址选择器
    function renderAddressSelect() {
        const currentSelection = addressSelect.value;
        addressSelect.innerHTML = '';
        
        if (savedAddresses.length === 0) {
            const option = document.createElement('option');
            option.textContent = '请先添加地址';
            addressSelect.appendChild(option);
            deleteBtn.disabled = true;
        } else {
            savedAddresses.forEach(item => {
                const option = document.createElement('option');
                option.value = item.address;
                option.textContent = `${item.name} (${item.address.substring(0, 8)}...)`;
                addressSelect.appendChild(option);
            });
            deleteBtn.disabled = false;
            
            if (savedAddresses.some(item => item.address === currentSelection)) {
                addressSelect.value = currentSelection;
            }
        }
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
                    <span title="点击监控此钱包">👁</span>
                </div>
            `;
            
            li.addEventListener('click', () => {
                // 移除其他钱包的active状态
                document.querySelectorAll('.minimal-wallet-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                
                addressSelect.value = item.address;
                startNewMonitoring(item.address);
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

    // 删除选中的地址
    function deleteSelectedAddress() {
        const selectedAddress = addressSelect.value;
        if (!selectedAddress || selectedAddress === '请先添加地址') {
            showNotification('请选择要删除的地址', 'error');
            return;
        }

        const index = savedAddresses.findIndex(item => item.address === selectedAddress);
        if (index > -1) {
            const deletedAddress = savedAddresses.splice(index, 1)[0];
            saveAddresses();
            renderAddressSelect();
            renderWalletsList();

            // 如果删除的是当前监控的地址，停止监控
            if (monitoredAddress === selectedAddress) {
                stopMonitoring();
            }

            showNotification('地址删除成功', 'success');
            debugLog('删除地址', deletedAddress);
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
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
        
        // 清空交易表格
        transactionsBody.innerHTML = '';
        showEmptyState(true);
        
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
        tableContainer.style.display = show ? 'none' : 'block';
    }

    // 显示/隐藏空状态
    function showEmptyState(show) {
        emptyState.style.display = show ? 'block' : 'none';
        tableContainer.style.display = show ? 'none' : 'block';
    }

    // 获取交易数据
    async function fetchTransactions() {
        if (!monitoredAddress) return;

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
            } else if (isBtcAddress(monitoredAddress)) {
                // BTC地址
                transactions = await fetchBtcTransactions(monitoredAddress);
            }

            // 按时间排序
            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // 渲染交易列表
            renderTransactions(transactions);
            
            showLoading(false);
            debugLog('获取交易成功', { count: transactions.length });
            
        } catch (error) {
            console.error('获取交易失败:', error);
            showLoading(false);
            showEmptyState(true);
            showNotification('获取交易数据失败，请稍后重试', 'error');
        }
    }

    // 获取EVM交易
    async function fetchEvmTransactions(address, chain) {
        try {
            const chainConfig = CHAIN_CONFIG[chain];
            const url = `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chainConfig.id}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': MORALIS_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
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
            console.error(`获取${chain.toUpperCase()}交易失败:`, error);
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
            showEmptyState(true);
            return;
        }

        const isMobile = isMobileDevice();
        
        if (isMobile) {
            // 移动端卡片布局
            transactionsBody.innerHTML = '';
            transactionsBody.className = 'mobile-cards';
            
            transactions.forEach(tx => {
                const card = document.createElement('div');
                card.className = 'transaction-card';
                card.innerHTML = `
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">哈希</span>
                        <span class="transaction-card-value">
                            <a href="${tx.explorerUrl}" target="_blank">${tx.hash.substring(0, 12)}...${tx.hash.substring(tx.hash.length - 8)}</a>
                        </span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">链</span>
                        <span class="transaction-card-value">${tx.chain}</span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">类型</span>
                        <span class="transaction-card-value">
                            <span class="tx-type-${tx.type}">${tx.type === 'in' ? '接收' : '发送'}</span>
                        </span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">发送方</span>
                        <span class="transaction-card-value">${tx.from.substring(0, 8)}...${tx.from.substring(tx.from.length - 6)}</span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">接收方</span>
                        <span class="transaction-card-value">${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 6)}</span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">金额</span>
                        <span class="transaction-card-value">${tx.value.toFixed(6)} ${tx.symbol}</span>
                    </div>
                    <div class="transaction-card-row">
                        <span class="transaction-card-label">时间</span>
                        <span class="transaction-card-value">${formatTimestamp(tx.timestamp)}</span>
                    </div>
                `;
                transactionsBody.appendChild(card);
            });
        } else {
            // 桌面端表格布局
            transactionsBody.innerHTML = '';
            transactionsBody.className = '';
            
            transactions.forEach(tx => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="${tx.explorerUrl}" target="_blank">${tx.hash.substring(0, 10)}...</a></td>
                    <td>${tx.chain}</td>
                    <td><span class="tx-type-${tx.type}">${tx.type === 'in' ? '接收' : '发送'}</span></td>
                    <td>${tx.from.substring(0, 10)}...</td>
                    <td>${tx.to.substring(0, 10)}...</td>
                    <td>${tx.value.toFixed(6)} ${tx.symbol}</td>
                    <td>${formatTimestamp(tx.timestamp)}</td>
                `;
                transactionsBody.appendChild(row);
            });
        }
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
    addressSelect.addEventListener('change', (e) => {
        if (e.target.value && e.target.value !== '请先添加地址') {
            startNewMonitoring(e.target.value);
        }
    });
    deleteBtn.addEventListener('click', deleteSelectedAddress);
    refreshBtn.addEventListener('click', fetchTransactions);
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
    
    debugLog('应用初始化完成');
}); 