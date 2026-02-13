// ============================================
// රාවණ යුද්ධය - Main Game Engine
// ============================================

import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { LevelManager, LEVELS } from './levels.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { MobileControls } from './mobile-controls.js';

// ============================================
// Game Constants
// ============================================
const GAME_CONFIG = {
    MAX_ENEMIES: 25,
    MAX_BULLETS: 80,
    MAX_ENEMY_BULLETS: 50,
    MAX_PARTICLES: 60,
    MAX_POWERUPS: 10,
    SPAWN_PADDING: 100,
    SPECIAL_CHARGE_RATE: 0.5,
    WAVE_DELAY: 2000
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
        this.gameState = 'loading';
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

        // Game objects - Initialize as empty arrays
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

        // Animation frame control
        this.animFrameId = null;
        this.isRunning = false;
        this.lastTime = 0;

        // Wave management - IMPORTANT
        this.waveActive = false;
        this.waveStarted = false;
        this.waveSpawnTimeout = null;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesInWave = 0;
        this.wavePendingOnResume = false;
        this.enemySpawnTimeouts = [];
        this.remainingEnemiesToSpawn = 0;

        // Debug info
        this.debugMode = true;
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdate = 0;

        // Initialize mobile controls
        this.mobileControls = new MobileControls(this);
        this.isPlaying = false;

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

        // Apply saved language on load
        if (this.settings.language) {
            this.applyLanguage(this.settings.language);
        }

        // Start loading
        setTimeout(() => {
            this.gameState = 'menu';
            this.showScreen('main-menu');
        }, 2000);

        // Debug: Log initialization
        this.log('Game initialized');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[RavanaGame] ${message}`);
        }
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

        // Handle tab visibility - IMPORTANT for preventing stuck
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pauseGame();
            }
        });

        // UI button events
        this.setupUIEvents();
    }

    setupUIEvents() {
        // Main menu buttons
        document.getElementById('btn-play')?.addEventListener('click', () => this.startGame(1));
        document.getElementById('btn-levels')?.addEventListener('click', () => this.showScreen('level-select'));
        document.getElementById('btn-instructions')?.addEventListener('click', () => this.showScreen('instructions'));
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showScreen('settings'));

        const backToMenuButtons = [
            'btn-back-menu',
            'btn-back-instructions',
            'btn-back-settings',
            'btn-back'
        ];

        backToMenuButtons.forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                console.log(`Back button clicked: ${id}`);
                this.showScreen('main-menu');
            });
        });

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

        // Language setting
        document.getElementById('language')?.addEventListener('change', (e) => {
            this.settings.language = e.target.value;
            this.applyLanguage(e.target.value);
            this.saveSettings();
            console.log('Language changed to:', e.target.value);
        });

        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.audioManager.play('buttonHover', 0.3);
            });
            btn.addEventListener('click', () => {
                this.audioManager.play('buttonClick', 0.5);
            });
        });

        console.log('UI Events setup complete');
    }

    loadSettings() {
        const saved = localStorage.getItem('ravanaGameSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }

        // Apply language after loading
        setTimeout(() => {
            if (this.settings.language) {
                this.applyLanguage(this.settings.language);

                // Also update the select element to show correct value
                const langSelect = document.getElementById('language');
                if (langSelect) {
                    langSelect.value = this.settings.language;
                }
            }
        }, 100);
    }

    saveSettings() {
        localStorage.setItem('ravanaGameSettings', JSON.stringify(this.settings));
    }

    // ============================================
    // Input Handling
    // ============================================
    handleKeyDown(e) {
        this.keys[e.code] = true;

        // ESC key handling
        if (e.code === 'Escape') {
            e.preventDefault();

            console.log('ESC pressed, current state:', this.gameState);

            if (this.gameState === 'playing') {
                this.pauseGame();
            } else if (this.gameState === 'paused') {
                this.resumeGame();
            }
            return;
        }

        // Only handle game keys when playing
        if (this.gameState === 'playing') {
            if (e.code === 'KeyR' && this.player) {
                this.player.reload();
            }
            if (e.code === 'Space') {
                this.useSpecialAbility();
                e.preventDefault();
            }
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
        this.log(`Starting game - Level ${level}`);

        // Cancel any existing game loop
        this.stopGameLoop();

        // Clear any pending wave spawns
        this.clearWaveTimers();

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
        this.startGameLoop();

        // Update HUD
        this.updateHUD();

        this.audioManager.playMusic('battle');

        this.isPlaying = true;

        // Show mobile controls if on mobile
        if (this.mobileControls.isMobile) {
            this.mobileControls.show();
        }
    }

    // Mobile callback methods
    onMobileFire(isFiring) {
        this.player.isShooting = isFiring;
        if (isFiring) {
            this.player.shoot();
        }
    }

    onMobileReload() {
        this.player.reload();
    }

    onMobileSpecial() {
        if (this.player.specialReady) {
            this.player.useSpecialAttack();
        }
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    initializeLevel() {
        const levelData = LEVELS[this.currentLevel - 1];

        if (!levelData) {
            console.error('Level data not found!');
            this.quitToMenu();
            return;
        }

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

        // Reset wave state - CRITICAL
        this.totalWaves = levelData.waves.length;
        this.wave = 1;
        this.waveActive = false;
        this.waveStarted = false;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesInWave = 0;

        // Clear any existing timeout
        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }

        // Update level display
        const currentLevelEl = document.getElementById('current-level');
        const levelNameEl = document.getElementById('level-name');

        if (currentLevelEl) currentLevelEl.textContent = `මට්ටම ${this.currentLevel}`;
        if (levelNameEl) levelNameEl.textContent = levelData.nameSinhala;

        // Start first wave after a short delay
        this.waveSpawnTimeout = setTimeout(() => {
            if (this.gameState === 'playing') {
                this.spawnWave();
            }
        }, 1000);
    }

    clearAllGameObjects() {
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.powerups = [];
        this.particles = [];
        this.player = null;
    }

    clearWaveTimers() {
        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }
        if (this.waveSpawnTimer) {
            clearTimeout(this.waveSpawnTimer);
            this.waveSpawnTimer = null;
        }
        this.isSpawningWave = false;
        this.pendingEnemies = 0;
    }


    scheduleWaveSpawn() {
        this.clearWaveTimers();

        this.waveSpawnTimer = setTimeout(() => {
            if (this.gameState === 'playing') {
                this.spawnWave();
            }
        }, 1000);
    }

    spawnWave() {
        // Safety checks
        if (this.gameState !== 'playing') {
            console.log('Cannot spawn wave - not playing');
            return;
        }

        if (this.waveActive) {
            console.log('Wave already active');
            return;
        }

        const levelData = LEVELS[this.currentLevel - 1];
        if (!levelData) {
            console.error('Level data not found!');
            return;
        }

        const waveData = levelData.waves[this.wave - 1];

        if (!waveData) {
            console.log('No more waves - level complete');
            this.levelComplete();
            return;
        }

        console.log(`=== Starting Wave ${this.wave}/${this.totalWaves} ===`);

        // Mark wave as active
        this.waveActive = true;
        this.waveStarted = true;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;

        // Clear any existing spawn timeouts
        this.clearEnemySpawnTimeouts(); // ADD THIS

        // Calculate total enemies in this wave
        this.totalEnemiesInWave = 0;
        waveData.enemies.forEach(enemyConfig => {
            this.totalEnemiesInWave += enemyConfig.count;
        });

        console.log(`Spawning ${this.totalEnemiesInWave} enemies`);

        // Update wave display
        const waveTextEl = document.getElementById('wave-text');
        if (waveTextEl) {
            waveTextEl.textContent = `රැල්ල ${this.wave}/${this.totalWaves}`;
        }

        // Spawn enemies with delays
        let spawnDelay = 0;

        waveData.enemies.forEach(enemyConfig => {
            const delayBetweenEnemies = enemyConfig.delay || 500;

            for (let i = 0; i < enemyConfig.count; i++) {
                const currentDelay = spawnDelay;

                // FIXED: Store timeout ID
                const timeoutId = setTimeout(() => {
                    if (this.gameState === 'playing' && this.waveActive) {
                        this.spawnEnemy(enemyConfig.type);
                        this.enemiesSpawnedThisWave++;
                        console.log(`Spawned enemy ${this.enemiesSpawnedThisWave}/${this.totalEnemiesInWave}`);
                    }
                }, currentDelay);

                this.enemySpawnTimeouts.push(timeoutId); // ADD THIS

                spawnDelay += delayBetweenEnemies;
            }
        });

        this.audioManager.play('waveStart');
    }

    clearEnemySpawnTimeouts() {
        if (this.enemySpawnTimeouts && this.enemySpawnTimeouts.length > 0) {
            console.log('Clearing', this.enemySpawnTimeouts.length, 'spawn timeouts');
            this.enemySpawnTimeouts.forEach(id => clearTimeout(id));
            this.enemySpawnTimeouts = [];
        }
    }

    spawnEnemy(type) {
        if (this.enemies.length >= GAME_CONFIG.MAX_ENEMIES) {
            this.log('Max enemies reached, skipping spawn');
            return;
        }

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

        try {
            const enemy = new Enemy(x, y, type, this);
            this.enemies.push(enemy);
        } catch (error) {
            this.log(`Error spawning enemy: ${error.message}`);
        }
    }

    // ============================================
    // Game Loop Control
    // ============================================
    startGameLoop() {
        // Don't start if already running
        if (this.isRunning) {
            console.log('Game loop already running');
            return;
        }

        // Don't start if not in playing state
        if (this.gameState !== 'playing') {
            console.log('Cannot start loop - state:', this.gameState);
            return;
        }

        console.log('Starting game loop...');
        this.isRunning = true;
        this.lastTime = performance.now();

        // Start the loop
        this.gameLoop();
    }

    stopGameLoop() {
        console.log('Stopping game loop...');
        this.isRunning = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }


    pauseGame() {
        if (this.gameState !== 'playing') {
            console.log('Cannot pause - current state:', this.gameState);
            return;
        }

        console.log('Pausing game...');

        // Store remaining enemies to spawn
        this.remainingEnemiesToSpawn = this.totalEnemiesInWave - this.enemiesSpawnedThisWave;
        console.log('Remaining enemies to spawn:', this.remainingEnemiesToSpawn);

        // Clear ALL pending timeouts
        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }

        // Clear enemy spawn timeouts
        this.clearEnemySpawnTimeouts();

        // Stop loop
        this.isRunning = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        // Change state
        this.gameState = 'paused';

        // Show pause menu
        this.showOverlay('pause-menu');

        console.log('Game paused - wave:', this.wave, 'waveActive:', this.waveActive, 'enemies:', this.enemies.length);
    }

    resumeGame() {
        if (this.gameState !== 'paused') {
            console.log('Cannot resume - current state:', this.gameState);
            return;
        }

        console.log('Resuming game...');

        // Hide pause menu
        this.hideOverlay('pause-menu');

        // Reset input states
        this.keys = {};
        this.mouse.down = false;

        // Change state FIRST
        this.gameState = 'playing';

        // Reset timing
        this.lastTime = performance.now();

        // Start the loop
        this.isRunning = false;
        this.startGameLoop();

        // FIXED: Spawn remaining enemies if wave was in progress
        if (this.waveActive && this.remainingEnemiesToSpawn > 0) {
            console.log('Resuming enemy spawns:', this.remainingEnemiesToSpawn, 'remaining');
            this.spawnRemainingEnemies();
        }
        // If wave completed during pause, start next wave
        else if (!this.waveActive || (this.enemies.length === 0 && this.enemiesSpawnedThisWave >= this.totalEnemiesInWave)) {
            console.log('Checking for next wave...');
            setTimeout(() => {
                if (this.gameState === 'playing' && this.enemies.length === 0) {
                    this.waveActive = false;
                    this.checkWaveCompletion();
                }
            }, 100);
        }

        console.log('Game resumed');
    }

    spawnRemainingEnemies() {
        const levelData = LEVELS[this.currentLevel - 1];
        if (!levelData) return;

        const waveData = levelData.waves[this.wave - 1];
        if (!waveData) return;

        let spawnDelay = 0;
        let enemiesToSpawn = this.remainingEnemiesToSpawn;

        // Find enemy type from wave data
        const enemyType = waveData.enemies[0]?.type || 'yaka';
        const delayBetweenEnemies = waveData.enemies[0]?.delay || 500;

        console.log(`Spawning ${enemiesToSpawn} remaining enemies of type ${enemyType}`);

        for (let i = 0; i < enemiesToSpawn; i++) {
            const currentDelay = spawnDelay;

            const timeoutId = setTimeout(() => {
                if (this.gameState === 'playing' && this.waveActive) {
                    this.spawnEnemy(enemyType);
                    this.enemiesSpawnedThisWave++;
                    console.log(`Spawned remaining enemy ${this.enemiesSpawnedThisWave}/${this.totalEnemiesInWave}`);
                }
            }, currentDelay);

            this.enemySpawnTimeouts.push(timeoutId);
            spawnDelay += delayBetweenEnemies;
        }

        this.remainingEnemiesToSpawn = 0;
    }


    checkAndSpawnWave() {
        console.log('Checking wave status...');
        console.log('- enemies:', this.enemies.length);
        console.log('- waveActive:', this.waveActive);
        console.log('- waveStarted:', this.waveStarted);
        console.log('- enemiesSpawnedThisWave:', this.enemiesSpawnedThisWave);
        console.log('- totalEnemiesInWave:', this.totalEnemiesInWave);

        // If wave is supposed to be active but no enemies, something went wrong
        if (this.waveActive && this.enemies.length === 0 && this.enemiesSpawnedThisWave >= this.totalEnemiesInWave) {
            // Wave was completed during pause transition
            console.log('Wave completed, moving to next wave');
            this.waveActive = false;
            this.wave++;

            if (this.wave <= this.totalWaves) {
                this.scheduleNextWave();
            } else {
                this.levelComplete();
            }
            return;
        }

        // If no wave is active and no pending timeout, start wave
        if (!this.waveActive && this.enemies.length === 0) {
            console.log('No active wave, scheduling wave spawn');
            this.scheduleNextWave();
        }
    }

    scheduleNextWave() {
        // Clear any existing timeout
        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }

        console.log('Scheduling wave', this.wave);

        this.waveSpawnTimeout = setTimeout(() => {
            if (this.gameState === 'playing') {
                this.spawnWave();
            }
        }, 1000);
    }

    restartLevel() {
        console.log('Restarting level...');

        // Stop current game loop
        this.stopGameLoop();

        // Clear wave timers
        this.clearWaveTimers();

        // Hide all overlays
        this.hideAllOverlays();

        // Reset game state before starting
        this.gameState = 'menu'; // Temporarily set to menu

        // Start fresh
        this.startGame(this.currentLevel);
    }

    nextLevel() {
        this.log('Next level');
        this.hideAllOverlays();

        if (this.currentLevel < LEVELS.length) {
            this.startGame(this.currentLevel + 1);
        } else {
            this.quitToMenu();
        }
    }

    // quitToMenu() {
    //     console.log('Quitting to menu');

    //     // Stop game loop first
    //     this.gameState = 'menu';
    //     this.isRunning = false;

    //     if (this.animFrameId) {
    //         cancelAnimationFrame(this.animFrameId);
    //         this.animFrameId = null;
    //     }

    //     // Clear wave timeout
    //     if (this.waveSpawnTimeout) {
    //         clearTimeout(this.waveSpawnTimeout);
    //         this.waveSpawnTimeout = null;
    //     }

    //     // Reset wave state
    //     this.waveActive = false;
    //     this.waveStarted = false;
    //     this.enemiesSpawnedThisWave = 0;
    //     this.totalEnemiesInWave = 0;

    //     // Clear all objects
    //     this.enemies = [];
    //     this.bullets = [];
    //     this.enemyBullets = [];
    //     this.powerups = [];
    //     this.particles = [];
    //     this.player = null;

    //     this.hideAllOverlays();
    //     this.showScreen('main-menu');
    //     this.audioManager.playMusic('menu');
    // }
    quitToMenu() {
        console.log('Quitting to menu...');

        // Stop game loop first
        this.stopGameLoop();

        // Set state
        this.gameState = 'menu';
        this.isRunning = false;
        this.isPlaying = false;

        // Clear wave timeout
        this.clearWaveTimers();

        // Reset wave state
        this.waveActive = false;
        this.waveStarted = false;
        this.enemiesSpawnedThisWave = 0;
        this.totalEnemiesInWave = 0;

        // Clear all objects
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.powerups = [];
        this.particles = [];
        this.player = null;

        // Reset input
        this.keys = {};
        this.mouse.down = false;

        // Hide overlays and show menu
        this.hideAllOverlays();
        this.showScreen('main-menu');

        // Hide mobile controls
        if (this.mobileControls && this.mobileControls.isMobile) {
            this.mobileControls.hide();
        }

        // Play menu music
        if (this.audioManager) {
            this.audioManager.playMusic('menu');
        }

        console.log('Returned to menu successfully');
    }

    levelComplete() {
        if (this.gameState !== 'playing') return;

        console.log('Level Complete!');

        this.gameState = 'levelComplete';
        this.isRunning = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }

        // Calculate stats
        const timeTaken = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const accuracy = this.stats.shotsFired > 0
            ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
            : 0;

        // Update UI safely
        const finalScoreEl = document.getElementById('final-score');
        const enemiesKilledEl = document.getElementById('enemies-killed');
        const accuracyEl = document.getElementById('accuracy');
        const timeTakenEl = document.getElementById('time-taken');

        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (enemiesKilledEl) enemiesKilledEl.textContent = this.stats.enemiesKilled;
        if (accuracyEl) accuracyEl.textContent = accuracy + '%';
        if (timeTakenEl) {
            timeTakenEl.textContent = `${Math.floor(timeTaken / 60)}:${(timeTaken % 60).toString().padStart(2, '0')}`;
        }

        this.showOverlay('level-complete');
        this.audioManager.stopMusic();
        this.audioManager.play('levelComplete');
    }

    gameOver() {
        if (this.gameState === 'gameOver') return;

        console.log('Game Over!');

        this.gameState = 'gameOver';
        this.isRunning = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.waveSpawnTimeout) {
            clearTimeout(this.waveSpawnTimeout);
            this.waveSpawnTimeout = null;
        }

        const goScoreEl = document.getElementById('gameover-score');
        const goLevelEl = document.getElementById('gameover-level');

        if (goScoreEl) goScoreEl.textContent = this.score;
        if (goLevelEl) goLevelEl.textContent = this.currentLevel;

        this.showOverlay('game-over');
        this.audioManager.stopMusic();
        this.audioManager.play('gameOver');
    }

    useSpecialAbility() {
        if (this.player && this.player.specialCharge >= 100) {
            this.player.useSpecial();
            this.createSpecialAttack();
        }
    }

    createSpecialAttack() {
        // Damage all enemies on screen
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.takeDamage(50);
            this.createExplosion(enemy.x, enemy.y, '#9b59b6');
        }

        this.screenFlash('#9b59b6');
    }

    // ============================================
    // Main Game Loop
    // ============================================
    gameLoop() {
        // Safety check
        if (!this.isRunning || this.gameState !== 'playing') {
            console.log('Loop stopped - isRunning:', this.isRunning, 'state:', this.gameState);
            this.isRunning = false;
            return;
        }

        const currentTime = performance.now();
        const rawDelta = (currentTime - this.lastTime) / 1000;

        // Cap delta time (max 100ms)
        const deltaTime = Math.min(rawDelta, 0.1);
        this.lastTime = currentTime;

        // FPS calculation
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        // Update and render
        this.update(deltaTime);
        this.render();

        // Debug info
        if (this.debugMode) {
            this.renderDebugInfo();
        }

        // Schedule next frame
        this.animFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    // ============================================
    // Update Logic
    // ============================================
    update(dt) {
        // Validate delta time
        if (!dt || dt <= 0 || dt > 0.1 || isNaN(dt)) {
            dt = 0.016;
        }

        // Handle mobile input
        if (this.mobileControls.isMobile && this.mobileControls.isEnabled) {
            const movement = this.mobileControls.getMovement();
            const aim = this.mobileControls.getAimPosition();

            // Apply movement
            if (movement.distance > 0.1) {
                this.player.velocityX = movement.x * this.player.speed;
                this.player.velocityY = movement.y * this.player.speed;
            } else {
                this.player.velocityX = 0;
                this.player.velocityY = 0;
            }

            // Apply aim
            if (aim.active) {
                this.player.aimX = aim.x;
                this.player.aimY = aim.y;
            }

            // Handle continuous fire
            if (this.mobileControls.isFirePressed()) {
                this.player.shoot();
            }

            // Update special button state
            this.mobileControls.updateSpecialReady(this.player.specialReady);
        }

        // Update player
        if (this.player) {
            this.player.update(dt, this.keys, this.mouse);

            // Shooting
            if (this.mouse.down && this.player.canShoot()) {
                if (this.bullets.length < 80) {
                    const bullet = this.player.shoot(this.mouse.x, this.mouse.y);
                    if (bullet) {
                        this.bullets.push(bullet);
                        this.stats.shotsFired++;
                        this.audioManager.play('shoot');
                    }
                }
            }

            this.player.chargeSpecial(GAME_CONFIG.SPECIAL_CHARGE_RATE * dt);
        }

        // Update bullets (reverse loop for safe removal)
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet) {
                this.bullets.splice(i, 1);
                continue;
            }
            bullet.update(dt);
            if (!bullet.isActive || !this.isInBounds(bullet)) {
                this.bullets.splice(i, 1);
            }
        }

        // Update enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            if (!bullet) {
                this.enemyBullets.splice(i, 1);
                continue;
            }
            bullet.update(dt);
            if (!bullet.isActive || !this.isInBounds(bullet)) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy) {
                this.enemies.splice(i, 1);
                continue;
            }
            enemy.update(dt, this.player);
            if (!enemy.isAlive) {
                this.enemies.splice(i, 1);
                this.enemiesKilledThisWave++;
            }
        }

        // Update powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            if (!powerup) {
                this.powerups.splice(i, 1);
                continue;
            }
            powerup.update(dt);
            if (!powerup.isActive) {
                this.powerups.splice(i, 1);
            }
        }

        // Update particles (limit count)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }
            particle.update(dt);
            if (particle.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Enforce particle limit
        while (this.particles.length > 60) {
            this.particles.shift();
        }

        // Check collisions
        this.checkCollisions();

        // Check wave completion - IMPORTANT: This is the key fix
        this.checkWaveCompletion();

        // Update HUD
        this.updateHUD();
    }

    updatePlayer(dt) {
        if (!this.player) return;

        this.player.update(dt, this.keys, this.mouse);

        // Shooting
        if (this.mouse.down && this.player.canShoot()) {
            if (this.bullets.length < GAME_CONFIG.MAX_BULLETS) {
                const bullet = this.player.shoot(this.mouse.x, this.mouse.y);
                if (bullet) {
                    this.bullets.push(bullet);
                    this.stats.shotsFired++;
                    this.audioManager.play('shoot');
                }
            }
        }

        // Charge special ability
        this.player.chargeSpecial(GAME_CONFIG.SPECIAL_CHARGE_RATE * dt);
    }

    updateBullets(dt) {
        // Update player bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            if (!bullet) {
                this.bullets.splice(i, 1);
                continue;
            }

            bullet.update(dt);

            if (!bullet.isActive || !this.isInBounds(bullet)) {
                this.bullets.splice(i, 1);
            }
        }

        // Update enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];

            if (!bullet) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            bullet.update(dt);

            if (!bullet.isActive || !this.isInBounds(bullet)) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // Enforce bullet limits
        while (this.bullets.length > GAME_CONFIG.MAX_BULLETS) {
            this.bullets.shift();
        }
        while (this.enemyBullets.length > GAME_CONFIG.MAX_ENEMY_BULLETS) {
            this.enemyBullets.shift();
        }
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (!enemy) {
                this.enemies.splice(i, 1);
                continue;
            }

            enemy.update(dt, this.player);

            if (!enemy.isAlive) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updatePowerups(dt) {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];

            if (!powerup) {
                this.powerups.splice(i, 1);
                continue;
            }

            powerup.update(dt);

            if (!powerup.isActive) {
                this.powerups.splice(i, 1);
            }
        }

        // Limit powerups
        while (this.powerups.length > GAME_CONFIG.MAX_POWERUPS) {
            this.powerups.shift();
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }

            particle.update(dt);

            if (particle.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Limit particles
        while (this.particles.length > GAME_CONFIG.MAX_PARTICLES) {
            this.particles.shift();
        }
    }

    checkWaveCompletion() {
        // Don't check if not playing
        if (this.gameState !== 'playing') return;

        // Don't check if wave hasn't started
        if (!this.waveStarted) return;

        // Don't check if still spawning
        if (this.enemiesSpawnedThisWave < this.totalEnemiesInWave) return;

        // Check if all enemies are dead
        if (this.enemies.length === 0 && this.waveActive) {
            console.log(`=== Wave ${this.wave} complete! ===`);

            this.waveActive = false;
            this.wave++;

            if (this.wave <= this.totalWaves) {
                console.log(`Preparing wave ${this.wave}...`);

                // Reset wave state
                this.waveStarted = false;
                this.enemiesSpawnedThisWave = 0;
                this.enemiesKilledThisWave = 0;
                this.totalEnemiesInWave = 0;

                // Schedule next wave
                this.scheduleNextWave();
            } else {
                console.log('All waves complete!');
                this.levelComplete();
            }
        }
    }


    // ============================================
    // Collision Detection
    // ============================================
    checkCollisions() {
        this.checkBulletEnemyCollisions();
        this.checkEnemyBulletPlayerCollisions();
        this.checkEnemyPlayerCollisions();
        this.checkPowerupCollisions();
    }

    checkBulletEnemyCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet || !bullet.isActive) continue;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy || !enemy.isAlive) continue;

                if (this.checkCollision(bullet, enemy)) {
                    bullet.isActive = false;
                    this.stats.shotsHit++;

                    const killed = enemy.takeDamage(bullet.damage);

                    if (killed) {
                        this.score += enemy.points;
                        this.stats.enemiesKilled++;
                        this.createExplosion(enemy.x, enemy.y, enemy.color);
                        this.audioManager.play('explosion');

                        // Chance to spawn powerup
                        if (Math.random() < 0.2 && this.powerups.length < GAME_CONFIG.MAX_POWERUPS) {
                            this.spawnPowerup(enemy.x, enemy.y);
                        }
                    }
                    break;
                }
            }
        }
    }

    checkEnemyBulletPlayerCollisions() {
        if (!this.player || !this.player.alive) return;
        if (this.player.invincible) return;

        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            if (!bullet || !bullet.isActive) continue;

            if (this.checkCollision(bullet, this.player)) {
                bullet.isActive = false;
                this.player.takeDamage(bullet.damage);
                this.audioManager.play('playerHurt');
                this.handlePlayerDamage();
                break;
            }
        }
    }

    checkEnemyPlayerCollisions() {
        if (!this.player || !this.player.alive) return;
        if (this.player.invincible) return;

        for (const enemy of this.enemies) {
            if (!enemy || !enemy.isAlive) continue;

            if (this.checkCollision(enemy, this.player)) {
                this.player.takeDamage(enemy.collisionDamage || 10);
                enemy.knockback(this.player);
                this.handlePlayerDamage();
                break;
            }
        }
    }

    checkPowerupCollisions() {
        if (!this.player || !this.player.alive) return;

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            if (!powerup || !powerup.isActive) continue;

            if (this.checkCollision(powerup, this.player)) {
                this.collectPowerup(powerup);
                this.audioManager.play('powerup');
                powerup.isActive = false;
            }
        }
    }

    handlePlayerDamage() {
        if (!this.player) return;

        if (this.player.health <= 0) {
            this.lives--;

            if (this.lives > 0) {
                this.player.respawn();
            } else {
                this.gameOver();
            }
        }
    }

    checkCollision(obj1, obj2) {
        if (!obj1 || !obj2) return false;

        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const r1 = obj1.radius || (obj1.size ? obj1.size / 2 : 10);
        const r2 = obj2.radius || (obj2.size ? obj2.size / 2 : 10);

        return distance < r1 + r2;
    }

    isInBounds(obj, padding = 100) {
        if (!obj) return false;

        return obj.x > -padding &&
            obj.x < this.canvas.width + padding &&
            obj.y > -padding &&
            obj.y < this.canvas.height + padding;
    }

    // ============================================
    // Powerups
    // ============================================
    spawnPowerup(x, y) {
        if (this.powerups.length >= GAME_CONFIG.MAX_POWERUPS) return;

        const types = ['health', 'speed', 'shield', 'power'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerups.push({
            x,
            y,
            type,
            radius: 15,
            isActive: true,
            bobOffset: Math.random() * Math.PI * 2,
            displayY: y,
            update(dt) {
                this.bobOffset += dt * 3;
                this.displayY = this.y + Math.sin(this.bobOffset) * 5;
            }
        });
    }

    collectPowerup(powerup) {
        if (!this.player) return;

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

    // ============================================
    // Particle Effects
    // ============================================
    createExplosion(x, y, color) {
        const availableSlots = GAME_CONFIG.MAX_PARTICLES - this.particles.length;
        const particleCount = Math.min(10, availableSlots);

        if (particleCount <= 0) return;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = 60 + Math.random() * 60;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color,
                alpha: 1,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.alpha -= dt * 3;
                    this.vx *= 0.95;
                    this.vy *= 0.95;
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

        const availableSlots = GAME_CONFIG.MAX_PARTICLES - this.particles.length;
        const particleCount = Math.min(6, availableSlots);

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * 40,
                vy: Math.sin(angle) * 40 - 30,
                radius: 3,
                color: colors[type] || '#ffffff',
                alpha: 1,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 80 * dt;
                    this.alpha -= dt * 2.5;
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

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 300);
    }

    // ============================================
    // Rendering
    // ============================================
    render() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = this.getLevelBackground();
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid pattern
        this.drawGrid();

        // Draw powerups
        for (const powerup of this.powerups) {
            if (powerup) this.drawPowerup(powerup);
        }

        // Draw particles
        for (const particle of this.particles) {
            if (particle) this.drawParticle(particle);
        }

        // Draw bullets
        for (const bullet of this.bullets) {
            if (bullet) bullet.render(ctx);
        }
        for (const bullet of this.enemyBullets) {
            if (bullet) bullet.render(ctx);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            if (enemy) enemy.render(ctx);
        }

        // Draw player
        if (this.player) {
            this.player.render(ctx, this.mouse);
        }
    }

    renderDebugInfo() {
        // const ctx = this.ctx;

        // ctx.save();
        // ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        // ctx.fillRect(10, this.canvas.height - 120, 200, 110);

        // ctx.fillStyle = '#00ff00';
        // ctx.font = '12px monospace';

        // const debugLines = [
        //     `FPS: ${this.fps}`,
        //     `State: ${this.gameState}`,
        //     `Enemies: ${this.enemies.length}/${GAME_CONFIG.MAX_ENEMIES}`,
        //     `Bullets: ${this.bullets.length}/${GAME_CONFIG.MAX_BULLETS}`,
        //     `E.Bullets: ${this.enemyBullets.length}/${GAME_CONFIG.MAX_ENEMY_BULLETS}`,
        //     `Particles: ${this.particles.length}/${GAME_CONFIG.MAX_PARTICLES}`,
        //     `Wave: ${this.wave}/${this.totalWaves}`,
        //     `Pending: ${this.pendingEnemies}`
        // ];

        // debugLines.forEach((line, index) => {
        //     //ctx.fillText(line, 20, this.canvas.height - 100 + index * 13);
        // });

        // ctx.restore();
    }

    getLevelBackground() {
        const colors = [
            '#1a1a2e',
            '#1a2e1a',
            '#2e1a1a',
            '#1a1a1a',
            '#2e1a2e'
        ];
        return colors[this.currentLevel - 1] || colors[0];
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;

        const gridSize = 50;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
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

        this.ctx.shadowColor = this.getPowerupColor(powerup.type);
        this.ctx.shadowBlur = 15;

        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icons[powerup.type] || '?', powerup.x, powerup.displayY || powerup.y);

        this.ctx.restore();
    }

    getPowerupColor(type) {
        const colors = {
            health: '#e74c3c',
            speed: '#3498db',
            shield: '#2ecc71',
            power: '#f39c12'
        };
        return colors[type] || '#ffffff';
    }

    drawParticle(particle) {
        if (particle.alpha <= 0) return;

        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, particle.alpha);
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
        const healthPercent = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');

        if (healthFill) healthFill.style.width = healthPercent + '%';
        if (healthText) healthText.textContent = `${Math.ceil(Math.max(0, this.player.health))}/${this.player.maxHealth}`;

        // Lives
        const livesDisplay = document.getElementById('lives-display');
        if (livesDisplay) livesDisplay.textContent = '🦁'.repeat(Math.max(0, this.lives));

        // Score
        const scoreDisplay = document.getElementById('score');
        if (scoreDisplay) scoreDisplay.textContent = this.score;

        // Ammo
        const ammoDisplay = document.getElementById('ammo');
        if (ammoDisplay) ammoDisplay.textContent = `${this.player.ammo}/${this.player.maxAmmo}`;

        // Special ability
        const specialFill = document.getElementById('special-fill');
        if (specialFill) specialFill.style.width = Math.min(100, this.player.specialCharge) + '%';

        // Level info - Language aware
        const currentLevelEl = document.getElementById('current-level');
        const waveTextEl = document.getElementById('wave-text');

        if (currentLevelEl) {
            const lang = this.settings.language || 'both';
            if (lang === 'english') {
                currentLevelEl.textContent = `Level ${this.currentLevel}`;
            } else {
                currentLevelEl.textContent = `මට්ටම ${this.currentLevel}`;
            }
        }

        if (waveTextEl) {
            const lang = this.settings.language || 'both';
            if (lang === 'english') {
                waveTextEl.textContent = `Wave ${this.wave}/${this.totalWaves}`;
            } else {
                waveTextEl.textContent = `රැල්ල ${this.wave}/${this.totalWaves}`;
            }
        }
    }

    applyLanguage(lang) {
        console.log('Applying language:', lang);

        // Text content mappings
        const translations = {
            // Main Menu
            'btn-play': {
                sinhala: 'ක්‍රීඩාව ආරම්භ කරන්න',
                english: 'Start Game',
                both: 'ක්‍රීඩාව ආරම්භ කරන්න | Start Game'
            },
            'btn-levels': {
                sinhala: 'මට්ටම් තෝරන්න',
                english: 'Select Level',
                both: 'මට්ටම් තෝරන්න | Select Level'
            },
            'btn-instructions': {
                sinhala: 'උපදෙස්',
                english: 'Instructions',
                both: 'උපදෙස් | Instructions'
            },
            'btn-settings': {
                sinhala: 'සැකසුම්',
                english: 'Settings',
                both: 'සැකසුම් | Settings'
            },

            // Back buttons
            'btn-back-menu': {
                sinhala: 'ආපසු',
                english: 'Back',
                both: 'ආපසු | Back'
            },
            'btn-back-instructions': {
                sinhala: 'ආපසු',
                english: 'Back',
                both: 'ආපසු | Back'
            },
            'btn-back-settings': {
                sinhala: 'ආපසු',
                english: 'Back',
                both: 'ආපසු | Back'
            },

            // Pause menu
            'btn-resume': {
                sinhala: 'දිගටම කරගෙන යන්න',
                english: 'Resume',
                both: 'දිගටම | Resume'
            },
            'btn-restart': {
                sinhala: 'නැවත ආරම්භ කරන්න',
                english: 'Restart',
                both: 'නැවත | Restart'
            },
            'btn-quit': {
                sinhala: 'ප්‍රධාන මෙනුව',
                english: 'Main Menu',
                both: 'මෙනුව | Menu'
            },

            // Level complete
            'btn-next-level': {
                sinhala: 'ඊළඟ මට්ටම',
                english: 'Next Level',
                both: 'ඊළඟ මට්ටම | Next Level'
            },
            'btn-replay': {
                sinhala: 'නැවත ක්‍රීඩා කරන්න',
                english: 'Replay',
                both: 'නැවත | Replay'
            },

            // Game over
            'btn-try-again': {
                sinhala: 'නැවත උත්සාහ කරන්න',
                english: 'Try Again',
                both: 'නැවත | Try Again'
            },
            'btn-gameover-menu': {
                sinhala: 'ප්‍රධාන මෙනුව',
                english: 'Main Menu',
                both: 'මෙනුව | Menu'
            }
        };

        // Apply translations to buttons
        Object.keys(translations).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const text = translations[id][lang] || translations[id]['both'];

                // Check if button has icon structure
                const btnText = element.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = text;
                } else {
                    // Simple button - preserve emoji if exists
                    const currentText = element.textContent;
                    const emojiMatch = currentText.match(/^[\u{1F300}-\u{1F9FF}]|^[⚔️📜⚙️🔙▶️🔄🚪➡️🏠💀]/u);
                    const emoji = emojiMatch ? emojiMatch[0] + ' ' : '';
                    element.textContent = emoji + text;
                }
            }
        });

        // Apply to headings and labels
        this.applyHeadingTranslations(lang);
        this.applyLabelTranslations(lang);
    }

    applyHeadingTranslations(lang) {
        const headings = {
            // Game title
            '.game-logo h1': {
                sinhala: 'රාවණ යුද්ධය',
                english: 'Ravana Battle',
                both: 'රාවණ යුද්ධය'
            },
            '.game-logo .subtitle': {
                sinhala: '',
                english: 'Ravana Battle',
                both: 'Ravana Battle'
            },

            // Screen titles
            '#instructions h2, .instructions-container h2': {
                sinhala: '📜 උපදෙස්',
                english: '📜 Instructions',
                both: '📜 උපදෙස් | Instructions'
            },
            '.instructions-subtitle': {
                sinhala: 'ක්‍රීඩා කරන ආකාරය',
                english: 'How to Play',
                both: 'How to Play'
            },

            '#level-select h2, .level-container h2': {
                sinhala: '🗺️ මට්ටම් තෝරන්න',
                english: '🗺️ Select Level',
                both: '🗺️ මට්ටම් තෝරන්න'
            },
            '.level-subtitle': {
                sinhala: 'ඔබේ සටන තෝරන්න',
                english: 'Select Your Battle',
                both: 'Select Your Battle'
            },

            '#settings h2, .settings-container h2': {
                sinhala: '⚙️ සැකසුම්',
                english: '⚙️ Settings',
                both: '⚙️ සැකසුම් | Settings'
            },
            '.settings-subtitle': {
                sinhala: 'ක්‍රීඩා සැකසුම්',
                english: 'Game Settings',
                both: 'Settings'
            },

            // Pause menu
            '.pause-container h2': {
                sinhala: '⏸️ විරාමය',
                english: '⏸️ Paused',
                both: '⏸️ විරාමය | Paused'
            },
            '.pause-container p': {
                sinhala: 'ක්‍රීඩාව නතර කර ඇත',
                english: 'Game Paused',
                both: 'Game Paused'
            },

            // Level complete
            '.complete-container h2': {
                sinhala: '🎉 මට්ටම සම්පූර්ණයි!',
                english: '🎉 Level Complete!',
                both: '🎉 මට්ටම සම්පූර්ණයි!'
            },
            '.complete-container p': {
                sinhala: 'සුභ පැතුම්!',
                english: 'Congratulations!',
                both: 'Level Complete!'
            },

            // Game over
            '.gameover-container h2': {
                sinhala: '💀 ක්‍රීඩාව අවසානයි',
                english: '💀 Game Over',
                both: '💀 ක්‍රීඩාව අවසානයි'
            },
            '.gameover-container p': {
                sinhala: 'නැවත උත්සාහ කරන්න',
                english: 'Try Again',
                both: 'Game Over'
            }
        };

        Object.keys(headings).forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.textContent = headings[selector][lang] || headings[selector]['both'];
                }
            });
        });
    }

    applyLabelTranslations(lang) {
        const labels = {
            // HUD elements
            '#current-level': {
                sinhala: `මට්ටම ${this.currentLevel}`,
                english: `Level ${this.currentLevel}`,
                both: `මට්ටම ${this.currentLevel}`
            },
            '#wave-text': {
                sinhala: `රැල්ල ${this.wave}/${this.totalWaves}`,
                english: `Wave ${this.wave}/${this.totalWaves}`,
                both: `රැල්ල ${this.wave}/${this.totalWaves}`
            },
            '.score-label': {
                sinhala: 'ලකුණු',
                english: 'Score',
                both: 'ලකුණු'
            },

            // Stats labels
            '.stat-label': {
                sinhala: ['ලකුණු', 'සතුරන්', 'නිරවද්‍යතාව', 'කාලය'],
                english: ['Score', 'Enemies', 'Accuracy', 'Time'],
                both: ['ලකුණු', 'සතුරන්', 'නිරවද්‍යතාව', 'කාලය']
            },

            // Settings labels
            '#sound-volume': {
                parent: true,
                sinhala: '🔊 ශබ්ද පරිමාව',
                english: '🔊 Sound Volume',
                both: '🔊 ශබ්ද පරිමාව | Sound'
            },
            '#music-volume': {
                parent: true,
                sinhala: '🎵 සංගීතය',
                english: '🎵 Music Volume',
                both: '🎵 සංගීතය | Music'
            },
            '#difficulty': {
                parent: true,
                sinhala: '🎮 දුෂ්කරතාව',
                english: '🎮 Difficulty',
                both: '🎮 දුෂ්කරතාව | Difficulty'
            },
            '#language': {
                parent: true,
                sinhala: '🌐 භාෂාව',
                english: '🌐 Language',
                both: '🌐 භාෂාව | Language'
            }
        };

        Object.keys(labels).forEach(selector => {
            const config = labels[selector];

            if (selector === '.stat-label') {
                // Handle multiple stat labels
                const elements = document.querySelectorAll(selector);
                const texts = config[lang] || config['both'];
                elements.forEach((el, index) => {
                    if (texts[index]) {
                        el.textContent = texts[index];
                    }
                });
            } else if (config.parent) {
                // Handle parent label (for settings)
                const input = document.querySelector(selector);
                if (input) {
                    const label = input.closest('.setting-item')?.querySelector('label');
                    if (label) {
                        label.textContent = config[lang] || config['both'];
                    }
                }
            } else {
                const element = document.querySelector(selector);
                if (element) {
                    element.textContent = config[lang] || config['both'];
                }
            }
        });

        // Update difficulty options
        this.updateDifficultyOptions(lang);

        // Update instruction cards
        this.updateInstructionCards(lang);
    }

    updateDifficultyOptions(lang) {
        const difficultySelect = document.getElementById('difficulty');
        if (!difficultySelect) return;

        const options = {
            easy: { sinhala: 'පහසු', english: 'Easy', both: 'පහසු (Easy)' },
            medium: { sinhala: 'මධ්‍යම', english: 'Medium', both: 'මධ්‍යම (Medium)' },
            hard: { sinhala: 'අමාරු', english: 'Hard', both: 'අමාරු (Hard)' }
        };

        Array.from(difficultySelect.options).forEach(option => {
            const key = option.value;
            if (options[key]) {
                option.textContent = options[key][lang] || options[key]['both'];
            }
        });
    }

    updateInstructionCards(lang) {
        const cards = document.querySelectorAll('.instruction-card');

        const instructions = [
            {
                title: { sinhala: 'පාලනය', english: 'Controls', both: 'පාලනය | Controls' },
                icon: '⌨️'
            },
            {
                title: { sinhala: 'අරමුණ', english: 'Goal', both: 'අරමුණ | Goal' },
                icon: '🎯'
            },
            {
                title: { sinhala: 'බෝනස්', english: 'Power-ups', both: 'බෝනස් | Power-ups' },
                icon: '💎'
            }
        ];

        cards.forEach((card, index) => {
            if (instructions[index]) {
                const h3 = card.querySelector('h3');
                if (h3) {
                    h3.textContent = instructions[index].title[lang] || instructions[index].title['both'];
                }
            }
        });
    }

    returnToMenu() {
        this.isPlaying = false;

        if (this.mobileControls.isMobile) {
            this.mobileControls.hide();
        }
    }
}

// ============================================
// Start Game
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Initializing Ravana Battle...');
    window.game = new RavanaGame();
});

// Add flash animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes flashFade {
        from { opacity: 0.3; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

export { RavanaGame };