class PanelConfigModal {
    constructor(panel, panelManager) {
        this.panel = panel;
        this.panelManager = panelManager;
        this.gridManager = panelManager.gridManager;
        this.tabs = {
            dimensions: new DimensionsTab(panel, this.gridManager),
            measures: new MeasuresTab(panel, this.gridManager),
            sorting: new SortingTab(panel, this.gridManager)
        };
    }

    show() {
        const modalHtml = `
            <div class="modal fade config-modal" id="panelConfigModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">⚙️ Конфигурация панели</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs" id="configTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="dimensions-tab-btn" data-bs-toggle="tab"
                                            data-bs-target="#dimensions-tab-content" type="button" role="tab">
                                        📐 Размеры
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="measures-tab-btn" data-bs-toggle="tab"
                                            data-bs-target="#measures-tab-content" type="button" role="tab">
                                        🧮 Меры
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="sorting-tab-btn" data-bs-toggle="tab"
                                            data-bs-target="#sorting-tab-content" type="button" role="tab">
                                        🔄 Сортировка
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content mt-3" id="configTabsContent">
                                <div class="tab-pane fade show active" id="dimensions-tab-content" role="tabpanel">
                                    ${this.tabs.dimensions.render()}
                                </div>
                                <div class="tab-pane fade" id="measures-tab-content" role="tabpanel">
                                    ${this.tabs.measures.render()}
                                </div>
                                <div class="tab-pane fade" id="sorting-tab-content" role="tabpanel">
                                    ${this.tabs.sorting.render()}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" id="savePanelConfig">Сохранить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Удаляем существующее модальное окно если есть
        const existingModal = document.getElementById('panelConfigModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalElement = document.getElementById('panelConfigModal');
        const modal = new bootstrap.Modal(modalElement);

        this.setupEvents(modalElement);
        modal.show();

        // Удаляем модальное окно при закрытии
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
    }

    setupEvents(modalElement) {
        // Настройка событий для каждой вкладки
        Object.values(this.tabs).forEach(tab => {
            if (tab.setupEvents) {
                tab.setupEvents(modalElement);
            }
        });

        // Сохранение конфигурации
        modalElement.querySelector('#savePanelConfig').addEventListener('click', () => {
            this.saveConfig();
            bootstrap.Modal.getInstance(modalElement).hide();
        });

        // Обработка переключения вкладок
        const tabButtons = modalElement.querySelectorAll('[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                // Можно добавить логику при переключении вкладок
            });
        });
    }

    saveConfig() {
        // Финализируем обновление конфигурации для всех вкладок
        Object.values(this.tabs).forEach(tab => {
            if (tab.updateConfig) {
                tab.updateConfig();
            }
        });

        // Обновляем панель с новой конфигурацией
        this.panelManager.updatePanelContent(this.panel);
    }
}