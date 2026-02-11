// ============================================
// රාවණ යුද්ධය - Main Game Engine
// ============================================

// Import modules
import { Player } from './player.js';
import { Enemy, EnemyTypes } from './enemy.js';
import { Bullet } from './bullet.js';
import { LevelManager, LEVELS } from './levels.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

// ============================================
// Game Constants
// ============================================
const GAME_CONFIG = {
    FPS: 60,
    CANVAS_PADDING: 50,
    SPAWN_PADDING: 100,
    POWERUP_DURATION: 10000,
    SPECIAL_CHARGE_RATE: 0.5,
    MAX_PARTICLES: 100
};

// ============================================
// Main Game Class
// ============================================
class RavanaGame {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, levelComplete, gameOver
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.totalWaves = 5;

        // Statistics
        this.stats = {
            enemiesKilled: 0,
            shotsFired: 0,
            shotsHit: 0,
            startTime: 0
        };

        // Game objects
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.powerups = [];
        this.particles = [];

        // Managers
        this.levelManager = new LevelManager();
        this.uiManager = new UIManager(this);
        this.audioManager = new AudioManager();

        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };

        // Settings
        this.settings = {
            soundVolume: 0.7,
            musicVolume: 0.5,
            difficulty: 'medium',
            language: 'both'
        };

        // Initialize
        this.init();
    }

    // ============================================
    // Initialization
    // ============================================
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadSettings();

        // Start loading
        setTimeout(() => {
            this.gameState = 'menu';
            this.showScreen('main-menu');
        }, 2000);
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // UI button events
        this.setupUIEvents();
    }

    setupUIEvents() {
        // Main menu buttons
        document.getElementById('btn-play')?.addEventListener('click', () => this.startGame(1));
        document.getElementById('btn-levels')?.addEventListener('click', () => this.showScreen('level-select'));
        document.getElementById('btn-instructions')?.addEventListener('click', () => this.showScreen('instructions'));
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showScreen('settings'));

        // Back buttons
        document.getElementById('btn-back-menu')?.addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('btn-back-instructions')?.addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('btn-back-settings')?.addEventListener('click', () => this.showScreen('main-menu'));

        // Level selection
        document.querySelectorAll('.level-card').forEach(card => {
            card.addEventListener('click', () => {
                const level = parseInt(card.dataset.level);
                if (card.classList.contains('unlocked')) {
                    this.startGame(level);
                }
            });
        });

        // Pause menu
        document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartLevel());
        document.getElementById('btn-quit')?.addEventListener('click', () => this.quitToMenu());

        // Level complete
        document.getElementById('btn-next-level')?.addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-replay')?.addEventListener('click', () => this.restartLevel());

        // Game over
        document.getElementById('btn-try-again')?.addEventListener('click', () => this.restartLevel());
        document.getElementById('btn-gameover-menu')?.addEventListener('click', () => this.quitToMenu());

        // Settings
        document.getElementById('sound-volume')?.addEventListener('input', (e) => {
            this.settings.soundVolume = e.target.value / 100;
            document.getElementById('sound-value').textContent = e.target.value + '%';
        });

        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            this.settings.musicVolume = e.target.value / 100;
            document.getElementById('music-value').textContent = e.target.value + '%';
        });

        document.getElementById('difficulty')?.addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
        });
    }

    loadSettings() {
        const saved = localStorage.getItem('ravanaGameSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('ravanaGameSettings', JSON.stringify(this.settings));
    }

    // ============================================
    // Input Handling
    // ============================================
    handleKeyDown(e) {
        this.keys[e.code] = true;

        if (this.gameState === 'playing') {
            if (e.code === 'Escape') {
                this.pauseGame();
            }
            if (e.code === 'KeyR') {
                this.player?.reload();
            }
            if (e.code === 'Space') {
                this.useSpecialAbility();
                e.preventDefault();
            }
        }

        if (this.gameState === 'paused' && e.code === 'Escape') {
            this.resumeGame();
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    handleMouseDown(e) {
        if (e.button === 0) {
            this.mouse.down = true;
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) {
            this.mouse.down = false;
        }
    }

    // ============================================
    // Screen Management
    // ============================================
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId)?.classList.remove('hidden');
    }

    showOverlay(overlayId) {
        document.getElementById(overlayId)?.classList.remove('hidden');
    }

    hideOverlay(overlayId) {
        document.getElementById(overlayId)?.classList.add('hidden');
    }

    hideAllOverlays() {
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.add('hidden');
        });
    }

    // ============================================
    // Game Flow
    // ============================================
    startGame(level) {
        this.currentLevel = level;
        this.wave = 1;
        this.score = 0;
        this.lives = 3;

        // Reset stats
        this.stats = {
            enemiesKilled: 0,
            shotsFired: 0,
            shotsHit: 0,
            startTime: Date.now()
        };

        // Initialize game objects
        this.initializeLevel();

        // Show game screen
        this.showScreen('game-screen');
        this.hideAllOverlays();

        // Start game loop
        this.gameState = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();

        // Update HUD
        this.updateHUD();
    }

    initializeLevel() {
        const levelData = LEVELS[this.currentLevel - 1];

        // Create player
        this.player = new Player(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this
        );

        // Clear arrays
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.powerups = [];
        this.particles = [];

        // Get wave data and spawn enemies
        this.totalWaves = levelData.waves.length;
        this.spawnWave();

        // Update level display
        document.getElementById('current-level').textContent = `මට්ටම ${this.currentLevel}`;
        document.getElementById('level-name').textContent = levelData.nameSinhala;
    }

    spawnWave() {
        const levelData = LEVELS[this.currentLevel - 1];
        const waveData = levelData.waves[this.wave - 1];

        if (!waveData) {
            this.levelComplete();
            return;
        }

        document.getElementById('wave-text').textContent = `රැල්ල ${this.wave}/${this.totalWaves}`;

        // Spawn enemies based on wave data
        waveData.enemies.forEach(enemyConfig => {
            for (let i = 0; i < enemyConfig.count; i++) {
                setTimeout(() => {
                    if (this.gameState === 'playing') {
                        this.spawnEnemy(enemyConfig.type);
                    }
                }, i * enemyConfig.delay);
            }
        });
    }

    spawnEnemy(type) {
        const padding = GAME_CONFIG.SPAWN_PADDING;
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch (side) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = -padding;
                break;
            case 1: // Right
                x = this.canvas.width + padding;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + padding;
                break;
            case 3: // Left
                x = -padding;
                y = Math.random() * this.canvas.height;
                break;
        }

        const enemy = new Enemy(x, y, type, this);
        this.enemies.push(enemy);
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showOverlay('pause-menu');
    }

    resumeGame() {
        this.hideOverlay('pause-menu');
        this.gameState = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();
    }

    restartLevel() {
        this.hideAllOverlays();
        this.startGame(this.currentLevel);
    }

    nextLevel() {
        this.hideAllOverlays();
        if (this.currentLevel < LEVELS.length) {
            this.startGame(this.currentLevel + 1);
        } else {
            // Game complete!
            this.quitToMenu();
        }
    }

    quitToMenu() {
        this.gameState = 'menu';
        this.hideAllOverlays();
        this.showScreen('main-menu');
    }

    levelComplete() {
        this.gameState = 'levelComplete';

        // Calculate stats
        const timeTaken = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const accuracy = this.stats.shotsFired > 0
            ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
            : 0;

        // Update UI
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('enemies-killed').textContent = this.stats.enemiesKilled;
        document.getElementById('accuracy').textContent = accuracy + '%';
        document.getElementById('time-taken').textContent =
            `${Math.floor(timeTaken / 60)}:${(timeTaken % 60).toString().padStart(2, '0')}`;

        this.showOverlay('level-complete');
    }

    gameOver() {
        this.gameState = 'gameOver';

        document.getElementById('gameover-score').textContent = this.score;
        document.getElementById('gameover-level').textContent = this.currentLevel;

        this.showOverlay('game-over');
    }

    useSpecialAbility() {
        if (this.player && this.player.specialCharge >= 100) {
            this.player.useSpecial();

            // Create special attack effect
            this.createSpecialAttack();
        }
    }

    createSpecialAttack() {
        // Damage all enemies on screen
        this.enemies.forEach(enemy => {
            enemy.takeDamage(50);
            this.createExplosion(enemy.x, enemy.y, '#9b59b6');
        });

        // Screen flash effect
        this.screenFlash('#9b59b6');
    }

    // ============================================
    // Main Game Loop
    // ============================================
    gameLoop() {
        if (this.gameState !== 'playing') return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        // Update player
        if (this.player) {
            this.player.update(dt, this.keys, this.mouse);

            // Shooting
            if (this.mouse.down && this.player.canShoot()) {
                const bullet = this.player.shoot(this.mouse.x, this.mouse.y);
                if (bullet) {
                    this.bullets.push(bullet);
                    this.stats.shotsFired++;
                }
            }

            // Charge special ability
            this.player.chargeSpecial(GAME_CONFIG.SPECIAL_CHARGE_RATE * dt);
        }

        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(dt);
            return bullet.isActive && this.isInBounds(bullet);
        });

        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update(dt);
            return bullet.isActive && this.isInBounds(bullet);
        });

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(dt, this.player);
            return enemy.isAlive;
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update(dt);
            return powerup.isActive;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(dt);
            return particle.alpha > 0;
        });

        // Check collisions
        this.checkCollisions();

        // Check wave completion
        if (this.enemies.length === 0 && this.gameState === 'playing') {
            this.wave++;
            if (this.wave <= this.totalWaves) {
                setTimeout(() => this.spawnWave(), 2000);
            } else {
                this.levelComplete();
            }
        }

        // Update HUD
        this.updateHUD();
    }

    checkCollisions() {
        // Player bullets vs Enemies
        this.bullets.forEach(bullet => {
            this.enemies.forEach(enemy => {
                if (this.checkCollision(bullet, enemy)) {
                    bullet.isActive = false;
                    const killed = enemy.takeDamage(bullet.damage);
                    this.stats.shotsHit++;

                    if (killed) {
                        this.score += enemy.points;
                        this.stats.enemiesKilled++;
                        this.createExplosion(enemy.x, enemy.y, enemy.color);

                        // Chance to spawn powerup
                        if (Math.random() < 0.2) {
                            this.spawnPowerup(enemy.x, enemy.y);
                        }
                    }
                }
            });
        });

        // Enemy bullets vs Player
        this.enemyBullets.forEach(bullet => {
            if (this.player && this.checkCollision(bullet, this.player)) {
                bullet.isActive = false;
                this.player.takeDamage(bullet.damage);

                if (this.player.health <= 0) {
                    this.lives--;
                    if (this.lives > 0) {
                        this.player.respawn();
                    } else {
                        this.gameOver();
                    }
                }
            }
        });

        // Enemies vs Player (collision damage)
        this.enemies.forEach(enemy => {
            if (this.player && this.checkCollision(enemy, this.player)) {
                this.player.takeDamage(enemy.collisionDamage);
                enemy.knockback(this.player);
            }
        });

        // Powerups vs Player
        this.powerups.forEach(powerup => {
            if (this.player && this.checkCollision(powerup, this.player)) {
                this.collectPowerup(powerup);
                powerup.isActive = false;
            }
        });
    }

    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.radius || obj1.size / 2) + (obj2.radius || obj2.size / 2);
    }

    isInBounds(obj) {
        const padding = 50;
        return obj.x > -padding &&
            obj.x < this.canvas.width + padding &&
            obj.y > -padding &&
            obj.y < this.canvas.height + padding;
    }

    spawnPowerup(x, y) {
        const types = ['health', 'speed', 'shield', 'power'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerups.push({
            x, y,
            type,
            radius: 15,
            isActive: true,
            bobOffset: Math.random() * Math.PI * 2,
            update(dt) {
                this.bobOffset += dt * 3;
                this.displayY = this.y + Math.sin(this.bobOffset) * 5;
            }
        });
    }

    collectPowerup(powerup) {
        switch (powerup.type) {
            case 'health':
                this.player.heal(30);
                break;
            case 'speed':
                this.player.applySpeedBoost();
                break;
            case 'shield':
                this.player.applyShield();
                break;
            case 'power':
                this.player.applyDamageBoost();
                break;
        }

        this.createPickupEffect(powerup.x, powerup.y, powerup.type);
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 / 15) * i;
            const speed = 100 + Math.random() * 100;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 3,
                color,
                alpha: 1,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.alpha -= dt * 2;
                    this.vx *= 0.98;
                    this.vy *= 0.98;
                }
            });
        }
    }

    createPickupEffect(x, y, type) {
        const colors = {
            health: '#e74c3c',
            speed: '#3498db',
            shield: '#2ecc71',
            power: '#f39c12'
        };

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50 - 50,
                radius: 4,
                color: colors[type],
                alpha: 1,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 100 * dt;
                    this.alpha -= dt * 2;
                }
            });
        }
    }

    screenFlash(color) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            opacity: 0.3;
            pointer-events: none;
            z-index: 1000;
            animation: flashFade 0.3s ease-out forwards;
        `;

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    // ============================================
    // Rendering
    // ============================================
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.getLevelBackground();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid pattern
        this.drawGrid();

        // Draw powerups
        this.powerups.forEach(powerup => this.drawPowerup(powerup));

        // Draw particles (behind entities)
        this.particles.forEach(particle => this.drawParticle(particle));

        // Draw bullets
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.render(this.ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.render(this.ctx));

        // Draw player
        if (this.player) {
            this.player.render(this.ctx, this.mouse);
        }
    }

    getLevelBackground() {
        const colors = [
            '#1a1a2e', // Sigiriya - Dark blue
            '#1a2e1a', // Anuradhapura - Dark green
            '#2e1a1a', // Polonnaruwa - Dark red
            '#1a1a1a', // Kandy - Pure dark
            '#2e1a2e'  // Ravana Cave - Dark purple
        ];
        return colors[this.currentLevel - 1] || colors[0];
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawPowerup(powerup) {
        const icons = {
            health: '❤️',
            speed: '⚡',
            shield: '🛡️',
            power: '💥'
        };

        this.ctx.save();

        // Glow effect
        this.ctx.shadowColor = this.getPowerupColor(powerup.type);
        this.ctx.shadowBlur = 20;

        // Draw icon
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icons[powerup.type], powerup.x, powerup.displayY || powerup.y);

        this.ctx.restore();
    }

    getPowerupColor(type) {
        const colors = {
            health: '#e74c3c',
            speed: '#3498db',
            shield: '#2ecc71',
            power: '#f39c12'
        };
        return colors[type];
    }

    drawParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    // ============================================
    // HUD Update
    // ============================================
    updateHUD() {
        if (!this.player) return;

        // Health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('health-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent =
            `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        // Lives
        document.getElementById('lives-display').textContent = '🦁'.repeat(this.lives);

        // Score
        document.getElementById('score').textContent = this.score;

        // Ammo
        document.getElementById('ammo').textContent =
            `${this.player.ammo}/${this.player.maxAmmo}`;

        // Special ability
        document.getElementById('special-fill').style.width = this.player.specialCharge + '%';
    }
}

// ============================================
// Start Game
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    window.game = new RavanaGame();
});

// Add flash animation
const style = document.createElement('style');
style.textContent = `
    @keyframes flashFade {
        from { opacity: 0.3; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

export { RavanaGame };