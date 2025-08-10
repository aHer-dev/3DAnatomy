//6. ERROR MANAGER - core/errorManager.js
// ============================================
class ErrorManager {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    handleError(message, error, context = {}) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            message,
            error: error?.message || error,
            stack: error?.stack,
            context,
            level: 'error'
        };

        this.errors.push(errorInfo);
        this.trimErrors();

        console.error(`❌ ${message}:`, error);

        // Optional: User-Benachrichtigung
        this.showUserNotification(message, 'error');
    }

    handleCritical(message, error, context = {}) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            message,
            error: error?.message || error,
            stack: error?.stack,
            context,
            level: 'critical'
        };

        this.errors.push(errorInfo);
        this.trimErrors();

        console.error(`🔥 KRITISCH - ${message}:`, error);

        // User-Benachrichtigung für kritische Fehler
        this.showUserNotification(`Kritischer Fehler: ${message}`, 'critical');
    }

    showUserNotification(message, type = 'info') {
        // Einfache Toast-Notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'critical' ? '#dc3545' : type === 'error' ? '#fd7e14' : '#28a745'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, type === 'critical' ? 8000 : 4000);
    }

    trimErrors() {
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
    }

    getErrors(level = null) {
        if (level) {
            return this.errors.filter(e => e.level === level);
        }
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }

    dispose() {
        this.clearErrors();
    }
}

export { ErrorManager };