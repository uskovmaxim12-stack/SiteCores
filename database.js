class SiteCoreDatabase {
    constructor() {
        this.DB_CONFIG = {
            GIST_ID: localStorage.getItem('sitecore_gist_id') || 'YOUR_GIST_ID_HERE',
            GITHUB_TOKEN: localStorage.getItem('sitecore_github_token') || 'YOUR_GITHUB_TOKEN_HERE',
            SYNC_ENABLED: true
        };
        
        this.data = null;
        this.syncQueue = [];
        this.isSyncing = false;
        this.lastSync = null;
    }

    async init() {
        try {
            await this.loadFromStorage();
            
            // Запускаем периодическую синхронизацию
            setInterval(() => this.syncWithRemote(), 30000);
            
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async loadFromStorage() {
        try {
            // Пробуем загрузить из Gist
            if (this.DB_CONFIG.SYNC_ENABLED && 
                this.DB_CONFIG.GIST_ID && 
                this.DB_CONFIG.GITHUB_TOKEN) {
                
                const remoteData = await this.loadFromGist();
                if (remoteData) {
                    this.data = remoteData;
                    this.saveToLocalStorage();
                    this.lastSync = new Date();
                    return;
                }
            }
            
            // Если не удалось, загружаем из localStorage
            const localData = localStorage.getItem('sitecore_database');
            if (localData) {
                this.data = JSON.parse(localData);
                console.log('Loaded from localStorage');
            } else {
                // Создаем начальную структуру
                this.data = this.getInitialDataStructure();
                this.saveToLocalStorage();
                console.log('Created initial database structure');
            }
            
        } catch (error) {
            console.error('Error loading from storage:', error);
            throw error;
        }
    }

    async loadFromGist() {
        try {
            const response = await fetch(`https://api.github.com/gists/${this.DB_CONFIG.GIST_ID}`, {
                headers: {
                    'Authorization': `token ${this.DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`Gist API error: ${response.status}`);
            }

            const gist = await response.json();
            const content = JSON.parse(gist.files['sitecore_db.json'].content);
            
            console.log('Loaded from GitHub Gist');
            return content;
        } catch (error) {
            console.warn('Failed to load from Gist:', error.message);
            return null;
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('sitecore_database', JSON.stringify(this.data));
            localStorage.setItem('sitecore_last_save', new Date().toISOString());
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    async saveToGist() {
        if (!this.DB_CONFIG.SYNC_ENABLED || 
            !this.DB_CONFIG.GIST_ID || 
            !this.DB_CONFIG.GITHUB_TOKEN) {
            return false;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${this.DB_CONFIG.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'sitecore_db.json': {
                            content: JSON.stringify(this.data, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gist API error: ${response.status}`);
            }

            this.lastSync = new Date();
            console.log('Saved to GitHub Gist');
            return true;
        } catch (error) {
            console.error('Failed to save to Gist:', error.message);
            return false;
        }
    }

    async syncWithRemote() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        try {
            // Обрабатываем очередь синхронизации
            while (this.syncQueue.length > 0) {
                const operation = this.syncQueue.shift();
                await this.executeOperation(operation);
            }
            
            // Сохраняем текущее состояние
            await this.saveToGist();
            
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async executeOperation(operation) {
        switch (operation.type) {
            case 'addOrder':
                await this.addOrder(operation.data, operation.message);
                break;
           
