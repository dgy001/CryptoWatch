// 自定义下拉组件
class MinimalSelect {
    constructor(selectElement) {
        this.originalSelect = selectElement;
        this.options = Array.from(selectElement.options);
        this.selectedIndex = selectElement.selectedIndex;
        this.isOpen = false;
        
        this.createCustomSelect();
        this.bindEvents();
    }
    
    createCustomSelect() {
        // 创建包装器
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'minimal-select-wrapper';
        
        // 创建显示元素
        this.display = document.createElement('div');
        this.display.className = 'minimal-select-display';
        this.display.textContent = this.options[this.selectedIndex]?.text || '';
        this.display.tabIndex = 0;
        
        // 创建选项容器
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'minimal-select-options';
        
        // 创建选项
        this.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'minimal-select-option';
            optionElement.textContent = option.text;
            optionElement.dataset.value = option.value;
            optionElement.dataset.index = index;
            
            if (index === this.selectedIndex) {
                optionElement.classList.add('selected');
            }
            
            this.optionsContainer.appendChild(optionElement);
        });
        
        // 组装
        this.wrapper.appendChild(this.display);
        this.wrapper.appendChild(this.optionsContainer);
        
        // 替换原始select
        this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect);
        this.originalSelect.style.display = 'none';
    }
    
    bindEvents() {
        // 点击显示/隐藏选项
        this.display.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // 键盘导航
        this.display.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isOpen) {
                        this.focusNextOption();
                    } else {
                        this.open();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isOpen) {
                        this.focusPrevOption();
                    } else {
                        this.open();
                    }
                    break;
                case 'Escape':
                    this.close();
                    break;
            }
        });
        
        // 选项点击
        this.optionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('minimal-select-option')) {
                const index = parseInt(e.target.dataset.index);
                this.selectOption(index);
                this.close();
            }
        });
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.display.classList.add('active');
        this.optionsContainer.classList.add('show');
        
        // 关闭其他下拉框
        document.querySelectorAll('.minimal-select-wrapper').forEach(wrapper => {
            if (wrapper !== this.wrapper) {
                const instance = wrapper._minimalSelectInstance;
                if (instance) {
                    instance.close();
                }
            }
        });
    }
    
    close() {
        this.isOpen = false;
        this.display.classList.remove('active');
        this.optionsContainer.classList.remove('show');
    }
    
    selectOption(index) {
        // 更新选中状态
        this.optionsContainer.querySelectorAll('.minimal-select-option').forEach((option, i) => {
            option.classList.toggle('selected', i === index);
        });
        
        // 更新显示
        this.display.textContent = this.options[index].text;
        this.selectedIndex = index;
        
        // 更新原始select
        this.originalSelect.selectedIndex = index;
        
        // 触发change事件
        const changeEvent = new Event('change', { bubbles: true });
        this.originalSelect.dispatchEvent(changeEvent);
    }
    
    focusNextOption() {
        const nextIndex = Math.min(this.selectedIndex + 1, this.options.length - 1);
        this.selectOption(nextIndex);
    }
    
    focusPrevOption() {
        const prevIndex = Math.max(this.selectedIndex - 1, 0);
        this.selectOption(prevIndex);
    }
}

// 初始化所有自定义下拉框
function initializeCustomSelects() {
    document.querySelectorAll('select.minimal-select').forEach(select => {
        if (!select._minimalSelectInstance) {
            const instance = new MinimalSelect(select);
            select._minimalSelectInstance = instance;
            select.parentNode._minimalSelectInstance = instance;
        }
    });
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeCustomSelects);

// 导出供其他脚本使用
window.MinimalSelect = MinimalSelect;
window.initializeCustomSelects = initializeCustomSelects; 