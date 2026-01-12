// config.js - конфигурация SiteCore
window.SiteCoreConfig = {
    // Ваши данные GitHub Gist
    GIST_ID: '81306e89ee7198a8b6b0ff8fc00fe5f9',
    GITHUB_TOKEN: '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',
    
    // Настройки синхронизации
    SYNC_ENABLED: true,
    SYNC_INTERVAL: 30000, // 30 секунд
    
    // Настройки приложения
    APP_NAME: 'SiteCore',
    APP_VERSION: '2.0.0',
    APP_AUTHOR: 'uskovmaxim12-stack',
    
    // Цветовая схема
    COLORS: {
        primary: '#4361ee',
        secondary: '#3f37c9',
        accent: '#4cc9f0',
        success: '#06d6a0',
        error: '#ef476f',
        warning: '#ffd166',
        dark: '#1a1a2e'
    },
    
    // Методы инициализации
    init: function() {
        // Сохраняем настройки в localStorage
        localStorage.setItem('sitecore_gist_id', this.GIST_ID);
        localStorage.setItem('sitecore_github_token', this.GITHUB_TOKEN);
        
        console.log(`✅ ${this.APP_NAME} v${this.APP_VERSION} настроен`);
        console.log(`📊 Gist ID: ${this.GIST_ID}`);
        
        // Проверяем подключение
        this.testConnection();
    },
    
    testConnection: async function() {
        try {
            const response = await fetch(
                `https://api.github.com/gists/${this.GIST_ID}`,
                {
                    headers: {
                        'Authorization': `token ${this.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const gist = await response.json();
                const files = Object.keys(gist.files);
                console.log(`✅ Подключено к Gist: ${files.length} файлов`);
                return true;
            } else {
                console.warn('⚠️ Ошибка подключения к Gist');
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка сети:', error.message);
            return false;
        }
    },
    
    // Получение сырого URL для данных
    getDataUrl: function() {
        return `https://gist.githubusercontent.com/uskovmaxim12-stack/${this.GIST_ID}/raw/b82f1671de1bd118a577e178672f706b602a4d45/sitecore_db.json`;
    },
    
    // Прямой доступ к данным (без API)
    getDataDirect: async function() {
        try {
            const response = await fetch(this.getDataUrl());
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            return null;
        }
    },
    
    // Обновление данных
    updateData: async function(data) {
        try {
            const response = await fetch(
                `https://api.github.com/gists/${this.GIST_ID}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${this.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            'sitecore_db.json': {
                                content: JSON.stringify(data, null, 2)
                            }
                        }
                    })
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            return false;
        }
    }
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.SiteCoreConfig.init();
});
