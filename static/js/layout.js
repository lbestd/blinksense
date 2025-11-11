class LayoutManager {
    constructor() {
        this.isResizing = false;
        this.currentComponent = null;
        this.startHeight = 0;
        this.startY = 0;
    }

    async init() {
        await this.loadLayoutConfig();
        this.applyLayoutConfig();
        this.setupResizeHandlers();
    }

    async loadLayoutConfig() {
        try {
            const response = await fetch('/api/layout');
            this.layoutConfig = await response.json();
        } catch (error) {
            console.error('Ошибка загрузки layout:', error);
            this.layoutConfig = {
                chart: { height: 400 },
                table: { height: 600 },
                filters: { height: 200 }
            };
        }
    }

    applyLayoutConfig() {
        // Применяем высоты к компонентам
        Object.keys(this.layoutConfig).forEach(component => {
            const element = document.querySelector(`[data-component="${component}"]`);
            if (element && this.layoutConfig[component].height) {
                element.style.height = `${this.layoutConfig[component].height}px`;
            }
        });
    }

    setupResizeHandlers() {
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));

        // Touch events для мобильных устройств
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('touchstart', this.startResizeTouch.bind(this));
        });
        document.addEventListener('touchmove', this.resizeTouch.bind(this));
        document.addEventListener('touchend', this.stopResize.bind(this));
    }

    startResize(e) {
        e.preventDefault();
        this.isResizing = true;
        this.currentComponent = e.target.closest('.resizable');
        this.startHeight = parseInt(getComputedStyle(this.currentComponent).height, 10);
        this.startY = e.clientY;

        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }

    startResizeTouch(e) {
        e.preventDefault();
        this.isResizing = true;
        this.currentComponent = e.target.closest('.resizable');
        this.startHeight = parseInt(getComputedStyle(this.currentComponent).height, 10);
        this.startY = e.touches[0].clientY;

        document.body.style.userSelect = 'none';
    }

    resize(e) {
        if (!this.isResizing) return;

        const delta = e.clientY - this.startY;
        const newHeight = this.startHeight + delta;

        if (newHeight > 100) { // Минимальная высота
            this.currentComponent.style.height = `${newHeight}px`;
        }
    }

    resizeTouch(e) {
        if (!this.isResizing) return;

        const delta = e.touches[0].clientY - this.startY;
        const newHeight = this.startHeight + delta;

        if (newHeight > 100) {
            this.currentComponent.style.height = `${newHeight}px`;
        }
    }

    async stopResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        await this.saveLayoutConfig();
    }

    async saveLayoutConfig() {
        const newConfig = {};

        document.querySelectorAll('.resizable').forEach(element => {
            const component = element.dataset.component;
            const height = parseInt(element.style.height, 10);

            if (component && height) {
                newConfig[component] = { height };
            }
        });

        try {
            const response = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });

            this.layoutConfig = await response.json();
            console.log('✅ Layout сохранен на сервере');
        } catch (error) {
            console.error('❌ Ошибка сохранения layout:', error);
        }
    }

    resetLayout() {
        const defaultConfig = {
            chart: { height: 400 },
            table: { height: 600 },
            filters: { height: 200 }
        };

        Object.keys(defaultConfig).forEach(component => {
            const element = document.querySelector(`[data-component="${component}"]`);
            if (element) {
                element.style.height = `${defaultConfig[component].height}px`;
            }
        });

        this.saveLayoutConfig();
    }
}