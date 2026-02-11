// ============================================
// UI Manager - අතුරු මුහුණත කළමනාකරු
// ============================================

export class UIManager {
    constructor(game) {
        this.game = game;
        this.notifications = [];
        this.init();
    }

    init() {
        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            z-index: 500;
            pointer-events: none;
        `;
        document.body.appendChild(this.notificationContainer);
    }

    showNotification(message, type = 'info', duration = 2000) {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'Noto Sans Sinhala', sans-serif;
            font-size: 1.1rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease;
            text-align: center;
        `;
        notification.textContent = message;

        this.notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    getNotificationColor(type) {
        const colors = {
            info: 'rgba(52, 152, 219, 0.9)',
            success: 'rgba(46, 204, 113, 0.9)',
            warning: 'rgba(241, 196, 15, 0.9)',
            danger: 'rgba(231, 76, 60, 0.9)',
            special: 'rgba(155, 89, 182, 0.9)'
        };
        return colors[type] || colors.info;
    }

    showWaveStart(waveNumber) {
        this.showNotification(`⚔️ රැල්ල ${waveNumber} ආරම්භ! | Wave ${waveNumber} Start!`, 'warning', 2500);
    }

    showLevelStart(levelName) {
        this.showNotification(`🏰 ${levelName}`, 'special', 3000);
    }

    showPowerup(type) {
        const messages = {
            health: '❤️ ජීවය වැඩි විය! | Health Restored!',
            speed: '⚡ වේගය වැඩි විය! | Speed Boost!',
            shield: '🛡️ ආරක්ෂාව සක්‍රීයයි! | Shield Active!',
            power: '💥 බලය වැඩි විය! | Power Boost!'
        };
        this.showNotification(messages[type], 'success', 2000);
    }

    showDamage(amount) {
        // Create floating damage number
        const damage = document.createElement('div');
        damage.className = 'floating-damage';
        damage.textContent = `-${amount}`;
        damage.style.cssText = `
            position: fixed;
            left: ${this.game.player?.x || window.innerWidth / 2}px;
            top: ${(this.game.player?.y || window.innerHeight / 2) - 50}px;
            color: #e74c3c;
            font-size: 1.5rem;
            font-weight: bold;
            pointer-events: none;
            animation: floatUp 1s ease forwards;
            z-index: 500;
        `;
        document.body.appendChild(damage);
        setTimeout(() => damage.remove(), 1000);
    }

    showScore(amount, x, y) {
        const score = document.createElement('div');
        score.className = 'floating-score';
        score.textContent = `+${amount}`;
        score.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: #FFD700;
            font-size: 1.2rem;
            font-weight: bold;
            pointer-events: none;
            animation: floatUp 1s ease forwards;
            z-index: 500;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        `;
        document.body.appendChild(score);
        setTimeout(() => score.remove(), 1000);
    }

    showCombo(comboCount) {
        if (comboCount >= 3) {
            const comboText = comboCount >= 10 ? '🔥 MEGA COMBO!' :
                comboCount >= 7 ? '💫 SUPER COMBO!' :
                    comboCount >= 5 ? '⭐ GREAT COMBO!' :
                        '✨ COMBO!';
            this.showNotification(`${comboText} x${comboCount}`, 'special', 1500);
        }
    }

    updateLevelStars(levelId, stars) {
        const levelCard = document.querySelector(`.level-card[data-level="${levelId}"]`);
        if (levelCard) {
            const starsElement = levelCard.querySelector('.level-stars');
            const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
            starsElement.textContent = starDisplay;
        }
    }

    showBossWarning() {
        // Full screen boss warning
        const warning = document.createElement('div');
        warning.className = 'boss-warning';
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.8);
            z-index: 600;
            animation: bossWarningPulse 0.5s ease infinite alternate;
        `;
        warning.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 20px;">👑</div>
            <h2 style="color: #e74c3c; font-size: 2.5rem; margin-bottom: 10px;">
                අවවාදයයි! | WARNING!
            </h2>
            <p style="color: #FFD700; font-size: 1.5rem;">
                රාවණ රජු පැමිණේ! | King Ravana Approaches!
            </p>
        `;
        document.body.appendChild(warning);

        setTimeout(() => {
            warning.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => warning.remove(), 500);
        }, 2500);
    }
}

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    
    @keyframes floatUp {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateY(-50px) scale(1.5);
        }
    }
    
    @keyframes bossWarningPulse {
        from {
            background: rgba(139, 0, 0, 0.7);
        }
        to {
            background: rgba(139, 0, 0, 0.9);
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);