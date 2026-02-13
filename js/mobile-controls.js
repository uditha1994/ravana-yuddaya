export class MobileControls {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        this.isEnabled = false;

        // Joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            angle: 0,
            distance: 0,
            maxDistance: 60
        };

        // Aim state
        this.aim = {
            active: false,
            x: window.innerWidth * 0.75,
            y: window.innerHeight / 2
        };

        // Fire state
        this.autoFire = false;
        this.isFiring = false;
        this.fireInterval = null; // For continuous firing

        // Touch identifiers
        this.joystickTouchId = null;
        this.aimTouchId = null;

        // DOM Elements
        this.elements = {};

        // Movement output (normalized -1 to 1)
        this.moveX = 0;
        this.moveY = 0;

        if (this.isMobile) {
            this.init();
        }
    }

    detectMobile() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia('(pointer: coarse)').matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        );
    }

    init() {
        this.createMobileUI();
        this.bindEvents();
        this.isEnabled = true;
        console.log('📱 Mobile controls initialized');
    }

    createMobileUI() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'mobile-controls';
        container.innerHTML = `
            <!-- Orientation Warning -->
            <div id="orientation-warning">
                <div class="rotate-icon">📱</div>
                <h2>දුරකථනය හරවන්න</h2>
                <p>Please rotate your device to landscape mode</p>
            </div>
            
            <!-- Left Side - Movement Joystick -->
            <div id="joystick-zone">
                <div id="joystick-base">
                    <div id="joystick-thumb"></div>
                </div>
            </div>
            
            <!-- Right Side - Aim Joystick (NEW) -->
            <div id="aim-joystick-zone">
                <div id="aim-joystick-base">
                    <div id="aim-joystick-thumb"></div>
                </div>
            </div>
            
            <!-- Mobile Crosshair -->
            <div id="mobile-crosshair">
                <div class="crosshair-ring"></div>
                <div class="crosshair-dot"></div>
            </div>
            
            <!-- Top Bar -->
            <div id="mobile-top-bar">
                <button class="top-btn" id="btn-pause-mobile">⏸️</button>
                <div id="mobile-ammo-display">🏹 <span id="mobile-ammo">30</span></div>
                <button class="top-btn" id="btn-fullscreen">⛶</button>
            </div>
            
            <!-- Action Buttons -->
            <div id="action-buttons">
                <button class="action-btn" id="btn-fire">🏹</button>
                <button class="action-btn small-btn" id="btn-reload-mobile">🔄</button>
                <button class="action-btn small-btn" id="btn-special-mobile">⚡</button>
            </div>
            
            <!-- Auto-fire Toggle -->
            <div id="auto-fire-toggle">
                <label for="auto-fire-checkbox">
                    <input type="checkbox" id="auto-fire-checkbox">
                    <span class="toggle-icon">🎯</span>
                    <span class="toggle-text">Auto</span>
                </label>
            </div>
        `;

        document.body.appendChild(container);

        // Cache elements
        this.elements = {
            container: container,
            joystickZone: document.getElementById('joystick-zone'),
            joystickBase: document.getElementById('joystick-base'),
            joystickThumb: document.getElementById('joystick-thumb'),
            aimJoystickZone: document.getElementById('aim-joystick-zone'),
            aimJoystickBase: document.getElementById('aim-joystick-base'),
            aimJoystickThumb: document.getElementById('aim-joystick-thumb'),
            crosshair: document.getElementById('mobile-crosshair'),
            btnFire: document.getElementById('btn-fire'),
            btnReload: document.getElementById('btn-reload-mobile'),
            btnSpecial: document.getElementById('btn-special-mobile'),
            btnPause: document.getElementById('btn-pause-mobile'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            autoFireCheckbox: document.getElementById('auto-fire-checkbox'),
            mobileAmmo: document.getElementById('mobile-ammo')
        };
    }

    bindEvents() {
        // Prevent default touch behaviors on game canvas
        document.addEventListener('touchmove', (e) => {
            if (this.isEnabled && this.game.gameState === 'playing') {
                e.preventDefault();
            }
        }, { passive: false });

        // ==========================================
        // MOVEMENT JOYSTICK (Left)
        // ==========================================
        this.elements.joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onJoystickStart(e);
        }, { passive: false });

        // ==========================================
        // AIM JOYSTICK (Right) - NEW DUAL STICK
        // ==========================================
        this.elements.aimJoystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onAimJoystickStart(e);
        }, { passive: false });

        // Global touch move and end
        document.addEventListener('touchmove', (e) => {
            this.onTouchMove(e);
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            this.onTouchEnd(e);
        });

        document.addEventListener('touchcancel', (e) => {
            this.onTouchEnd(e);
        });

        // ==========================================
        // FIRE BUTTON
        // ==========================================
        this.elements.btnFire.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onFireStart();
        }, { passive: false });

        this.elements.btnFire.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onFireEnd();
        }, { passive: false });

        this.elements.btnFire.addEventListener('touchcancel', (e) => {
            this.onFireEnd();
        });

        // ==========================================
        // OTHER BUTTONS
        // ==========================================
        this.elements.btnReload.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onReload();
        }, { passive: false });

        this.elements.btnSpecial.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onSpecialAttack();
        }, { passive: false });

        this.elements.btnPause.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onPause();
        }, { passive: false });

        this.elements.btnFullscreen.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleFullscreen();
        }, { passive: false });

        // Auto-fire toggle
        this.elements.autoFireCheckbox.addEventListener('change', (e) => {
            this.autoFire = e.target.checked;
            this.hapticFeedback('light');
            console.log('Auto-fire:', this.autoFire);
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => this.onOrientationChange());
        window.addEventListener('resize', () => this.onResize());
    }

    // ==========================================
    // MOVEMENT JOYSTICK HANDLERS
    // ==========================================
    onJoystickStart(e) {
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;

        const rect = this.elements.joystickBase.getBoundingClientRect();
        this.joystick.startX = rect.left + rect.width / 2;
        this.joystick.startY = rect.top + rect.height / 2;
        this.joystick.active = true;

        this.elements.joystickThumb.classList.add('active');
        this.hapticFeedback('light');

        this.updateJoystick(touch.clientX, touch.clientY);
    }

    updateJoystick(touchX, touchY) {
        let deltaX = touchX - this.joystick.startX;
        let deltaY = touchY - this.joystick.startY;

        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.joystick.maxDistance) {
            deltaX = (deltaX / distance) * this.joystick.maxDistance;
            deltaY = (deltaY / distance) * this.joystick.maxDistance;
            distance = this.joystick.maxDistance;
        }

        this.elements.joystickThumb.style.transform =
            `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        this.moveX = deltaX / this.joystick.maxDistance;
        this.moveY = deltaY / this.joystick.maxDistance;

        this.joystick.currentX = deltaX;
        this.joystick.currentY = deltaY;
        this.joystick.distance = distance / this.joystick.maxDistance;
        this.joystick.angle = Math.atan2(deltaY, deltaX);
    }

    resetJoystick() {
        this.elements.joystickThumb.style.transform = 'translate(-50%, -50%)';
        this.elements.joystickThumb.classList.remove('active');
        this.moveX = 0;
        this.moveY = 0;
        this.joystick.distance = 0;
        this.joystick.active = false;
    }

    // ==========================================
    // AIM JOYSTICK HANDLERS (NEW - Dual Stick)
    // ==========================================
    onAimJoystickStart(e) {
        const touch = e.changedTouches[0];
        this.aimTouchId = touch.identifier;

        const rect = this.elements.aimJoystickBase.getBoundingClientRect();
        this.aimJoystickStartX = rect.left + rect.width / 2;
        this.aimJoystickStartY = rect.top + rect.height / 2;
        this.aim.active = true;

        this.elements.aimJoystickThumb.classList.add('active');
        this.elements.crosshair.classList.add('active');

        this.updateAimJoystick(touch.clientX, touch.clientY);

        // Auto-fire when aiming
        if (this.autoFire) {
            this.onFireStart();
        }
    }

    updateAimJoystick(touchX, touchY) {
        let deltaX = touchX - this.aimJoystickStartX;
        let deltaY = touchY - this.aimJoystickStartY;

        const maxDist = 50;
        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > maxDist) {
            deltaX = (deltaX / distance) * maxDist;
            deltaY = (deltaY / distance) * maxDist;
        }

        // Update aim joystick thumb
        this.elements.aimJoystickThumb.style.transform =
            `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        // Calculate aim position based on player position and joystick direction
        if (this.game.player) {
            const aimDistance = 200; // How far from player to aim
            const angle = Math.atan2(deltaY, deltaX);

            this.aim.x = this.game.player.x + Math.cos(angle) * aimDistance;
            this.aim.y = this.game.player.y + Math.sin(angle) * aimDistance;

            // Update crosshair position on screen
            this.elements.crosshair.style.left = `${this.aim.x}px`;
            this.elements.crosshair.style.top = `${this.aim.y}px`;

            // IMPORTANT: Update game's mouse position for shooting
            this.game.mouse.x = this.aim.x;
            this.game.mouse.y = this.aim.y;
        }
    }

    resetAimJoystick() {
        this.elements.aimJoystickThumb.style.transform = 'translate(-50%, -50%)';
        this.elements.aimJoystickThumb.classList.remove('active');
        this.elements.crosshair.classList.remove('active');
        this.aim.active = false;

        if (this.autoFire) {
            this.onFireEnd();
        }
    }

    // ==========================================
    // GLOBAL TOUCH HANDLERS
    // ==========================================
    onTouchMove(e) {
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId && this.joystick.active) {
                this.updateJoystick(touch.clientX, touch.clientY);
            }
            if (touch.identifier === this.aimTouchId && this.aim.active) {
                this.updateAimJoystick(touch.clientX, touch.clientY);
            }
        }
    }

    onTouchEnd(e) {
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.resetJoystick();
            }
            if (touch.identifier === this.aimTouchId) {
                this.aimTouchId = null;
                this.resetAimJoystick();
            }
        }
    }

    // ==========================================
    // FIRE HANDLERS 
    // ==========================================
    onFireStart() {
        if (this.isFiring) return;

        this.isFiring = true;
        this.elements.btnFire.classList.add('pressed');
        this.hapticFeedback('medium');

        console.log('🔫 Fire started');

        // IMPORTANT: Set mouse.down for shooting
        this.game.mouse.down = true;

        // Continuous fire interval
        this.fireInterval = setInterval(() => {
            if (this.isFiring && this.game.gameState === 'playing') {
                this.game.mouse.down = true;

                // Make sure aim is set
                if (this.game.player && !this.aim.active) {
                    // Default aim: in front of player based on last direction
                    this.game.mouse.x = this.game.player.x + 100;
                    this.game.mouse.y = this.game.player.y;
                }
            }
        }, 50);
    }

    onFireEnd() {
        this.isFiring = false;
        this.elements.btnFire.classList.remove('pressed');
        this.game.mouse.down = false;

        if (this.fireInterval) {
            clearInterval(this.fireInterval);
            this.fireInterval = null;
        }

        console.log('🔫 Fire ended');
    }

    // ==========================================
    // OTHER ACTION HANDLERS
    // ==========================================
    onReload() {
        console.log('🔄 Reload');

        if (this.game.player) {
            this.game.player.reload();
        }

        this.elements.btnReload.classList.add('pressed');
        this.hapticFeedback('light');

        setTimeout(() => {
            this.elements.btnReload.classList.remove('pressed');
        }, 200);
    }

    onSpecialAttack() {
        console.log('⚡ Special Attack');

        if (this.game.player && this.game.player.specialCharge >= 100) {
            this.game.useSpecialAbility();
        }

        this.elements.btnSpecial.classList.add('pressed');
        this.hapticFeedback('heavy');

        setTimeout(() => {
            this.elements.btnSpecial.classList.remove('pressed');
        }, 200);
    }

    onPause() {
        console.log('⏸️ Pause');

        if (this.game.gameState === 'playing') {
            this.game.pauseGame();
        } else if (this.game.gameState === 'paused') {
            this.game.resumeGame();
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================
    hapticFeedback(intensity = 'light') {
        if (!navigator.vibrate) return;

        switch (intensity) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(25);
                break;
            case 'heavy':
                navigator.vibrate([30, 20, 30]);
                break;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    onOrientationChange() {
        setTimeout(() => {
            this.onResize();
        }, 100);
    }

    onResize() {
        if (this.game.player && !this.aim.active) {
            this.aim.x = this.game.player.x + 100;
            this.aim.y = this.game.player.y;
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    show() {
        if (this.elements.container) {
            this.elements.container.classList.add('active');
        }
        this.isEnabled = true;
    }

    hide() {
        if (this.elements.container) {
            this.elements.container.classList.remove('active');
        }
        this.isEnabled = false;
        this.resetJoystick();
        this.resetAimJoystick();
        this.onFireEnd();
    }

    getMovement() {
        return {
            x: this.moveX,
            y: this.moveY,
            distance: this.joystick.distance,
            angle: this.joystick.angle
        };
    }

    getAimPosition() {
        return {
            x: this.aim.x,
            y: this.aim.y,
            active: this.aim.active
        };
    }

    isFirePressed() {
        return this.isFiring;
    }

    updateSpecialReady(isReady) {
        if (isReady) {
            this.elements.btnSpecial.classList.add('ready');
        } else {
            this.elements.btnSpecial.classList.remove('ready');
        }
    }

    updateAmmoDisplay(current, max) {
        if (this.elements.mobileAmmo) {
            this.elements.mobileAmmo.textContent = `${current}/${max}`;
        }
    }

    destroy() {
        if (this.fireInterval) {
            clearInterval(this.fireInterval);
        }
        if (this.elements.container) {
            this.elements.container.remove();
        }
        this.isEnabled = false;
    }
}

export default MobileControls;