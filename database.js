class SiteCoreDatabase {
    constructor() {
    this.DB_CONFIG = {
        GIST_ID: '81306e89ee7198a8b6b0ff8fc00fe5f9',
        GITHUB_TOKEN: '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',
        SYNC_ENABLED: true
    };
    // ... остальной код
}
        
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
            case 'updateOrder':
                await this.updateOrder(operation.orderId, operation.updates);
                break;
            case 'updateOrderStatus':
                await this.updateOrderStatus(operation.orderId, operation.status);
                break;
            case 'addMessage':
                await this.addMessage(operation.message);
                break;
            case 'deleteOrder':
                await this.deleteOrder(operation.orderId);
                break;
        }
    }

    async save() {
        this.saveToLocalStorage();
        
        // Добавляем в очередь синхронизации
        this.syncQueue.push({
            type: 'save',
            timestamp: new Date().toISOString()
        });
        
        // Запускаем синхронизацию
        this.syncWithRemote();
    }

    getData() {
        return this.data;
    }

    getInitialDataStructure() {
        return {
            users: {
                clients: [],
                developers: [
                    {
                        id: 'dev_1',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        email: 'maxim@sitecore.ru'
                    },
                    {
                        id: 'dev_2',
                        name: 'Александр',
                        password: '789563',
                        avatar: 'А',
                        email: 'alexander@sitecore.ru'
                    }
                ]
            },
            orders: [],
            messages: []
        };
    }

    // CRUD операции для заказов
    async addOrder(order, systemMessage = null) {
        if (!this.data.orders) {
            this.data.orders = [];
        }
        
        this.data.orders.push(order);
        
        if (systemMessage) {
            await this.addMessage(systemMessage);
        }
        
        await this.save();
        return order.id;
    }

    async updateOrder(orderId, updates) {
        const orderIndex = this.data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            throw new Error('Order not found');
        }
        
        this.data.orders[orderIndex] = {
            ...this.data.orders[orderIndex],
            ...updates
        };
        
        await this.save();
    }

    async updateOrderStatus(orderId, status) {
        await this.updateOrder(orderId, {
            status: status,
            updatedAt: new Date().toISOString()
        });
    }

    async deleteOrder(orderId) {
        // Удаляем заказ
        this.data.orders = this.data.orders.filter(o => o.id !== orderId);
        
        // Удаляем связанные сообщения
        this.data.messages = this.data.messages.filter(m => m.orderId !== orderId);
        
        await this.save();
    }

    // CRUD операции для сообщений
    async addMessage(message) {
        if (!this.data.messages) {
            this.data.messages = [];
        }
        
        this.data.messages.push(message);
        await this.save();
        return message.id;
    }

    // Вспомогательные методы
    getOrdersByClient(clientId) {
        return this.data.orders.filter(order => order.clientId === clientId);
    }

    getOrdersByDeveloper(developerName) {
        return this.data.orders.filter(order => order.assignedTo === developerName);
    }

    getMessagesByOrder(orderId) {
        return this.data.messages
            .filter(message => message.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Конфигурация
    setConfig(config) {
        this.DB_CONFIG = { ...this.DB_CONFIG, ...config };
        
        if (config.GIST_ID) {
            localStorage.setItem('sitecore_gist_id', config.GIST_ID);
        }
        
        if (config.GITHUB_TOKEN) {
            localStorage.setItem('sitecore_github_token', config.GITHUB_TOKEN);
        }
    }

    getConfig() {
        return { ...this.DB_CONFIG };
    }

    // Резервное копирование
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonData) {
        try {
            const newData = JSON.parse(jsonData);
            this.data = newData;
            this.saveToLocalStorage();
            this.saveToGist();
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }

    // Статистика
    getStats() {
        const totalOrders = this.data.orders.length;
        const totalClients = this.data.users.clients.length;
        const totalMessages = this.data.messages.length;
        
        const ordersByStatus = this.data.orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});
        
        const ordersByType = this.data.orders.reduce((acc, order) => {
            acc[order.projectType] = (acc[order.projectType] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalOrders,
            totalClients,
            totalMessages,
            ordersByStatus,
            ordersByType,
            lastSync: this.lastSync
        };
    }
}

// Экспортируем глобально для использования в HTML файлах
window.SiteCoreDatabase = SiteCoreDatabase;
