// ============================================
// MOBILE CONTROLS - Ravana Yuddaya
// ============================================

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
            maxDistance: 50
        };

        // Aim state
        this.aim = {
            active: false,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // Fire state
        this.autoFire = false;
        this.isFiring = false;

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
            
            <!-- Joystick Zone -->
            <div id="joystick-zone">
                <div id="joystick-base">
                    <div id="joystick-thumb"></div>
                </div>
            </div>
            
            <!-- Aim Zone -->
            <div id="aim-zone"></div>
            
            <!-- Mobile Crosshair -->
            <div id="mobile-crosshair">
                <div class="dot"></div>
            </div>
            
            <!-- Top Bar -->
            <div id="mobile-top-bar">
                <button class="top-btn" id="btn-pause-mobile">⏸️</button>
                <button class="top-btn" id="btn-fullscreen">⛶</button>
            </div>
            
            <!-- Action Buttons -->
            <div id="action-buttons">
                <button class="action-btn" id="btn-fire">🏹</button>
                <button class="action-btn" id="btn-reload-mobile">🔄</button>
                <button class="action-btn" id="btn-special-mobile">⚡</button>
                <span class="btn-label" style="bottom: 0; right: 55px;">Fire</span>
            </div>
            
            <!-- Auto-fire Toggle -->
            <div id="auto-fire-toggle">
                <input type="checkbox" id="auto-fire-checkbox">
                <label for="auto-fire-checkbox">🎯</label>
                <span>Auto</span>
            </div>
        `;

        document.body.appendChild(container);

        // Cache elements
        this.elements = {
            container: container,
            joystickZone: document.getElementById('joystick-zone'),
            joystickBase: document.getElementById('joystick-base'),
            joystickThumb: document.getElementById('joystick-thumb'),
            aimZone: document.getElementById('aim-zone'),
            crosshair: document.getElementById('mobile-crosshair'),
            btnFire: document.getElementById('btn-fire'),
            btnReload: document.getElementById('btn-reload-mobile'),
            btnSpecial: document.getElementById('btn-special-mobile'),
            btnPause: document.getElementById('btn-pause-mobile'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            autoFireCheckbox: document.getElementById('auto-fire-checkbox')
        };
    }

    bindEvents() {
        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (this.isEnabled && this.game.isPlaying) {
                e.preventDefault();
            }
        }, { passive: false });

        // Joystick events
        this.elements.joystickZone.addEventListener('touchstart', this.onJoystickStart.bind(this));
        document.addEventListener('touchmove', this.onJoystickMove.bind(this));
        document.addEventListener('touchend', this.onJoystickEnd.bind(this));
        document.addEventListener('touchcancel', this.onJoystickEnd.bind(this));

        // Aim zone events
        this.elements.aimZone.addEventListener('touchstart', this.onAimStart.bind(this));
        this.elements.aimZone.addEventListener('touchmove', this.onAimMove.bind(this));
        this.elements.aimZone.addEventListener('touchend', this.onAimEnd.bind(this));

        // Fire button
        this.elements.btnFire.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onFireStart();
        });
        this.elements.btnFire.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.onFireEnd();
        });

        // Reload button
        this.elements.btnReload.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onReload();
            this.hapticFeedback('light');
        });

        // Special attack button
        this.elements.btnSpecial.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onSpecialAttack();
            this.hapticFeedback('heavy');
        });

        // Pause button
        this.elements.btnPause.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onPause();
        });

        // Fullscreen button
        this.elements.btnFullscreen.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleFullscreen();
        });

        // Auto-fire toggle
        this.elements.autoFireCheckbox.addEventListener('change', (e) => {
            this.autoFire = e.target.checked;
            this.hapticFeedback('light');
        });

        // Handle orientation change
        window.addEventListener('orientationchange', this.onOrientationChange.bind(this));
        window.addEventListener('resize', this.onResize.bind(this));
    }

    // ==========================================
    // JOYSTICK HANDLERS
    // ==========================================

    onJoystickStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;

        const rect = this.elements.joystickZone.getBoundingClientRect();
        this.joystick.startX = rect.left + rect.width / 2;
        this.joystick.startY = rect.top + rect.height / 2;
        this.joystick.active = true;

        this.elements.joystickThumb.classList.add('active');
        this.hapticFeedback('light');

        this.updateJoystick(touch.clientX, touch.clientY);
    }

    onJoystickMove(e) {
        if (!this.joystick.active) return;

        for (let touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                this.updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    onJoystickEnd(e) {
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                this.joystick.active = false;
                this.joystickTouchId = null;
                this.resetJoystick();
                break;
            }
        }
    }

    updateJoystick(touchX, touchY) {
        let deltaX = touchX - this.joystick.startX;
        let deltaY = touchY - this.joystick.startY;

        // Calculate distance and clamp
        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.joystick.maxDistance) {
            deltaX = (deltaX / distance) * this.joystick.maxDistance;
            deltaY = (deltaY / distance) * this.joystick.maxDistance;
            distance = this.joystick.maxDistance;
        }

        // Update thumb position
        this.elements.joystickThumb.style.transform =
            `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        // Calculate normalized values
        this.moveX = deltaX / this.joystick.maxDistance;
        this.moveY = deltaY / this.joystick.maxDistance;

        // Store for game use
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
    }

    // ==========================================
    // AIM HANDLERS
    // ==========================================

    onAimStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.aimTouchId = touch.identifier;
        this.aim.active = true;

        this.updateAim(touch.clientX, touch.clientY);
        this.elements.crosshair.classList.add('active');

        // Auto-fire when touching aim zone
        if (this.autoFire) {
            this.onFireStart();
        }
    }

    onAimMove(e) {
        e.preventDefault();

        for (let touch of e.changedTouches) {
            if (touch.identifier === this.aimTouchId) {
                this.updateAim(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    onAimEnd(e) {
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.aimTouchId) {
                this.aim.active = false;
                this.aimTouchId = null;
                this.elements.crosshair.classList.remove('active');

                if (this.autoFire) {
                    this.onFireEnd();
                }
                break;
            }
        }
    }

    updateAim(x, y) {
        this.aim.x = x;
        this.aim.y = y;

        // Update crosshair position
        this.elements.crosshair.style.left = `${x - 20}px`;
        this.elements.crosshair.style.top = `${y - 20}px`;
    }

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    onFireStart() {
        this.isFiring = true;
        this.elements.btnFire.classList.add('pressed');
        this.hapticFeedback('medium');

        // Notify game
        if (this.game && this.game.onMobileFire) {
            this.game.onMobileFire(true);
        }
    }

    onFireEnd() {
        this.isFiring = false;
        this.elements.btnFire.classList.remove('pressed');

        // Notify game
        if (this.game && this.game.onMobileFire) {
            this.game.onMobileFire(false);
        }
    }

    onReload() {
        if (this.game && this.game.onMobileReload) {
            this.game.onMobileReload();
        }

        // Visual feedback
        this.elements.btnReload.classList.add('pressed');
        setTimeout(() => {
            this.elements.btnReload.classList.remove('pressed');
        }, 200);
    }

    onSpecialAttack() {
        if (this.game && this.game.onMobileSpecial) {
            this.game.onMobileSpecial();
        }

        // Visual feedback
        this.elements.btnSpecial.classList.add('pressed');
        setTimeout(() => {
            this.elements.btnSpecial.classList.remove('pressed');
        }, 200);
    }

    onPause() {
        if (this.game && this.game.togglePause) {
            this.game.togglePause();
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
                navigator.vibrate([50, 50, 50]);
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
        // Update aim position to center if needed
        if (!this.aim.active) {
            this.aim.x = window.innerWidth / 2;
            this.aim.y = window.innerHeight / 2;
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    show() {
        this.elements.container.classList.add('active');
        this.isEnabled = true;
    }

    hide() {
        this.elements.container.classList.remove('active');
        this.isEnabled = false;
        this.resetJoystick();
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

    destroy() {
        if (this.elements.container) {
            this.elements.container.remove();
        }
        this.isEnabled = false;
    }
}

// Export for use in main game
export default MobileControls;