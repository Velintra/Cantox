const ICON_NAMES = Object.keys(window.feather?.icons || {});

class DataManager {
    constructor() {
        this.loadData();
        this.collapsed = this.loadCollapsed();
    }

    loadData() {
        const saved = localStorage.getItem('dashboardData');
        if (saved) {
            const data = JSON.parse(saved);
            this.categories = data.categories || [];
            this.websites = data.websites || [];
        } else {
            this.categories = [];
            this.websites = [];
        }
    }

    saveData() {
        localStorage.setItem('dashboardData', JSON.stringify({
            categories: this.categories,
            websites: this.websites
        }));
    }

    loadCollapsed() {
        try {
            return JSON.parse(localStorage.getItem('collapsedCategories')) || {};
        } catch {
            return {};
        }
    }

    saveCollapsed() {
        localStorage.setItem('collapsedCategories', JSON.stringify(this.collapsed));
    }

    setCategoryCollapsed(id, value) {
        this.collapsed[id] = !!value;
        this.saveCollapsed();
    }

    isCategoryCollapsed(id) {
        return !!this.collapsed[id];
    }

    addCategory(name) {
        if (!name.trim()) return false;
        this.categories.push({
            id: Date.now(),
            name: name.trim()
        });
        this.saveData();
        return true;
    }

    deleteCategory(id) {
        this.categories = this.categories.filter(c => c.id !== id);
        this.websites = this.websites.filter(w => w.categoryId !== id);
        this.saveData();
    }

    moveCategoryUp(id) {
        const idx = this.categories.findIndex(c => c.id === id);
        if (idx > 0) {
            const tmp = this.categories[idx - 1];
            this.categories[idx - 1] = this.categories[idx];
            this.categories[idx] = tmp;
            this.saveData();
        }
    }

    moveCategoryDown(id) {
        const idx = this.categories.findIndex(c => c.id === id);
        if (idx !== -1 && idx < this.categories.length - 1) {
            const tmp = this.categories[idx + 1];
            this.categories[idx + 1] = this.categories[idx];
            this.categories[idx] = tmp;
            this.saveData();
        }
    }

    reorderCategory(id, toIndex) {
        const fromIndex = this.categories.findIndex(c => c.id === id);
        if (fromIndex === -1) return;
        const clampedTo = Math.max(0, Math.min(toIndex, this.categories.length - 1));
        if (fromIndex === clampedTo) return;
        const [item] = this.categories.splice(fromIndex, 1);
        this.categories.splice(clampedTo, 0, item);
        this.saveData();
    }

    addWebsite(name, url, categoryId, icon) {
        if (!name.trim() || !url.trim() || !categoryId || !icon) return false;
        this.websites.push({
            id: Date.now(),
            name: name.trim(),
            url: url.trim(),
            categoryId: categoryId,
            icon: icon
        });
        this.saveData();
        return true;
    }

    deleteWebsite(id) {
        this.websites = this.websites.filter(w => w.id !== id);
        this.saveData();
    }

    moveWebsiteUp(id) {
        const idx = this.websites.findIndex(w => w.id === id);
        if (idx === -1) return;
        const catId = this.websites[idx].categoryId;
        for (let j = idx - 1; j >= 0; j--) {
            if (this.websites[j].categoryId === catId) {
                const tmp = this.websites[j];
                this.websites[j] = this.websites[idx];
                this.websites[idx] = tmp;
                this.saveData();
                return;
            }
        }
    }

    moveWebsiteDown(id) {
        const idx = this.websites.findIndex(w => w.id === id);
        if (idx === -1) return;
        const catId = this.websites[idx].categoryId;
        for (let j = idx + 1; j < this.websites.length; j++) {
            if (this.websites[j].categoryId === catId) {
                const tmp = this.websites[j];
                this.websites[j] = this.websites[idx];
                this.websites[idx] = tmp;
                this.saveData();
                return;
            }
        }
    }

    reorderWebsiteWithinCategory(websiteId, toCatIndex) {
        const fromGlobalIndex = this.websites.findIndex(w => w.id === websiteId);
        if (fromGlobalIndex === -1) return;
        const catId = this.websites[fromGlobalIndex].categoryId;
        const catIndices = this.websites
            .map((w, i) => (w.categoryId === catId ? i : -1))
            .filter(i => i !== -1);
        const fromCatIndex = catIndices.indexOf(fromGlobalIndex);
        if (fromCatIndex === -1) return;
        const clampedTo = Math.max(0, Math.min(toCatIndex, catIndices.length - 1));
        if (fromCatIndex === clampedTo) return;
        const targetGlobalIndex = catIndices[clampedTo];
        const [item] = this.websites.splice(fromGlobalIndex, 1);
        const adjust = fromGlobalIndex < targetGlobalIndex ? targetGlobalIndex - 1 : targetGlobalIndex;
        this.websites.splice(adjust, 0, item);
        this.saveData();
    }

    getWebsitesByCategory(categoryId) {
        return this.websites.filter(w => w.categoryId === categoryId);
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : '';
    }
}

class App {
    constructor() {
        this.data = new DataManager();
        this.selectedIcon = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderHomeView();
        this.loadTheme();
        this.renderNavbarIcons();
    }

    setupEventListeners() {
        document.getElementById('settingsBtn').addEventListener('click', () => this.switchView('settings'));

        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => this.addCategory());
        document.getElementById('categoryName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });

        document.getElementById('addWebsiteBtn').addEventListener('click', () => this.addWebsite());
        document.getElementById('websiteName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWebsite();
        });

        document.getElementById('iconPickerBtn').addEventListener('click', () => this.openIconPicker());
        document.getElementById('closeIconPicker').addEventListener('click', () => this.closeIconPicker());
        document.getElementById('iconSearch').addEventListener('input', (e) => this.searchIcons(e.target.value));

        document.getElementById('iconPickerModal').addEventListener('click', (e) => {
            if (e.target.id === 'iconPickerModal') this.closeIconPicker();
        });

        document.getElementById('genericModalClose').addEventListener('click', () => this.closeGenericModal(false));
        document.getElementById('genericModalCancel').addEventListener('click', () => this.closeGenericModal(false));
        document.getElementById('genericModalConfirm').addEventListener('click', () => this.closeGenericModal(true));

        const exportBtn = document.getElementById('exportConfigBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportConfig());
        const importBtn = document.getElementById('importConfigBtn');
        if (importBtn) importBtn.addEventListener('click', () => this.importConfigFromFile());
        const resetBtn = document.getElementById('resetConfigBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetConfig());

        const dropzone = document.getElementById('importDropzone');
        const fileInput = document.getElementById('importConfigFile');
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
            ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-over');
            }));
            ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-over');
            }));
            dropzone.addEventListener('drop', (e) => {
                const files = e.dataTransfer?.files || [];
                if (files.length) {
                    this.importConfigFromFile(files[0]);
                }
            });
            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                if (file) {
                    this.importConfigFromFile(file);
                }
            });
        }
    }

    switchView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view === 'settings' ? 'settingsView' : 'homeView').classList.add('active');
        
        if (view === 'settings') {
            this.updateCategorySelect();
            this.renderCategoriesList();
            this.renderWebsitesList();
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab-button[data-tab="${tab}"]`)?.classList.add('active');
        document.getElementById(tab + 'Tab').classList.add('active');
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.renderNavbarIcons();
    }

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark');
        }
    }

    addCategory() {
        const name = document.getElementById('categoryName').value;
        if (this.data.addCategory(name)) {
            document.getElementById('categoryName').value = '';
            this.renderCategoriesList();
            this.renderHomeView();
            this.updateCategorySelect();
        }
    }

    deleteCategory(id) {
        this.confirmModal('Delete this category and all its websites?').then(confirmed => {
            if (!confirmed) return;
            this.data.deleteCategory(id);
            this.renderCategoriesList();
            this.renderHomeView();
            this.updateCategorySelect();
        });
    }

    moveCategoryUp(id) {
        this.data.moveCategoryUp(id);
        this.renderCategoriesList();
        this.renderHomeView();
        this.updateCategorySelect();
    }

    moveCategoryDown(id) {
        this.data.moveCategoryDown(id);
        this.renderCategoriesList();
        this.renderHomeView();
        this.updateCategorySelect();
    }

    addWebsite() {
        const name = document.getElementById('websiteName').value;
        const url = document.getElementById('websiteUrl').value;
        const categoryId = parseInt(document.getElementById('websiteCategory').value);
        
        if (!this.selectedIcon) {
            this.alertModal('Please select an icon');
            return;
        }

        if (this.data.addWebsite(name, url, categoryId, this.selectedIcon)) {
            document.getElementById('websiteName').value = '';
            document.getElementById('websiteUrl').value = '';
            document.getElementById('websiteCategory').value = '';
            this.selectedIcon = null;
            document.getElementById('selectedIconPreview').innerHTML = '';
            this.renderWebsitesList();
            this.renderHomeView();
        }
    }

    deleteWebsite(id) {
        this.confirmModal('Delete this website?').then(confirmed => {
            if (!confirmed) return;
            this.data.deleteWebsite(id);
            this.renderWebsitesList();
            this.renderHomeView();
        });
    }

    moveWebsiteUp(id) {
        this.data.moveWebsiteUp(id);
        this.renderWebsitesList();
        this.renderHomeView();
    }

    moveWebsiteDown(id) {
        this.data.moveWebsiteDown(id);
        this.renderWebsitesList();
        this.renderHomeView();
    }

    updateCategorySelect() {
        const select = document.getElementById('websiteCategory');
        select.innerHTML = '<option value="">Select category</option>';
        this.data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    }

    renderCategoriesList() {
        const list = document.getElementById('categoriesList');
        list.innerHTML = '';
        
        if (this.data.categories.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No categories yet. Add one above!</p>';
            return;
        }

        this.data.categories.forEach((cat, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.setAttribute('draggable', 'true');
            row.dataset.id = String(cat.id);
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', row.dataset.id);
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = this.data.categories.findIndex(c => c.id === cat.id);
                this.data.reorderCategory(draggedId, toIndex);
                this.renderCategoriesList();
                this.renderHomeView();
                this.updateCategorySelect();
            });
            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${cat.name}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger btn-small" onclick="app.deleteCategory(${cat.id})">Delete</button>
                </div>
            `;
            list.appendChild(row);
        });
    }

    renderWebsitesList() {
        const container = document.getElementById('websitesList');
        container.innerHTML = '';

        if (this.data.websites.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No websites yet. Add one above!</p>';
            return;
        }

        this.data.categories.forEach(category => {
            const section = document.createElement('div');
            section.style.marginBottom = '1rem';

            const header = document.createElement('div');
            header.className = 'category-header';
            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = category.name;
            header.appendChild(title);
            section.appendChild(header);

            const list = document.createElement('div');
            list.className = 'items-list';
            list.id = `websitesList-cat-${category.id}`;

            const sites = this.data.getWebsitesByCategory(category.id);
            sites.forEach(site => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.setAttribute('draggable', 'true');
                row.dataset.id = String(site.id);
                row.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', row.dataset.id);
                });
                row.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    row.classList.add('drag-over');
                });
                row.addEventListener('dragleave', () => {
                    row.classList.remove('drag-over');
                });
                row.addEventListener('drop', (e) => {
                    e.preventDefault();
                    row.classList.remove('drag-over');
                    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                    const categoryId = category.id;
                    const sitesInCat = this.data.getWebsitesByCategory(categoryId);
                    const toIndex = sitesInCat.findIndex(s => s.id === site.id);
                    this.data.reorderWebsiteWithinCategory(draggedId, toIndex);
                    this.renderWebsitesList();
                    this.renderHomeView();
                });
                row.innerHTML = `
                    <div class="item-info">
                        <div class="item-name">${site.name}</div>
                        <div class="item-url">${site.url}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger btn-small" onclick="app.deleteWebsite(${site.id})">Delete</button>
                    </div>
                `;
                list.appendChild(row);
            });

            section.appendChild(list);
            container.appendChild(section);
        });
    }

    renderHomeView() {
        const container = document.getElementById('categoriesContainer');
        container.innerHTML = '';

        if (this.data.categories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; animation: fadeIn 0.5s ease-out;">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">🚀</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground));">Welcome to your Dashboard</h3>
                    <p style="color: hsl(var(--muted-foreground)); margin-bottom: 1.5rem;">Get started by creating your first category in Settings.</p>
                    <button class="btn btn-primary" onclick="app.switchView('settings')">Create Category</button>
                </div>
            `;
            return;
        }

        this.data.categories.forEach(category => {
            const websites = this.data.getWebsitesByCategory(category.id);
            if (websites.length === 0) return;

            const section = document.createElement('div');
            section.className = 'category-section';

            const header = document.createElement('div');
            header.className = 'category-header';
            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = category.name;

            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'collapse-btn';
            const isCollapsed = this.data.isCategoryCollapsed(category.id);
            collapseBtn.innerHTML = window.feather.icons[isCollapsed ? 'chevron-down' : 'chevron-up'].toSvg({ width: 18, height: 18 });
            collapseBtn.addEventListener('click', () => {
                const newState = !this.data.isCategoryCollapsed(category.id);
                this.data.setCategoryCollapsed(category.id, newState);
                this.renderHomeView();
            });

            header.appendChild(title);
            header.appendChild(collapseBtn);
            section.appendChild(header);

            const list = document.createElement('div');
            list.className = 'link-list';
            if (isCollapsed) {
                section.appendChild(list);
                container.appendChild(section);
                return;
            }

            for (let i = 0; i < websites.length; i += 2) {
                const row = document.createElement('div');
                row.className = 'link-row';

                const makeItem = (site) => {
                    const a = document.createElement('a');
                    a.href = site.url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.className = 'link-item';
                    const svg = (window.feather?.icons?.[site.icon] || window.feather?.icons?.['globe'])?.toSvg({ width: 20, height: 20 });
                    a.innerHTML = `
                        <div class="link-icon">${svg}</div>
                        <div class="link-content">
                            <div class="link-title">${site.name}</div>
                            <div class="link-url">${site.url}</div>
                        </div>
                    `;
                    return a;
                };

                row.appendChild(makeItem(websites[i]));
                if (websites[i + 1]) row.appendChild(makeItem(websites[i + 1]));
                list.appendChild(row);
            }

            section.appendChild(list);
            container.appendChild(section);
        });
    }

    openIconPicker() {
        const modal = document.getElementById('iconPickerModal');
        modal.classList.add('active');
        this.renderIconGrid();
    }

    closeIconPicker() {
        document.getElementById('iconPickerModal').classList.remove('active');
    }

    renderIconGrid(filter = '') {
        const grid = document.getElementById('iconGrid');
        grid.innerHTML = '';

        const filteredIcons = ICON_NAMES.filter(name => 
            name.toLowerCase().includes(filter.toLowerCase())
        );

        filteredIcons.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'icon-option';
            if (this.selectedIcon === name) btn.classList.add('selected');
            btn.innerHTML = window.feather.icons[name].toSvg({ width: 24, height: 24 });
            btn.addEventListener('click', () => this.selectIcon(name));
            grid.appendChild(btn);
        });
    }

    selectIcon(name) {
        this.selectedIcon = name;
        const preview = document.getElementById('selectedIconPreview');
        const iconObj = window.feather.icons[name] || window.feather.icons['globe'];
        preview.innerHTML = iconObj.toSvg({ width: 24, height: 24 });
        this.renderIconGrid(document.getElementById('iconSearch').value);
        this.closeIconPicker();
    }

    searchIcons(query) {
        this.renderIconGrid(query);
    }

    renderNavbarIcons() {
        const settingsBtn = document.getElementById('settingsBtn');
        const themeBtn = document.getElementById('themeToggle');
        settingsBtn.innerHTML = window.feather.icons['settings'].toSvg({ width: 18, height: 18 });
        const isDark = document.body.classList.contains('dark');
        themeBtn.innerHTML = window.feather.icons[isDark ? 'moon' : 'sun'].toSvg({ width: 18, height: 18 });
    }

    showModal({ title = 'Notice', body = '', confirmText = 'OK', cancelText = 'Cancel' } = {}) {
        return new Promise(resolve => {
            this._modalResolver = resolve;
            document.getElementById('genericModalTitle').textContent = title;
            document.getElementById('genericModalBody').innerHTML = body;
            const confirmBtn = document.getElementById('genericModalConfirm');
            const cancelBtn = document.getElementById('genericModalCancel');
            confirmBtn.textContent = confirmText || 'OK';
            cancelBtn.style.display = cancelText === null ? 'none' : 'inline-flex';
            cancelBtn.textContent = cancelText || 'Cancel';
            document.getElementById('genericModal').classList.add('active');
        });
    }

    closeGenericModal(confirmed) {
        document.getElementById('genericModal').classList.remove('active');
        if (this._modalResolver) {
            this._modalResolver(!!confirmed);
            this._modalResolver = null;
        }
    }

    confirmModal(message) {
        return this.showModal({ title: 'Confirm', body: `<p>${message}</p>`, confirmText: 'Confirm', cancelText: 'Cancel' });
    }

    alertModal(message) {
        return this.showModal({ title: 'Alert', body: `<p>${message}</p>`, confirmText: 'OK', cancelText: null });
    }

    exportConfig() {
        const payload = {
            categories: this.data.categories,
            websites: this.data.websites,
            theme: localStorage.getItem('theme') || 'light',
            collapsedCategories: this.data.collapsed
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importConfigFromFile(fileArg) {
        const fileInput = document.getElementById('importConfigFile');
        const file = fileArg || fileInput?.files?.[0];
        if (!file) return this.alertModal('Please choose a JSON file.');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result);
                const cats = Array.isArray(json.categories) ? json.categories : [];
                const webs = Array.isArray(json.websites) ? json.websites : [];
                const collapsed = json.collapsedCategories || {};
                const theme = json.theme === 'dark' ? 'dark' : 'light';

                localStorage.setItem('dashboardData', JSON.stringify({ categories: cats, websites: webs }));
                localStorage.setItem('collapsedCategories', JSON.stringify(collapsed));
                localStorage.setItem('theme', theme);

                this.data.loadData();
                this.data.collapsed = collapsed;

                if (theme === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark');
                this.renderNavbarIcons();
                this.updateCategorySelect();
                this.renderCategoriesList();
                this.renderWebsitesList();
                this.renderHomeView();
                this.alertModal('Configuration imported successfully.');
            } catch (e) {
                this.alertModal('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }

    resetConfig() {
        this.confirmModal('This will remove all categories and websites. Continue?').then(confirmed => {
            if (!confirmed) return;
            try {
                // Clear local storage data
                localStorage.removeItem('dashboardData');
                localStorage.removeItem('collapsedCategories');

                // Reset in-memory data
                this.data.categories = [];
                this.data.websites = [];
                this.data.collapsed = {};
                this.data.saveData();
                this.data.saveCollapsed();

                // Rerender UI
                this.updateCategorySelect();
                this.renderCategoriesList();
                this.renderWebsitesList();
                this.renderHomeView();

                this.alertModal('All categories and websites have been removed.');
            } catch (e) {
                this.alertModal('Failed to reset configuration.');
            }
        });
    }
}

const app = new App();
app.renderHomeView();