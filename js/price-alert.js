document.addEventListener('DOMContentLoaded', () => {
    // UI Elements - 更新为极简设计的选择器
    const searchInput = document.getElementById('coin-search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const trackedCoinsList = document.getElementById('tracked-coins-list');
    const apiSourceSelect = document.getElementById('api-source-select');
    const alertModal = document.getElementById('alert-modal');
    const modalCoinName = document.getElementById('modal-coin-name');
    const setAlertBtn = document.getElementById('set-alert-btn');
    const alertCondition = document.getElementById('alert-condition');
    const alertPriceInput = document.getElementById('alert-price');
    const activeAlertsList = document.getElementById('active-alerts-list');
    const closeModalBtn = document.querySelector('.minimal-close-btn');
    const alertRepeatCheckbox = document.getElementById('alert-repeat');
    const intervalGroup = document.getElementById('interval-group');
    const alertIntervalHoursInput = document.getElementById('alert-interval-hours');
    const alertIntervalMinutesInput = document.getElementById('alert-interval-minutes');
    const alertIntervalSecondsInput = document.getElementById('alert-interval-seconds');
    const alertSoundSelect = document.getElementById('alert-sound-select');
    const previewSoundBtn = document.getElementById('preview-sound-btn');
    const currentPriceValue = document.getElementById('current-price-value');
    const removeCoinBtn = document.getElementById('remove-coin-btn');
    const navigation = document.getElementById('main-navigation');

    // API Constants
    const CG_API_KEY = 'CG-ssXWaw72QCZGNRBNxVtFYCWy';
    const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
    const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

    // State
    let trackedCoins = [];
    let alerts = {}; // { coinId: [{..., manuallyDeactivated}, ...], ... }
    let lastPrices = {};
    let searchTimeout = null;
    let currentApiSource = 'coingecko';
    let priceUpdateInterval = null;
    let currentModalCoinId = null;
    let draggedCoinId = null;

    // --- Data & State Management ---
    function loadState() {
        const storedCoins = localStorage.getItem('trackedCoins');
        trackedCoins = storedCoins ? JSON.parse(storedCoins) : [];
        
        const storedAlerts = localStorage.getItem('coinAlerts');
        alerts = storedAlerts ? JSON.parse(storedAlerts) : {};

        const storedLastPrices = localStorage.getItem('lastPrices');
        lastPrices = storedLastPrices ? JSON.parse(storedLastPrices) : {};

        const storedApiSource = localStorage.getItem('apiSource');
        if (storedApiSource) {
            currentApiSource = storedApiSource;
            apiSourceSelect.value = storedApiSource;
        }

        if (trackedCoins.length > 0) {
            renderTrackedCoins();
        } else {
            showEmptyState();
        }
    }

    function saveState() {
        localStorage.setItem('trackedCoins', JSON.stringify(trackedCoins));
        localStorage.setItem('coinAlerts', JSON.stringify(alerts));
        localStorage.setItem('lastPrices', JSON.stringify(lastPrices));
        localStorage.setItem('apiSource', currentApiSource);
        
        // 通知全局价格提醒系统重新加载状态
        if (window.globalPriceAlerts) {
            window.globalPriceAlerts.reloadState();
        }
    }

    function addCoin(coin) {
        if (!trackedCoins.some(c => c.id === coin.id)) {
            const coinData = {
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                thumb: coin.thumb,
                large: coin.large
            };
            trackedCoins.push(coinData);
            saveState();
            renderTrackedCoins();
            updatePrices();
            
                    // 显示成功通知
        PageNotify.success(`${coin.name} 已添加到监控列表`);
        } else {
            // 显示警告通知
            PageNotify.warning(`${coin.name} 已在监控列表中`);
        }
        searchInput.value = '';
        searchResultsContainer.innerHTML = '';
        searchResultsContainer.style.display = 'none';
    }

    function removeCoin(coinId) {
        const coin = trackedCoins.find(c => c.id === coinId);
        const coinName = coin ? coin.name : '货币';
        
        // 显示确认对话框
        if (confirm(`确定要删除 ${coinName} 吗？\n这将同时删除所有相关的价格提醒。`)) {
            trackedCoins = trackedCoins.filter(c => c.id !== coinId);
            // 删除相关的提醒
            if (alerts[coinId]) {
                delete alerts[coinId];
            }
            // 删除价格历史
            if (lastPrices[coinId]) {
                delete lastPrices[coinId];
            }
            saveState();
            renderTrackedCoins();
            if (trackedCoins.length === 0) {
                showEmptyState();
            }
            
            // 显示成功通知
            PageNotify.success(`${coinName} 已删除`);
        }
    }

    // --- Alert Management ---
    function addAlert() {
        const coinId = currentModalCoinId;
        const price = parseFloat(alertPriceInput.value);
        
        console.log('Adding alert for coin:', coinId, 'price:', price); // 调试信息
        
        if (!coinId || !price || price <= 0) {
            PageNotify.warning('请输入一个有效的正数价格');
            return;
        }

        const hours = parseInt(alertIntervalHoursInput.value, 10) || 0;
        const minutes = parseInt(alertIntervalMinutesInput.value, 10) || 0;
        const seconds = parseInt(alertIntervalSecondsInput.value, 10) || 0;
        const interval = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        if (alertRepeatCheckbox.checked && interval < 5000) { // Minimum 5s interval for repeats
            PageNotify.warning('重复提醒的最小间隔为5秒');
            return;
        }

        if (!alerts[coinId]) {
            alerts[coinId] = [];
        }

        const newAlert = {
            id: Date.now(),
            condition: alertCondition.value,
            price: price,
            repeat: alertRepeatCheckbox.checked,
            interval: interval,
            sound: alertSoundSelect.value,
            lastTriggered: 0,
            manuallyDeactivated: false,
            active: true
        };

        alerts[coinId].push(newAlert);
        console.log('Alert added:', newAlert); // 调试信息
        console.log('Current alerts for coin:', alerts[coinId]); // 调试信息
        
        saveState();
        renderActiveAlerts(coinId);
        updateCardAlertIndicator(coinId);
        
        // Reset form
        alertPriceInput.value = '';
        alertRepeatCheckbox.checked = true;  // 保持重复提醒默认打开
        intervalGroup.style.display = 'block';  // 保持间隔输入区域显示
        alertIntervalHoursInput.value = '';
        alertIntervalMinutesInput.value = '1';  // 默认1分钟
        alertIntervalSecondsInput.value = '';
        alertSoundSelect.selectedIndex = 0;
        
        // 显示成功通知
        const coinName = trackedCoins.find(c => c.id === coinId)?.name || '货币';
        const conditionText = alertCondition.options[alertCondition.selectedIndex].text;
        PageNotify.success(`${coinName} 价格提醒设置成功\n条件：${conditionText} $${price.toFixed(8)}`);
        console.log('Alert setup completed'); // 调试信息
    }

    function removeAlert(coinId, alertId) {
        if (alerts[coinId]) {
            const alert = alerts[coinId].find(a => a.id === alertId);
            const coinName = trackedCoins.find(c => c.id === coinId)?.name || '货币';
            
            // 显示确认对话框
            if (confirm(`确定要删除这个价格提醒吗？\n${coinName} - ${alert?.condition === 'above' ? '价格上涨至' : alert?.condition === 'below' ? '价格下跌至' : '价格穿过'} $${alert?.price?.toFixed(8) || '未知'}`)) {
                alerts[coinId] = alerts[coinId].filter(a => a.id !== alertId);
                if (alerts[coinId].length === 0) {
                    delete alerts[coinId];
                }
                saveState();
                renderActiveAlerts(coinId);
                updateCardAlertIndicator(coinId);
                
                // 显示成功通知
                PageNotify.success(`${coinName} 价格提醒已删除`);
            }
        }
    }

    function reEnableAlert(coinId, alertId) {
        if (alerts[coinId]) {
            const alert = alerts[coinId].find(a => a.id === alertId);
            const coinName = trackedCoins.find(c => c.id === coinId)?.name || '货币';
            
            if (alert) {
                if (alert.repeat) {
                    alert.manuallyDeactivated = false;
                }
                alert.active = true;
                saveState();
                renderActiveAlerts(coinId);
                updateCardAlertIndicator(coinId);
                
                // 显示成功通知
                PageNotify.success(`${coinName} 价格提醒已启用`);
            }
        }
    }
    
    function deactivateAlert(coinId, alertId) {
        if (alerts[coinId]) {
            const alert = alerts[coinId].find(a => a.id === alertId);
            const coinName = trackedCoins.find(c => c.id === coinId)?.name || '货币';
            
            if (alert) {
                if (alert.repeat) {
                    alert.manuallyDeactivated = true;
                } else {
                    alert.active = false;
                }
                saveState();
                renderActiveAlerts(coinId);
                updateCardAlertIndicator(coinId);
                
                // 显示成功通知
                PageNotify.info(`${coinName} 价格提醒已暂停`);
            }
        }
    }

    function checkAlerts(coinId, newPrice) {
        if (!alerts[coinId] || newPrice === null) return;
        
        const prevPrice = lastPrices[coinId];
        const now = Date.now();
        
        alerts[coinId].forEach(alert => {
            let triggered = false;
            if ((!alert.active && !alert.repeat) || (alert.repeat && alert.manuallyDeactivated)) {
                return;
            }

            // Trigger condition logic
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

            // Check if enough time has passed for repeat alerts
            if (triggered) {
                if (alert.repeat) {
                    if (now - alert.lastTriggered >= alert.interval) {
                        triggerNotification(coinId, alert);
                        alert.lastTriggered = now;
                        saveState();
                    }
                } else {
                    if (alert.active) {
                        triggerNotification(coinId, alert);
                        alert.active = false;
                        saveState();
                        renderActiveAlerts(coinId);
                        updateCardAlertIndicator(coinId);
                    }
                }
            }
        });
    }
    
    function triggerNotification(coinId, alert) {
        const coin = trackedCoins.find(c => c.id === coinId);
        if (!coin) return;

        // Play sound
        if (alert.sound) {
            const audio = new Audio(alert.sound);
            audio.play().catch(e => console.log('音频播放失败:', e));
        }

        // Flash card - 使用极简设计的类名
        flashCard(coinId);

        // Show browser notification if supported
        if (Notification.permission === 'granted') {
            new Notification(`${coin.name} 价格提醒`, {
                body: `价格已${alert.condition === 'above' ? '上涨至' : alert.condition === 'below' ? '下跌至' : '穿过'} ${alert.price}`,
                icon: coin.thumb
            });
        }
    }

    // --- API Functions ---
    async function searchCoins(query) {
        if (!query || query.length < 2) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.style.display = 'none';
            return;
        }
        
        try {
            // Use CoinGecko for search regardless of current API source
            const response = await fetch(`${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.coins && data.coins.length > 0) {
                renderSearchResults(data.coins.slice(0, 10)); // Show top 10 results
            } else {
                searchResultsContainer.innerHTML = '<div class="minimal-search-result"><span class="minimal-search-result-text">未找到相关货币</span></div>';
                searchResultsContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('搜索失败:', error);
            searchResultsContainer.innerHTML = '<div class="minimal-search-result"><span class="minimal-search-result-text">搜索失败，请重试</span></div>';
            searchResultsContainer.style.display = 'block';
            
            // 显示错误通知
            PageNotify.error('网络连接失败，请检查网络连接后重试');
        }
    }

    // --- Price Update Functions ---
    async function updatePrices() {
        if (trackedCoins.length === 0) return;
        
        try {
            let priceData = {};
        if (currentApiSource === 'coingecko') {
                priceData = await updatePricesFromCoinGecko();
        } else {
                priceData = await updatePricesFromBinance();
            }
            updateCoinCards(priceData, currentApiSource);
        } catch (error) {
            console.error('价格更新失败:', error);
            
            // 显示错误通知（但不要过于频繁）
            if (!window.lastPriceUpdateErrorTime || Date.now() - window.lastPriceUpdateErrorTime > 60000) {
                PageNotify.warning('价格数据更新失败，请检查网络连接');
                window.lastPriceUpdateErrorTime = Date.now();
            }
        }
    }

    async function updatePricesFromCoinGecko() {
        const coinIds = trackedCoins.map(coin => coin.id).join(',');
        const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();
        
        const priceData = {};
        Object.keys(data).forEach(coinId => {
            priceData[coinId] = {
                price: data[coinId].usd,
                change24h: data[coinId].usd_24h_change || 0
            };
        });
        
        return priceData;
    }

    async function updatePricesFromBinance() {
        const priceData = {};
        
        // Get all symbols from Binance
        const tickerResponse = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`);
        const tickerData = await tickerResponse.json();
        
        trackedCoins.forEach(coin => {
                const symbol = `${coin.symbol}USDT`;
            const ticker = tickerData.find(t => t.symbol === symbol);
            if (ticker) {
                priceData[coin.id] = {
                    price: parseFloat(ticker.lastPrice),
                    change24h: parseFloat(ticker.priceChangePercent)
                };
            }
        });
        
        return priceData;
    }

    // --- Render Functions ---
    function renderSearchResults(coins) {
        const html = coins.map(coin => `
            <div class="minimal-search-result" data-coin-id="${coin.id}">
                <img src="${coin.thumb}" alt="${coin.name}" loading="lazy">
                <span class="minimal-search-result-text">${coin.name} (${coin.symbol.toUpperCase()})</span>
            </div>
        `).join('');
        
        searchResultsContainer.innerHTML = html;
            searchResultsContainer.style.display = 'block';

        // Add click handlers
        searchResultsContainer.querySelectorAll('.minimal-search-result').forEach(item => {
            item.addEventListener('click', () => {
                const coinId = item.dataset.coinId;
                const coin = coins.find(c => c.id === coinId);
                if (coin) {
                    addCoin(coin);
        }
            });
        });
    }
    
    function renderTrackedCoins() {
        if (trackedCoins.length === 0) {
            showEmptyState();
            return;
        }

        const html = trackedCoins.map(coin => `
            <div class="minimal-coin-card ${alerts[coin.id] && alerts[coin.id].some(a => a.active || (a.repeat && !a.manuallyDeactivated)) ? 'has-alert' : ''}" data-coin-id="${coin.id}" draggable="true" onclick="openAlertModal('${coin.id}')">
                <div class="minimal-coin-card-header">
                    <img src="${coin.thumb}" alt="${coin.name}" loading="lazy">
                    <div>
                        <h3 class="minimal-coin-card-title">${coin.name}</h3>
                        <span class="minimal-coin-card-symbol">${coin.symbol}</span>
                    </div>
                </div>
                <div class="minimal-coin-card-price" id="price-${coin.id}">$0.00</div>
                <div class="minimal-coin-card-footer">
                    <span class="minimal-coin-card-change" id="change-${coin.id}">0.00%</span>
                </div>
            </div>
        `).join('');
        
        trackedCoinsList.innerHTML = html;
        
        // Add drag and drop handlers
        addDragAndDropHandlers();
        
        // Update prices immediately
        updatePrices();
    }

    function updateCoinCards(priceData, source) {
        trackedCoins.forEach(coin => {
            const priceElement = document.getElementById(`price-${coin.id}`);
            const changeElement = document.getElementById(`change-${coin.id}`);
            
            if (priceData[coin.id]) {
                const data = priceData[coin.id];
                const price = data.price;
                const change = data.change24h;
                
                if (priceElement) {
                    priceElement.textContent = `$${price.toFixed(price < 1 ? 6 : 2)}`;
                }
                
                if (changeElement) {
                    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    changeElement.className = `minimal-coin-card-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
                
                // Check alerts
                checkAlerts(coin.id, price);
                
                // Update last prices
                lastPrices[coin.id] = price;
                
                // Update current price display and input in modal if it's open for this coin
                if (currentModalCoinId === coin.id && currentPriceValue) {
                    currentPriceValue.textContent = `$${price.toFixed(price < 1 ? 6 : 2)}`;
                    
                    // 如果输入框为空，自动设置当前价格
                    if (!alertPriceInput.value || alertPriceInput.value.trim() === '') {
                        alertPriceInput.value = price;
                    }
                }
            }
        });
        
        saveState();
    }
    
    function updateCardAlertIndicator(coinId) {
        const card = document.querySelector(`[data-coin-id="${coinId}"]`);
        if (card) {
            const hasActiveAlerts = alerts[coinId] && alerts[coinId].some(a => a.active || (a.repeat && !a.manuallyDeactivated));
            card.classList.toggle('has-alert', hasActiveAlerts);
        }
    }
    
    function flashCard(coinId) {
        const card = document.querySelector(`[data-coin-id="${coinId}"]`);
        if (card) {
            card.classList.add('flash');
            // 15次闪烁，每次0.4秒，总共6秒
            setTimeout(() => {
                card.classList.remove('flash');
            }, 6000);
        }
    }

    // --- Modal Functions ---
    function openAlertModal(coinId) {
        currentModalCoinId = coinId;
        const coin = trackedCoins.find(c => c.id === coinId);
        if (coin) {
            modalCoinName.textContent = `${coin.name} 提醒设置`;
            
            // 清除输入框内容，准备设置当前价格
            alertPriceInput.value = '';
            
            // 设置重复提醒默认打开，时间默认为1分钟
            alertRepeatCheckbox.checked = true;
            intervalGroup.style.display = 'block';
            alertIntervalHoursInput.value = '';
            alertIntervalMinutesInput.value = '1';
            alertIntervalSecondsInput.value = '';
            
            renderActiveAlerts(coinId);
            updateCurrentPriceDisplayAndInput(coinId);
            alertModal.style.display = 'flex';
        }
    }

    // 使函数全局可访问
    window.openAlertModal = openAlertModal;
    window.removeCoin = removeCoin;

    function closeModal() {
        alertModal.style.display = 'none';
        currentModalCoinId = null;
        
        // 重置表单到默认状态
        alertPriceInput.value = '';
        alertCondition.selectedIndex = 0;
        alertRepeatCheckbox.checked = true;
        intervalGroup.style.display = 'block';
        alertIntervalHoursInput.value = '';
        alertIntervalMinutesInput.value = '1';
        alertIntervalSecondsInput.value = '';
        alertSoundSelect.selectedIndex = 0;
    }

    function updateCurrentPriceDisplay(coinId) {
        const coin = trackedCoins.find(c => c.id === coinId);
        if (!coin) return;

        // 尝试从已有的价格数据中获取
        const priceElement = document.getElementById(`price-${coinId}`);
        if (priceElement && priceElement.textContent !== '--') {
            const currentPrice = priceElement.textContent.replace('$', '').replace(',', '');
            currentPriceValue.textContent = `$${currentPrice}`;
        } else {
            currentPriceValue.textContent = '加载中...';
            // 获取实时价格
            fetchCurrentPrice(coinId);
        }
    }

    function updateCurrentPriceDisplayAndInput(coinId) {
        const coin = trackedCoins.find(c => c.id === coinId);
        if (!coin) return;

        // 尝试从已有的价格数据中获取
        const priceElement = document.getElementById(`price-${coinId}`);
        if (priceElement && priceElement.textContent !== '--') {
            const currentPriceText = priceElement.textContent.replace('$', '').replace(',', '');
            const currentPrice = parseFloat(currentPriceText);
            
            // 更新显示
            currentPriceValue.textContent = `$${currentPriceText}`;
            
            // 设置输入框默认值
            if (!isNaN(currentPrice)) {
                alertPriceInput.value = currentPrice;
            }
        } else {
            currentPriceValue.textContent = '加载中...';
            alertPriceInput.placeholder = '加载中...';
            // 获取实时价格并设置到输入框
            fetchCurrentPriceAndSetInput(coinId);
        }
    }

    async function fetchCurrentPrice(coinId) {
        try {
            if (currentApiSource === 'coingecko') {
                const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd`);
                const data = await response.json();
                if (data[coinId] && data[coinId].usd) {
                    const price = data[coinId].usd;
                    currentPriceValue.textContent = `$${price.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 8 
                    })}`;
                }
            } else {
                // Binance API logic
                const coin = trackedCoins.find(c => c.id === coinId);
                if (coin) {
                    const symbol = `${coin.symbol}USDT`;
                    const response = await fetch(`${BINANCE_BASE_URL}/ticker/price?symbol=${symbol}`);
                    const data = await response.json();
                    if (data.price) {
                        const price = parseFloat(data.price);
                        currentPriceValue.textContent = `$${price.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 8 
                        })}`;
                    }
                }
            }
        } catch (error) {
            console.error('获取当前价格失败:', error);
            currentPriceValue.textContent = '获取失败';
        }
    }

    async function fetchCurrentPriceAndSetInput(coinId) {
        try {
            let price = null;
            
            if (currentApiSource === 'coingecko') {
                const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd`);
                const data = await response.json();
                if (data[coinId] && data[coinId].usd) {
                    price = data[coinId].usd;
                }
            } else {
                // Binance API logic
                const coin = trackedCoins.find(c => c.id === coinId);
                if (coin) {
                    const symbol = `${coin.symbol}USDT`;
                    const response = await fetch(`${BINANCE_BASE_URL}/ticker/price?symbol=${symbol}`);
                    const data = await response.json();
                    if (data.price) {
                        price = parseFloat(data.price);
                    }
                }
            }
            
            if (price !== null) {
                // 更新显示
                currentPriceValue.textContent = `$${price.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 8 
                })}`;
                
                // 设置输入框默认值
                alertPriceInput.value = price;
                alertPriceInput.placeholder = "0.00000000";
            } else {
                currentPriceValue.textContent = '获取失败';
                alertPriceInput.placeholder = "请输入价格";
            }
        } catch (error) {
            console.error('获取当前价格失败:', error);
            currentPriceValue.textContent = '获取失败';
            alertPriceInput.placeholder = "请输入价格";
        }
    }

    function renderActiveAlerts(coinId) {
        console.log('Rendering alerts for coin:', coinId); // 调试信息
        console.log('Alerts data:', alerts[coinId]); // 调试信息
        
        if (!alerts[coinId] || alerts[coinId].length === 0) {
            activeAlertsList.innerHTML = '<li class="minimal-alert-item"><span class="minimal-alert-text">暂无提醒</span></li>';
            console.log('No alerts found, showing empty message'); // 调试信息
            return;
        }

        const html = alerts[coinId].map(alert => {
            const conditionText = alert.condition === 'above' ? '上涨至' : alert.condition === 'below' ? '下跌至' : '穿过';
            const statusText = alert.repeat ? 
                (alert.manuallyDeactivated ? '已暂停' : '重复') : 
                (alert.active ? '单次' : '已触发');
            
            console.log('Rendering alert:', alert); // 调试信息
            
            return `
                <li class="minimal-alert-item ${(!alert.active && !alert.repeat) || (alert.repeat && alert.manuallyDeactivated) ? 'triggered' : ''}">
                    <span class="minimal-alert-text">${conditionText} $${alert.price} (${statusText})</span>
                    <div class="minimal-alert-actions">
                        ${alert.repeat && alert.manuallyDeactivated ? 
                            `<button class="minimal-alert-btn" onclick="reEnableAlert('${coinId}', ${alert.id})">重启</button>` : 
                            alert.active ? 
                                `<button class="minimal-alert-btn" onclick="deactivateAlert('${coinId}', ${alert.id})">暂停</button>` : 
                                `<button class="minimal-alert-btn" onclick="reEnableAlert('${coinId}', ${alert.id})">恢复</button>`
                        }
                        <button class="minimal-alert-btn" onclick="removeAlert('${coinId}', ${alert.id})">删除</button>
                    </div>
                </li>
            `;
        }).join('');
        
        console.log('Generated HTML:', html); // 调试信息
        activeAlertsList.innerHTML = html;
        console.log('Alerts rendered to DOM'); // 调试信息
    }

    // 使函数全局可访问
    window.removeAlert = removeAlert;
    window.reEnableAlert = reEnableAlert;
    window.deactivateAlert = deactivateAlert;

    // --- API Source Management ---
    function handleApiSourceChange() {
        const oldSource = currentApiSource;
        currentApiSource = apiSourceSelect.value;
        saveState();
        
        // Clear existing interval
        if (priceUpdateInterval) {
            clearInterval(priceUpdateInterval);
        }
        
        // Set new update interval based on API source
        const updateFrequency = currentApiSource === 'binance' ? 5000 : 30000; // 5s for Binance, 30s for CoinGecko
        priceUpdateInterval = setInterval(updatePrices, updateFrequency);
        
        // Update prices immediately
        updatePrices();
        
        // 显示切换成功通知
        const sourceNames = {
            'coingecko': 'CoinGecko',
            'binance': 'Binance'
        };
        PageNotify.info(`已切换到 ${sourceNames[currentApiSource]} 数据源`);
    }

    function showEmptyState() {
        trackedCoinsList.innerHTML = `
            <div class="minimal-empty-state">
                <div class="minimal-empty-icon">○</div>
                <h3 class="minimal-empty-title">暂无监控货币</h3>
                <p class="minimal-empty-text">使用上方搜索功能添加要监控的加密货币</p>
            </div>
        `;
    }
    
    // --- Drag and Drop Functions ---
    function addDragAndDropHandlers() {
        const cards = document.querySelectorAll('.minimal-coin-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragenter', handleDragEnter);
            card.addEventListener('dragleave', handleDragLeave);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        draggedCoinId = e.target.dataset.coinId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        if (e.target.closest('.minimal-coin-card') && e.target.closest('.minimal-coin-card').dataset.coinId !== draggedCoinId) {
            e.target.closest('.minimal-coin-card').classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        if (e.target.closest('.minimal-coin-card')) {
            e.target.closest('.minimal-coin-card').classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetCard = e.target.closest('.minimal-coin-card');
        if (targetCard && targetCard.dataset.coinId !== draggedCoinId) {
            const targetCoinId = targetCard.dataset.coinId;
            
            // Reorder coins array
            const draggedIndex = trackedCoins.findIndex(c => c.id === draggedCoinId);
            const targetIndex = trackedCoins.findIndex(c => c.id === targetCoinId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const draggedCoin = trackedCoins.splice(draggedIndex, 1)[0];
                trackedCoins.splice(targetIndex, 0, draggedCoin);
            
            saveState();
            renderTrackedCoins();
            }
        }
    }

    function handleDragEnd() {
        document.querySelectorAll('.minimal-coin-card').forEach(card => {
            card.classList.remove('dragging', 'drag-over');
        });
        draggedCoinId = null;
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchCoins(e.target.value.trim());
        }, 300);
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.minimal-search')) {
            searchResultsContainer.style.display = 'none';
        }
    });

    apiSourceSelect.addEventListener('change', handleApiSourceChange);

    closeModalBtn.addEventListener('click', closeModal);
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            closeModal();
            }
        });
        
    setAlertBtn.addEventListener('click', addAlert);

    alertRepeatCheckbox.addEventListener('change', (e) => {
        intervalGroup.style.display = e.target.checked ? 'block' : 'none';
    });

    previewSoundBtn.addEventListener('click', () => {
        const soundFile = alertSoundSelect.value;
        if (soundFile) {
            // 防止重复播放
            if (previewSoundBtn.classList.contains('playing')) {
                return;
            }

            const audio = new Audio(soundFile);
            const btnText = previewSoundBtn.querySelector('.minimal-sound-btn-text');
            
            // 添加播放状态
            previewSoundBtn.classList.add('playing');
            previewSoundBtn.disabled = true;
            btnText.innerHTML = `
                <span class="minimal-audio-indicator">
                    <span class="minimal-audio-bar"></span>
                    <span class="minimal-audio-bar"></span>
                    <span class="minimal-audio-bar"></span>
                    <span class="minimal-audio-bar"></span>
                </span>
            `;
            
            // 播放音频
            audio.play().then(() => {
                // 播放成功，等待播放结束
                audio.addEventListener('ended', () => {
                    handleAudioEnd();
                });
                
                // 设置最大播放时间（5秒）
                setTimeout(() => {
                    if (!audio.ended) {
                        audio.pause();
                        audio.currentTime = 0;
                        handleAudioEnd();
                    }
                }, 5000);
                
            }).catch(e => {
                console.log('音频播放失败:', e);
                handleAudioEnd();
            });
            
            function handleAudioEnd() {
                // 显示完成状态
                previewSoundBtn.classList.remove('playing');
                previewSoundBtn.classList.add('completed');
                btnText.innerHTML = '✓';
                
                // 1秒后恢复原状
                setTimeout(() => {
                    previewSoundBtn.classList.remove('completed');
                    previewSoundBtn.disabled = false;
                    btnText.innerHTML = '▶';
                }, 1000);
            }
        }
    });
        
    removeCoinBtn.addEventListener('click', async () => {
        if (currentModalCoinId) {
            const confirmed = confirm('确定要删除这个货币吗？所有相关的提醒也会被删除。');
            if (confirmed) {
                removeCoin(currentModalCoinId);
                closeModal();
            }
        }
    });

    // Request notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // --- Initialize ---
    loadState();
    
    // Start price updates
    const updateFrequency = currentApiSource === 'binance' ? 5000 : 30000;
    priceUpdateInterval = setInterval(updatePrices, updateFrequency);
});