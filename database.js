// SiteCore Database Module v2.0
// Автоматически настроен для Gist uskovmaxim12-stack

class SiteCoreDatabase {
    constructor() {
        this.DB_CONFIG = window.SiteCoreConfig ? {
            GIST_ID: window.SiteCoreConfig.GIST_ID,
            GITHUB_TOKEN: window.SiteCoreConfig.GITHUB_TOKEN,
            SYNC_ENABLED: true
        } : {
            GIST_ID: '81306e89ee7198a8b6b0ff8fc00fe5f9',
            GITHUB_TOKEN: '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',
            SYNC_ENABLED: true
        };
        
        this.data = null;
        this.isInitialized = false;
        this.syncStatus = 'idle'; // idle, syncing, error, offline
        this.lastSync = null;
        
        console.log('📦 SiteCore Database initialized');
        console.log(`🔗 Gist ID: ${this.DB_CONFIG.GIST_ID}`);
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Загружаем данные
            await this.loadData();
            this.isInitialized = true;
            
            // Запускаем периодическую синхронизацию
            setInterval(() => this.syncData(), 30000);
            
            console.log('✅ Database ready');
            
            // Событие инициализации
            this.triggerEvent('database:ready');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.syncStatus = 'error';
            throw error;
        }
    }

    async loadData() {
        console.log('📥 Loading data...');
        
        // Пробуем загрузить из Gist
        if (this.DB_CONFIG.SYNC_ENABLED) {
            try {
                const gistData = await this.loadFromGist();
                if (gistData) {
                    this.data = gistData;
                    this.saveToLocalStorage();
                    this.syncStatus = 'idle';
                    this.lastSync = new Date();
                    console.log('✅ Loaded from GitHub Gist');
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Failed to load from Gist:', error.message);
                this.syncStatus = 'error';
            }
        }
        
        // Загружаем из localStorage
        const localData = this.loadFromLocalStorage();
        if (localData) {
            this.data = localData;
            this.syncStatus = 'offline';
            console.log('✅ Loaded from localStorage');
            return;
        }
        
        // Создаем новую базу
        this.data = this.createInitialData();
        this.saveToLocalStorage();
        console.log('✅ Created new database');
    }

    async loadFromGist() {
        if (!this.DB_CONFIG.GIST_ID || !this.DB_CONFIG.GITHUB_TOKEN) {
            throw new Error('Gist not configured');
        }
        
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
        const content = gist.files['sitecore_db.json']?.content;
        
        if (!content) {
            throw new Error('No sitecore_db.json file in Gist');
        }
        
        return JSON.parse(content);
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('sitecore_database');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('sitecore_database', JSON.stringify(this.data));
            localStorage.setItem('sitecore_last_update', new Date().toISOString());
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    async syncData() {
        if (this.syncStatus === 'syncing' || !this.DB_CONFIG.SYNC_ENABLED) {
            return;
        }
        
        this.syncStatus = 'syncing';
        
        try {
            await this.saveToGist();
            this.syncStatus = 'idle';
            this.lastSync = new Date();
            
            // Событие успешной синхронизации
            this.triggerEvent('database:synced');
        } catch (error) {
            console.warn('⚠️ Sync failed:', error.message);
            this.syncStatus = 'error';
            
            // Событие ошибки синхронизации
            this.triggerEvent('database:sync_error', { error: error.message });
        }
    }

    async saveToGist() {
        if (!this.DB_CONFIG.GIST_ID || !this.DB_CONFIG.GITHUB_TOKEN) {
            throw new Error('Gist not configured');
        }
        
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
                },
                description: `SiteCore Database - Last update: ${new Date().toISOString()}`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gist API error: ${error.message || response.status}`);
        }
        
        console.log('✅ Synced to GitHub Gist');
        return true;
    }

    createInitialData() {
        return {
            users: {
                clients: [],
                developers: [
                    {
                        id: 'dev_1',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        email: 'maxim@sitecore.ru',
                        role: 'developer',
                        status: 'active'
                    },
                    {
                        id: 'dev_2',
                        name: 'Александр',
                        password: '789563',
                        avatar: 'А',
                        email: 'alexander@sitecore.ru',
                        role: 'developer',
                        status: 'active'
                    }
                ]
            },
            orders: [],
            messages: [],
            system: {
                created: new Date().toISOString(),
                version: '2.0.0',
                owner: 'uskovmaxim12-stack'
            }
        };
    }

    // CRUD операции
    async getData() {
        if (!this.isInitialized) {
            await this.init();
        }
        return this.data;
    }

    async save() {
        this.saveToLocalStorage();
        await this.syncData();
    }

    // Пользователи
    async addUser(user, type = 'client') {
        if (!this.data.users[type]) {
            this.data.users[type] = [];
        }
        
        this.data.users[type].push({
            ...user,
            id: user.id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        await this.save();
        return user;
    }

    async findUser(email, type = 'client') {
        const users = this.data.users[type] || [];
        return users.find(u => u.email === email);
    }

    async authenticateUser(email, password, type = 'client') {
        const user = await this.findUser(email, type);
        if (!user) return null;
        
        // Внимание: в продакшене пароли должны хэшироваться!
        if (user.password === password) {
            return user;
        }
        
        return null;
    }

    // Заказы
    async addOrder(order) {
        const newOrder = {
            ...order,
            id: order.id || `order_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: order.status || 'new',
            assignedTo: order.assignedTo || null
        };
        
        this.data.orders.push(newOrder);
        await this.save();
        return newOrder;
    }

    async updateOrder(orderId, updates) {
        const index = this.data.orders.findIndex(o => o.id === orderId);
        if (index === -1) {
            throw new Error('Order not found');
        }
        
        this.data.orders[index] = {
            ...this.data.orders[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await this.save();
        return this.data.orders[index];
    }

    async getOrders(filter = {}) {
        let orders = this.data.orders;
        
        if (filter.clientId) {
            orders = orders.filter(o => o.clientId === filter.clientId);
        }
        
        if (filter.status) {
            orders = orders.filter(o => o.status === filter.status);
        }
        
        if (filter.assignedTo) {
            orders = orders.filter(o => o.assignedTo === filter.assignedTo);
        }
        
        return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Сообщения
    async addMessage(message) {
        const newMessage = {
            ...message,
            id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        };
        
        this.data.messages.push(newMessage);
        await this.save();
        return newMessage;
    }

    async getMessages(orderId) {
        return this.data.messages
            .filter(m => m.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Вспомогательные методы
    getStats() {
        return {
            users: {
                total: this.data.users.clients.length + this.data.users.developers.length,
                clients: this.data.users.clients.length,
                developers: this.data.users.developers.length
            },
            orders: {
                total: this.data.orders.length,
                byStatus: this.data.orders.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {}),
                byType: this.data.orders.reduce((acc, order) => {
                    acc[order.projectType] = (acc[order.projectType] || 0) + 1;
                    return acc;
                }, {})
            },
            messages: this.data.messages.length,
            sync: {
                status: this.syncStatus,
                lastSync: this.lastSync
            }
        };
    }

    async exportData() {
        return {
            data: this.data,
            stats: this.getStats(),
            meta: {
                exported: new Date().toISOString(),
                version: '2.0.0',
                gistId: this.DB_CONFIG.GIST_ID
            }
        };
    }

    async importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            
            // Проверяем структуру
            if (!importedData.users || !importedData.orders) {
                throw new Error('Invalid data structure');
            }
            
            this.data = importedData;
            await this.save();
            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    // События
    triggerEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: {
                ...detail,
                timestamp: new Date().toISOString(),
                database: this
            }
        });
        window.dispatchEvent(event);
    }

    // Методы для UI
    getSyncStatus() {
        return {
            status: this.syncStatus,
            lastSync: this.lastSync,
            gistId: this.DB_CONFIG.GIST_ID,
            isOnline: this.syncStatus !== 'offline' && this.syncStatus !== 'error'
        };
    }

    async testConnection() {
        try {
            await this.loadFromGist();
            return { success: true, message: 'Connected to Gist' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// Экспортируем глобально
window.SiteCoreDatabase = SiteCoreDatabase;

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SiteCore Database starting...');
});
