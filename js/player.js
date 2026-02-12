// ============================================
// Enhanced Player Class - ලාංකික යෝධයා
// Bug-Free Version with Working Damage System
// ============================================

export class Player {
    constructor(x, y, game) {
        // Validate game reference
        if (!game) {
            console.error('Player: game reference is null!');
        }

        this.game = game;

        // Position
        this.x = x || 0;
        this.y = y || 0;
        this.spawnX = x || 0;
        this.spawnY = y || 0;

        // Size
        this.size = 50;
        this.radius = this.size / 2;

        // IMPORTANT: Alive state
        this.alive = true;

        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 250;
        this.baseSpeed = 250;

        // Weapon
        this.maxAmmo = 30;
        this.ammo = this.maxAmmo;
        this.damage = 25;
        this.baseDamage = 25;
        this.fireRate = 0.15;
        this.lastShot = 0;
        this.reloadTime = 1.5;
        this.isReloading = false;
        this.reloadProgress = 0;

        // Special
        this.specialCharge = 0;
        this.maxSpecialCharge = 100;

        // Buffs
        this.hasShield = false;
        this.shieldTimer = 0;
        this.speedBoostTimer = 0;
        this.damageBoostTimer = 0;

        // Visual & Animation
        this.angle = 0;
        this.trailPositions = [];
        this.maxTrailLength = 12;

        // Animation states
        this.animTime = 0;
        this.walkCycle = 0;
        this.isMoving = false;
        this.isShooting = false;
        this.shootAnimTime = 0;

        // Particle effects - Limited count
        this.auraParticles = [];
        this.initAuraParticles();

        // Cape physics
        this.capePoints = [];
        this.initCape();

        // Invincibility - CRITICAL FOR DAMAGE SYSTEM
        this.invincible = false;
        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.visible = true;

        // Colors - Sri Lankan theme
        this.colors = {
            primary: '#D4AF37',
            secondary: '#800020',
            accent: '#FF6B35',
            skin: '#C68642',
            cape: '#800020',
            capeInner: '#4A0012',
            armor: '#B8860B',
            glow: 'rgba(212, 175, 55, 0.5)'
        };

        console.log('Player created with health:', this.health);
    }

    initAuraParticles() {
        this.auraParticles = [];
        // Limit particles
        for (let i = 0; i < 8; i++) {
            this.auraParticles.push({
                angle: (Math.PI * 2 / 8) * i,
                distance: this.size / 2 + 5,
                size: 2 + Math.random() * 2,
                speed: 0.8 + Math.random() * 0.4,
                offset: Math.random() * Math.PI * 2
            });
        }
    }

    initCape() {
        this.capePoints = [];
        const segments = 6;
        for (let i = 0; i < segments; i++) {
            this.capePoints.push({
                x: 0,
                y: i * 5,
                vx: 0,
                vy: 0
            });
        }
    }

    update(dt, keys, mouse) {
        // Validate inputs
        if (!dt || dt <= 0 || dt > 0.1) dt = 0.016;
        if (!keys) keys = {};
        if (!mouse) mouse = { x: this.x, y: this.y };

        // Don't update if dead
        if (!this.alive) return;

        // Movement
        let dx = 0;
        let dy = 0;

        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        this.isMoving = dx !== 0 || dy !== 0;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        const moveX = dx * this.speed * dt;
        const moveY = dy * this.speed * dt;

        this.x += moveX;
        this.y += moveY;

        // Bounds check with safety
        if (this.game && this.game.canvas) {
            const padding = this.size / 2;
            this.x = Math.max(padding, Math.min(this.game.canvas.width - padding, this.x));
            this.y = Math.max(padding + 60, Math.min(this.game.canvas.height - padding, this.y));
        }

        // Angle to mouse
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        // Animation updates
        this.animTime += dt;
        if (this.isMoving) {
            this.walkCycle += dt * 8;
        }

        // Shooting animation
        if (this.isShooting) {
            this.shootAnimTime += dt;
            if (this.shootAnimTime > 0.1) {
                this.isShooting = false;
                this.shootAnimTime = 0;
            }
        }

        // Update visual effects
        this.updateTrail();
        this.updateCape(dt, moveX, moveY);
        this.updateAuraParticles(dt);

        // Reload
        if (this.isReloading) {
            this.reloadProgress += dt;
            if (this.reloadProgress >= this.reloadTime) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                this.reloadProgress = 0;
            }
        }

        // Update buffs
        this.updateBuffs(dt);

        // CRITICAL: Update invincibility
        this.updateInvincibility(dt);
    }

    updateInvincibility(dt) {
        if (this.invincible) {
            this.invincibleTimer -= dt;
            this.flashTimer += dt;

            // Flash effect
            if (this.flashTimer > 0.08) {
                this.visible = !this.visible;
                this.flashTimer = 0;
            }

            // End invincibility
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.invincibleTimer = 0;
                this.visible = true;
                console.log('Invincibility ended');
            }
        }
    }

    updateTrail() {
        this.trailPositions.unshift({
            x: this.x,
            y: this.y,
            angle: this.angle
        });

        // Limit trail length
        while (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.pop();
        }
    }

    updateCape(dt, moveX, moveY) {
        const windForce = -moveX * 0.4;
        const gravity = 1.5;

        for (let i = 1; i < this.capePoints.length; i++) {
            const point = this.capePoints[i];
            const prevPoint = this.capePoints[i - 1];

            point.vx += windForce * dt * 8;
            point.vy += gravity * dt;

            point.vx *= 0.92;
            point.vy *= 0.92;

            point.x += point.vx;
            point.y += point.vy;

            // Constraint
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 5;

            if (distance > maxDist) {
                const ratio = maxDist / distance;
                point.x = prevPoint.x + dx * ratio;
                point.y = prevPoint.y + dy * ratio;
            }
        }
    }

    updateAuraParticles(dt) {
        for (let i = 0; i < this.auraParticles.length; i++) {
            const particle = this.auraParticles[i];
            particle.angle += particle.speed * dt;
            particle.offset += dt * 2;
            particle.distance = this.size / 2 + 4 + Math.sin(particle.offset) * 2;
        }
    }

    updateBuffs(dt) {
        // Speed boost
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            this.speed = this.baseSpeed * 1.5;
            if (this.speedBoostTimer <= 0) {
                this.speedBoostTimer = 0;
                this.speed = this.baseSpeed;
            }
        }

        // Damage boost
        if (this.damageBoostTimer > 0) {
            this.damageBoostTimer -= dt;
            this.damage = this.baseDamage * 2;
            if (this.damageBoostTimer <= 0) {
                this.damageBoostTimer = 0;
                this.damage = this.baseDamage;
            }
        }

        // Shield
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldTimer = 0;
                this.hasShield = false;
            }
        }
    }

    canShoot() {
        if (!this.alive) return false;
        if (this.isReloading) return false;
        if (this.ammo <= 0) return false;

        const now = performance.now() / 1000;
        return (now - this.lastShot) >= this.fireRate;
    }

    shoot(targetX, targetY) {
        if (!this.canShoot()) return null;

        this.lastShot = performance.now() / 1000;
        this.ammo--;
        this.isShooting = true;
        this.shootAnimTime = 0;

        if (this.ammo <= 0) {
            this.reload();
        }

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const gunDistance = this.size / 2 + 12;
        const bulletX = this.x + Math.cos(angle) * gunDistance;
        const bulletY = this.y + Math.sin(angle) * gunDistance;

        // Create bullet as inline object (no Bullet class dependency)
        return {
            x: bulletX,
            y: bulletY,
            vx: Math.cos(angle) * 500,
            vy: Math.sin(angle) * 500,
            radius: 5,
            damage: this.damage,
            color: '#FFD700',
            isActive: true,
            owner: 'player',

            update(dt) {
                if (!this.isActive) return;
                this.x += this.vx * dt;
                this.y += this.vy * dt;
            },

            render(ctx) {
                if (!this.isActive) return;

                ctx.save();
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
    }

    reload() {
        if (this.isReloading) return;
        if (this.ammo === this.maxAmmo) return;

        this.isReloading = true;
        this.reloadProgress = 0;
    }

    // CRITICAL: Fixed takeDamage function
    takeDamage(amount) {
        // Check if can take damage
        if (!this.alive) {
            console.log('Player already dead, ignoring damage');
            return;
        }

        if (this.invincible) {
            console.log('Player invincible, ignoring damage');
            return;
        }

        // Shield blocks damage
        if (this.hasShield) {
            console.log('Shield blocked damage!');
            this.hasShield = false;
            this.shieldTimer = 0;
            // Still trigger invincibility after shield break
            this.invincible = true;
            this.invincibleTimer = 0.5;
            return;
        }

        // Apply damage
        const oldHealth = this.health;
        this.health -= amount;
        this.health = Math.max(0, this.health);

        console.log(`Player took ${amount} damage: ${oldHealth} -> ${this.health}`);

        // Trigger invincibility frames
        this.invincible = true;
        this.invincibleTimer = 1.5;
        this.flashTimer = 0;
        this.visible = true;

        // Screen flash effect (with safety check)
        try {
            if (this.game && typeof this.game.screenFlash === 'function') {
                this.game.screenFlash('#ff0000');
            }
        } catch (e) {
            console.warn('screenFlash error:', e);
        }

        // Check if dead
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            console.log('Player died!');
        }
    }

    heal(amount) {
        if (!this.alive) return;

        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        console.log(`Player healed: ${oldHealth} -> ${this.health}`);
    }

    applySpeedBoost() {
        this.speedBoostTimer = 10;
        this.speed = this.baseSpeed * 1.5;
        console.log('Speed boost applied!');
    }

    applyDamageBoost() {
        this.damageBoostTimer = 10;
        this.damage = this.baseDamage * 2;
        console.log('Damage boost applied!');
    }

    applyShield() {
        this.hasShield = true;
        this.shieldTimer = 15;
        console.log('Shield applied!');
    }

    chargeSpecial(amount) {
        if (!this.alive) return;
        this.specialCharge = Math.min(this.maxSpecialCharge, this.specialCharge + amount);
    }

    useSpecial() {
        if (this.specialCharge >= 100) {
            this.specialCharge = 0;
            console.log('Special ability used!');
            return true;
        }
        return false;
    }

    respawn() {
        console.log('Player respawning...');

        this.x = this.spawnX;
        this.y = this.spawnY;
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.reloadProgress = 0;
        this.alive = true;
        this.invincible = true;
        this.invincibleTimer = 3;
        this.visible = true;
        this.hasShield = false;
        this.shieldTimer = 0;
        this.speedBoostTimer = 0;
        this.damageBoostTimer = 0;
        this.speed = this.baseSpeed;
        this.damage = this.baseDamage;

        console.log('Player respawned with health:', this.health);
    }

    // render(ctx, mouse) {
    //     if (!ctx) return;
    //     if (!this.visible && this.invincible) return; // Flash effect

    //     ctx.save();

    //     try {
    //         // Draw trail
    //         this.drawTrail(ctx);

    //         // Draw aura particles
    //         this.drawAuraParticles(ctx);

    //         // Draw shield
    //         if (this.hasShield) {
    //             this.drawShield(ctx);
    //         }

    //         // Draw cape
    //         this.drawCape(ctx);

    //         // Main character
    //         ctx.translate(this.x, this.y);
    //         ctx.rotate(this.angle);

    //         // Draw body
    //         this.drawBody(ctx);

    //         // Draw weapon
    //         this.drawWeapon(ctx);
    //     } catch (e) {
    //         console.error('Player render error:', e);
    //         // Fallback simple render
    //         ctx.fillStyle = '#FFD700';
    //         ctx.beginPath();
    //         ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    //         ctx.fill();
    //     }

    //     ctx.restore();

    //     // UI elements (outside transform)
    //     if (this.isReloading) {
    //         this.drawReloadIndicator(ctx);
    //     }
    //     this.drawBuffIndicators(ctx);

    //     // Crosshair
    //     if (mouse) {
    //         this.drawCrosshair(ctx, mouse);
    //     }
    // }
    render(ctx, mouse) {
        if (!ctx) return;
        if (!this.visible && this.invincible) return;

        ctx.save();

        try {
            // Draw effects behind player
            this.drawGroundEffect(ctx);
            this.drawTrail(ctx);
            this.drawAuraParticles(ctx);

            // Draw shield if active
            if (this.hasShield) {
                this.drawShield(ctx);
            }

            // Draw cape
            this.drawCape(ctx);

            // Main character
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Draw character
            this.drawBody(ctx);
            this.drawWeapon(ctx);

        } catch (e) {
            console.error('Player render error:', e);
            // Fallback
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // UI elements
        if (this.isReloading) {
            this.drawReloadIndicator(ctx);
        }
        this.drawBuffIndicators(ctx);

        // Crosshair
        if (mouse) {
            this.drawCrosshair(ctx, mouse);
        }
    }

    drawGroundEffect(ctx) {
        ctx.save();

        // Dynamic shadow based on movement
        const shadowPulse = 1 + Math.sin(this.animTime * 3) * 0.1;
        const shadowSize = this.size / 2 * shadowPulse;

        // Main shadow
        const gradient = ctx.createRadialGradient(
            this.x, this.y + 5, 0,
            this.x, this.y + 5, shadowSize
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.size / 2, shadowSize, shadowSize / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden glow on ground when buffed
        if (this.speedBoostTimer > 0 || this.damageBoostTimer > 0) {
            const glowColor = this.speedBoostTimer > 0 ? 'rgba(52, 152, 219, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            const glowGradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size
            );
            glowGradient.addColorStop(0, glowColor);
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // drawTrail(ctx) {
    //     if (this.trailPositions.length < 2) return;

    //     for (let i = 1; i < this.trailPositions.length; i++) {
    //         const pos = this.trailPositions[i];
    //         const alpha = (1 - (i / this.trailPositions.length)) * 0.3;
    //         const size = (this.size / 2) * (1 - i / this.trailPositions.length) * 0.7;

    //         if (size < 1) continue;

    //         ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    //         ctx.beginPath();
    //         ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    //         ctx.fill();
    //     }
    // }
    drawTrail(ctx) {
        if (this.trailPositions.length < 2) return;
        if (!this.isMoving) return;

        ctx.save();

        // Draw motion blur trail
        for (let i = 1; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const alpha = (1 - (i / this.trailPositions.length)) * 0.5;
            const size = (this.size / 2) * (1 - i / this.trailPositions.length) * 0.6;

            if (size < 2) continue;

            // Golden energy trail
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
            gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(212, 175, 55, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add sparkles in trail
        for (let i = 0; i < this.trailPositions.length; i += 3) {
            const pos = this.trailPositions[i];
            const sparkleAlpha = (1 - (i / this.trailPositions.length)) * 0.8;
            const sparkleSize = 2 + Math.sin(this.animTime * 10 + i) * 1;

            ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
            ctx.beginPath();
            ctx.arc(
                pos.x + Math.sin(i * 2) * 5,
                pos.y + Math.cos(i * 2) * 5,
                sparkleSize, 0, Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }

    // drawAuraParticles(ctx) {
    //     for (let i = 0; i < this.auraParticles.length; i++) {
    //         const particle = this.auraParticles[i];
    //         const x = this.x + Math.cos(particle.angle) * particle.distance;
    //         const y = this.y + Math.sin(particle.angle) * particle.distance;

    //         let color = this.colors.primary;
    //         if (this.speedBoostTimer > 0) color = '#3498db';
    //         if (this.damageBoostTimer > 0) color = '#e74c3c';

    //         const alpha = 0.25 + Math.sin(particle.offset) * 0.15;

    //         ctx.save();
    //         ctx.globalAlpha = alpha;
    //         ctx.fillStyle = color;
    //         ctx.shadowColor = color;
    //         ctx.shadowBlur = 8;
    //         ctx.beginPath();
    //         ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    //         ctx.fill();
    //         ctx.restore();
    //     }
    // }
    drawAuraParticles(ctx) {
        ctx.save();

        // Determine aura color based on state
        let auraColor = this.colors.primary;
        let glowIntensity = 1;

        if (this.speedBoostTimer > 0) {
            auraColor = '#3498db';
            glowIntensity = 1.5;
        } else if (this.damageBoostTimer > 0) {
            auraColor = '#e74c3c';
            glowIntensity = 1.5;
        }

        for (let i = 0; i < this.auraParticles.length; i++) {
            const particle = this.auraParticles[i];
            const x = this.x + Math.cos(particle.angle) * particle.distance;
            const y = this.y + Math.sin(particle.angle) * particle.distance;

            const pulse = Math.sin(particle.offset) * 0.4 + 0.6;
            const size = particle.size * pulse * glowIntensity;

            // Outer glow
            ctx.shadowColor = auraColor;
            ctx.shadowBlur = 15 * pulse;

            // Main particle
            const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            particleGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulse})`);
            particleGradient.addColorStop(0.4, auraColor);
            particleGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner energy ring
        ctx.shadowBlur = 0;
        const ringPulse = Math.sin(this.animTime * 4) * 0.1 + 0.9;
        ctx.strokeStyle = `rgba(212, 175, 55, ${0.3 * ringPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // drawShield(ctx) {
    //     const time = this.animTime;

    //     ctx.save();

    //     // Rotating orbs
    //     for (let i = 0; i < 5; i++) {
    //         const angle = (Math.PI * 2 / 5) * i + time * 1.5;
    //         const x = this.x + Math.cos(angle) * (this.size / 2 + 18);
    //         const y = this.y + Math.sin(angle) * (this.size / 2 + 18);

    //         ctx.fillStyle = `rgba(46, 204, 113, ${0.5 + Math.sin(time * 4 + i) * 0.25})`;
    //         ctx.shadowColor = '#2ecc71';
    //         ctx.shadowBlur = 12;
    //         ctx.beginPath();
    //         ctx.arc(x, y, 4, 0, Math.PI * 2);
    //         ctx.fill();
    //     }

    //     // Shield dome
    //     const gradient = ctx.createRadialGradient(
    //         this.x, this.y, this.size / 2,
    //         this.x, this.y, this.size / 2 + 22
    //     );
    //     gradient.addColorStop(0, 'rgba(46, 204, 113, 0)');
    //     gradient.addColorStop(0.6, 'rgba(46, 204, 113, 0.1)');
    //     gradient.addColorStop(1, 'rgba(46, 204, 113, 0.25)');

    //     ctx.fillStyle = gradient;
    //     ctx.beginPath();
    //     ctx.arc(this.x, this.y, this.size / 2 + 22, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.restore();
    // }
    drawShield(ctx) {
        const time = this.animTime;

        ctx.save();

        // Hexagonal energy shield
        const shieldRadius = this.size / 2 + 25;

        // Rotating outer ring
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time * 2;
            const x = this.x + Math.cos(angle) * shieldRadius;
            const y = this.y + Math.sin(angle) * shieldRadius;
            const pulseSize = 5 + Math.sin(time * 5 + i) * 2;

            // Energy node
            const nodeGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
            nodeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            nodeGradient.addColorStop(0.5, 'rgba(46, 204, 113, 0.8)');
            nodeGradient.addColorStop(1, 'rgba(46, 204, 113, 0)');

            ctx.fillStyle = nodeGradient;
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Connecting lines between nodes
        ctx.strokeStyle = `rgba(46, 204, 113, ${0.4 + Math.sin(time * 3) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time * 2;
            const x = this.x + Math.cos(angle) * shieldRadius;
            const y = this.y + Math.sin(angle) * shieldRadius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Shield dome with energy pattern
        const domeGradient = ctx.createRadialGradient(
            this.x, this.y, this.size / 2,
            this.x, this.y, shieldRadius
        );
        domeGradient.addColorStop(0, 'rgba(46, 204, 113, 0)');
        domeGradient.addColorStop(0.5, 'rgba(46, 204, 113, 0.05)');
        domeGradient.addColorStop(0.8, 'rgba(46, 204, 113, 0.15)');
        domeGradient.addColorStop(1, 'rgba(46, 204, 113, 0.3)');

        ctx.fillStyle = domeGradient;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x, this.y, shieldRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner rotating symbols
        ctx.fillStyle = `rgba(46, 204, 113, ${0.3 + Math.sin(time * 2) * 0.15})`;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i - time * 1.5;
            const x = this.x + Math.cos(angle) * (this.size / 2 + 12);
            const y = this.y + Math.sin(angle) * (this.size / 2 + 12);
            ctx.fillText('⬡', x, y);
        }

        ctx.restore();
    }

    // drawCape(ctx) {
    //     if (this.capePoints.length < 2) return;

    //     ctx.save();
    //     ctx.translate(this.x, this.y);
    //     ctx.rotate(this.angle + Math.PI);

    //     const gradient = ctx.createLinearGradient(0, 0, 0, 35);
    //     gradient.addColorStop(0, this.colors.cape);
    //     gradient.addColorStop(1, this.colors.capeInner);

    //     ctx.fillStyle = gradient;
    //     ctx.strokeStyle = this.colors.primary;
    //     ctx.lineWidth = 1;

    //     ctx.beginPath();
    //     ctx.moveTo(-10, 5);

    //     for (let i = 0; i < this.capePoints.length; i++) {
    //         const point = this.capePoints[i];
    //         const width = 10 - (i / this.capePoints.length) * 5;
    //         ctx.lineTo(-width + point.x, 5 + i * 5 + point.y);
    //     }

    //     const lastPoint = this.capePoints[this.capePoints.length - 1];
    //     ctx.lineTo(lastPoint.x, 5 + (this.capePoints.length - 1) * 5 + lastPoint.y + 4);

    //     for (let i = this.capePoints.length - 1; i >= 0; i--) {
    //         const point = this.capePoints[i];
    //         const width = 10 - (i / this.capePoints.length) * 5;
    //         ctx.lineTo(width + point.x, 5 + i * 5 + point.y);
    //     }

    //     ctx.lineTo(10, 5);
    //     ctx.closePath();
    //     ctx.fill();
    //     ctx.stroke();

    //     ctx.restore();
    // }
    drawCape(ctx) {
        if (this.capePoints.length < 2) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI);

        // Cape main gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 40);
        gradient.addColorStop(0, '#8B0000');  // Dark red top
        gradient.addColorStop(0.3, '#800020'); // Maroon
        gradient.addColorStop(0.7, '#600018'); // Darker
        gradient.addColorStop(1, '#400010');   // Very dark bottom

        ctx.fillStyle = gradient;

        // Draw flowing cape shape
        ctx.beginPath();
        ctx.moveTo(-12, 3);

        // Left edge with wave effect
        for (let i = 0; i < this.capePoints.length; i++) {
            const point = this.capePoints[i];
            const wave = Math.sin(this.animTime * 3 + i * 0.5) * 2;
            const width = 12 - (i / this.capePoints.length) * 6;
            ctx.lineTo(-width + point.x + wave, 3 + i * 5 + point.y);
        }

        // Bottom curve
        const lastPoint = this.capePoints[this.capePoints.length - 1];
        const bottomWave = Math.sin(this.animTime * 4) * 3;
        ctx.quadraticCurveTo(
            lastPoint.x, 3 + (this.capePoints.length) * 5 + lastPoint.y + 8 + bottomWave,
            0, 3 + (this.capePoints.length - 1) * 5 + lastPoint.y + 5
        );

        // Right edge
        for (let i = this.capePoints.length - 1; i >= 0; i--) {
            const point = this.capePoints[i];
            const wave = Math.sin(this.animTime * 3 + i * 0.5) * 2;
            const width = 12 - (i / this.capePoints.length) * 6;
            ctx.lineTo(width + point.x - wave, 3 + i * 5 + point.y);
        }

        ctx.lineTo(12, 3);
        ctx.closePath();
        ctx.fill();

        // Cape gold trim
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cape inner pattern - Sri Lankan style
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 4, 8);
            ctx.lineTo(i * 3, 35);
            ctx.stroke();
        }

        ctx.restore();
    }

    // drawBody(ctx) {
    //     const bounce = this.isMoving ? Math.sin(this.walkCycle) * 1.5 : 0;
    //     const shootRecoil = this.isShooting ? -4 : 0;

    //     // Shadow
    //     ctx.save();
    //     ctx.rotate(-this.angle);
    //     ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    //     ctx.beginPath();
    //     ctx.ellipse(0, this.size / 2 - 5, this.size / 2.5, this.size / 5, 0, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.restore();

    //     // Legs
    //     ctx.save();
    //     const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 2.5 : 0;

    //     ctx.fillStyle = this.colors.secondary;
    //     ctx.beginPath();
    //     ctx.ellipse(-6 + legOffset, 4 + bounce, 5, 8, -0.3, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.beginPath();
    //     ctx.ellipse(-6 - legOffset, -4 + bounce, 5, 8, 0.3, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.restore();

    //     // Body
    //     ctx.save();
    //     ctx.translate(shootRecoil, bounce);

    //     const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    //     bodyGradient.addColorStop(0, '#FFD700');
    //     bodyGradient.addColorStop(0.5, this.colors.primary);
    //     bodyGradient.addColorStop(1, this.colors.armor);

    //     ctx.fillStyle = bodyGradient;
    //     ctx.beginPath();
    //     ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.strokeStyle = this.colors.secondary;
    //     ctx.lineWidth = 2;
    //     ctx.stroke();

    //     // Chest emblem
    //     ctx.fillStyle = this.colors.secondary;
    //     ctx.beginPath();
    //     ctx.arc(4, 0, 7, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.fillStyle = this.colors.primary;
    //     ctx.font = '9px Arial';
    //     ctx.textAlign = 'center';
    //     ctx.textBaseline = 'middle';
    //     ctx.fillText('🦁', 4, 0);

    //     ctx.restore();

    //     // Head
    //     ctx.save();
    //     ctx.translate(10 + shootRecoil, bounce);

    //     const helmetGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    //     helmetGradient.addColorStop(0, '#FFD700');
    //     helmetGradient.addColorStop(0.7, this.colors.primary);
    //     helmetGradient.addColorStop(1, this.colors.armor);

    //     ctx.fillStyle = helmetGradient;
    //     ctx.beginPath();
    //     ctx.arc(0, 0, 9, 0, Math.PI * 2);
    //     ctx.fill();

    //     // Crest
    //     ctx.fillStyle = this.colors.secondary;
    //     ctx.beginPath();
    //     ctx.moveTo(-2, -9);
    //     ctx.lineTo(0, -14);
    //     ctx.lineTo(2, -9);
    //     ctx.closePath();
    //     ctx.fill();

    //     // Visor
    //     ctx.fillStyle = '#2c3e50';
    //     ctx.beginPath();
    //     ctx.ellipse(3, 0, 3.5, 2.5, 0, 0, Math.PI * 2);
    //     ctx.fill();

    //     // Eyes
    //     ctx.fillStyle = '#FFD700';
    //     ctx.shadowColor = '#FFD700';
    //     ctx.shadowBlur = 4;
    //     ctx.beginPath();
    //     ctx.arc(4, -1, 1.2, 0, Math.PI * 2);
    //     ctx.arc(4, 1, 1.2, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.restore();

    //     // Shoulders
    //     ctx.save();
    //     ctx.translate(shootRecoil, bounce);

    //     ctx.fillStyle = this.colors.armor;
    //     ctx.beginPath();
    //     ctx.ellipse(-4, -12, 7, 5, 0.3, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.strokeStyle = this.colors.primary;
    //     ctx.lineWidth = 1;
    //     ctx.stroke();

    //     ctx.beginPath();
    //     ctx.ellipse(-4, 12, 7, 5, -0.3, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.stroke();

    //     ctx.restore();
    // }
    drawBody(ctx) {
        const bounce = this.isMoving ? Math.sin(this.walkCycle) * 2 : 0;
        const breathe = Math.sin(this.animTime * 2) * 0.5;
        const shootRecoil = this.isShooting ? -5 : 0;

        // === LEGS ===
        ctx.save();
        const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 4 : 0;

        // Leg armor gradient
        const legGradient = ctx.createLinearGradient(-10, -5, -10, 15);
        legGradient.addColorStop(0, '#600018');
        legGradient.addColorStop(0.5, '#800020');
        legGradient.addColorStop(1, '#500015');

        ctx.fillStyle = legGradient;

        // Left leg
        ctx.beginPath();
        ctx.ellipse(-8 + legOffset, 6 + bounce, 7, 11, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.ellipse(-8 - legOffset, -6 + bounce, 7, 11, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Knee guards
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.ellipse(-5 + legOffset, 5 + bounce, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-5 - legOffset, -5 + bounce, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // === MAIN BODY ARMOR ===
        ctx.save();
        ctx.translate(shootRecoil, bounce + breathe);

        // Body base - Golden armor
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        bodyGradient.addColorStop(0, '#FFD700');
        bodyGradient.addColorStop(0.3, '#D4AF37');
        bodyGradient.addColorStop(0.7, '#B8860B');
        bodyGradient.addColorStop(1, '#8B6914');

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor outer ring
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Armor inner details
        ctx.strokeStyle = 'rgba(139, 105, 20, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Chest emblem background
        ctx.fillStyle = '#800020';
        ctx.shadowColor = '#800020';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(5, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Emblem border
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // Lion emblem with glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('🦁', 5, 0);
        ctx.shadowBlur = 0;

        // Armor rivets
        ctx.fillStyle = '#FFD700';
        const rivetPositions = [
            [-12, -8], [-12, 8], [12, -6], [12, 6],
            [-8, -12], [-8, 12], [0, -14], [0, 14]
        ];
        rivetPositions.forEach(([rx, ry]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        // === SHOULDER ARMOR ===
        ctx.save();
        ctx.translate(shootRecoil, bounce + breathe);

        // Left shoulder plate
        const shoulderGradient = ctx.createRadialGradient(-5, -14, 0, -5, -14, 10);
        shoulderGradient.addColorStop(0, '#FFD700');
        shoulderGradient.addColorStop(0.5, '#D4AF37');
        shoulderGradient.addColorStop(1, '#8B6914');

        ctx.fillStyle = shoulderGradient;
        ctx.beginPath();
        ctx.ellipse(-4, -15, 9, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Left shoulder spike
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.moveTo(-8, -20);
        ctx.lineTo(-2, -28);
        ctx.lineTo(0, -19);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left shoulder gem
        ctx.fillStyle = '#e74c3c';
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(-4, -15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Right shoulder plate
        ctx.fillStyle = shoulderGradient;
        ctx.beginPath();
        ctx.ellipse(-4, 15, 9, 7, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right shoulder spike
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.moveTo(-8, 20);
        ctx.lineTo(-2, 28);
        ctx.lineTo(0, 19);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right shoulder gem
        ctx.fillStyle = '#3498db';
        ctx.shadowColor = '#3498db';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(-4, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();

        // === HELMET / HEAD ===
        ctx.save();
        ctx.translate(12 + shootRecoil, bounce + breathe);

        // Helmet base
        const helmetGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        helmetGradient.addColorStop(0, '#FFD700');
        helmetGradient.addColorStop(0.4, '#D4AF37');
        helmetGradient.addColorStop(0.8, '#B8860B');
        helmetGradient.addColorStop(1, '#8B6914');

        ctx.fillStyle = helmetGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        // Helmet border
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Helmet crest (plume)
        const crestGradient = ctx.createLinearGradient(0, -12, 0, -25);
        crestGradient.addColorStop(0, '#800020');
        crestGradient.addColorStop(0.5, '#A00030');
        crestGradient.addColorStop(1, '#600015');

        ctx.fillStyle = crestGradient;
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.quadraticCurveTo(-6, -18, -2, -24);
        ctx.quadraticCurveTo(0, -26, 2, -24);
        ctx.quadraticCurveTo(6, -18, 4, -10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Helmet face plate
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.quadraticCurveTo(12, 0, 6, 6);
        ctx.quadraticCurveTo(4, 4, 4, 0);
        ctx.quadraticCurveTo(4, -4, 6, -6);
        ctx.closePath();
        ctx.fill();

        // Eye glow effect
        const eyePulse = Math.sin(this.animTime * 4) * 0.3 + 0.7;

        ctx.fillStyle = `rgba(255, 215, 0, ${eyePulse})`;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(7, -2, 2.5, 1.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(7, 2, 2.5, 1.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eye inner glow
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(7.5, -2, 1, 0, Math.PI * 2);
        ctx.arc(7.5, 2, 1, 0, Math.PI * 2);
        ctx.fill();

        // Helmet decorative lines
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();

        ctx.restore();
    }

    // drawWeapon(ctx) {
    //     const shootRecoil = this.isShooting ? -6 : 0;
    //     const bounce = this.isMoving ? Math.sin(this.walkCycle) * 0.8 : 0;

    //     ctx.save();
    //     ctx.translate(shootRecoil, bounce);

    //     // Bow
    //     ctx.strokeStyle = '#8B4513';
    //     ctx.lineWidth = 3;
    //     ctx.lineCap = 'round';

    //     ctx.beginPath();
    //     ctx.arc(18, 0, 16, -Math.PI * 0.4, Math.PI * 0.4);
    //     ctx.stroke();

    //     // Bow decorations
    //     ctx.fillStyle = this.colors.primary;
    //     ctx.beginPath();
    //     ctx.arc(18 + Math.cos(-Math.PI * 0.4) * 16, Math.sin(-Math.PI * 0.4) * 16, 2.5, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.beginPath();
    //     ctx.arc(18 + Math.cos(Math.PI * 0.4) * 16, Math.sin(Math.PI * 0.4) * 16, 2.5, 0, Math.PI * 2);
    //     ctx.fill();

    //     // String
    //     ctx.strokeStyle = '#ccc';
    //     ctx.lineWidth = 1;
    //     ctx.beginPath();
    //     ctx.moveTo(18 + Math.cos(-Math.PI * 0.4) * 16, Math.sin(-Math.PI * 0.4) * 16);
    //     ctx.lineTo(13 + shootRecoil, 0);
    //     ctx.lineTo(18 + Math.cos(Math.PI * 0.4) * 16, Math.sin(Math.PI * 0.4) * 16);
    //     ctx.stroke();

    //     // Arrow (when not shooting)
    //     if (!this.isShooting) {
    //         ctx.strokeStyle = '#8B4513';
    //         ctx.lineWidth = 2;
    //         ctx.beginPath();
    //         ctx.moveTo(13, 0);
    //         ctx.lineTo(35, 0);
    //         ctx.stroke();

    //         // Arrow head
    //         ctx.fillStyle = '#C0C0C0';
    //         ctx.beginPath();
    //         ctx.moveTo(35, 0);
    //         ctx.lineTo(30, -3);
    //         ctx.lineTo(31, 0);
    //         ctx.lineTo(30, 3);
    //         ctx.closePath();
    //         ctx.fill();

    //         // Feathers
    //         ctx.fillStyle = this.colors.secondary;
    //         ctx.beginPath();
    //         ctx.moveTo(16, 0);
    //         ctx.lineTo(13, -3);
    //         ctx.lineTo(18, 0);
    //         ctx.lineTo(13, 3);
    //         ctx.closePath();
    //         ctx.fill();
    //     }

    //     // Arm
    //     ctx.fillStyle = this.colors.skin;
    //     ctx.beginPath();
    //     ctx.ellipse(9, 7, 4, 3, 0.5, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.restore();
    // }
    drawWeapon(ctx) {
        const shootRecoil = this.isShooting ? -8 : 0;
        const bounce = this.isMoving ? Math.sin(this.walkCycle) * 1 : 0;
        const drawPull = this.isShooting ? 0 : Math.sin(this.animTime * 2) * 2;

        ctx.save();
        ctx.translate(shootRecoil, bounce);

        // === BOW ===
        // Bow body gradient
        const bowGradient = ctx.createLinearGradient(15, -20, 15, 20);
        bowGradient.addColorStop(0, '#5D3A1A');
        bowGradient.addColorStop(0.3, '#8B4513');
        bowGradient.addColorStop(0.5, '#A0522D');
        bowGradient.addColorStop(0.7, '#8B4513');
        bowGradient.addColorStop(1, '#5D3A1A');

        ctx.strokeStyle = bowGradient;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';

        // Main bow curve
        ctx.beginPath();
        ctx.arc(20, 0, 18, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        // Bow inner detail
        ctx.strokeStyle = '#6B4423';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(20, 0, 16, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        // Bow end decorations (golden caps)
        const endTopX = 20 + Math.cos(-Math.PI * 0.45) * 18;
        const endTopY = Math.sin(-Math.PI * 0.45) * 18;
        const endBotX = 20 + Math.cos(Math.PI * 0.45) * 18;
        const endBotY = Math.sin(Math.PI * 0.45) * 18;

        // Top decoration
        ctx.fillStyle = '#D4AF37';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(endTopX, endTopY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Bottom decoration
        ctx.beginPath();
        ctx.arc(endBotX, endBotY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gem on bow center
        ctx.fillStyle = '#9b59b6';
        ctx.shadowColor = '#9b59b6';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(20, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // === BOW STRING ===
        ctx.strokeStyle = '#DDD';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endTopX, endTopY);
        ctx.lineTo(14 + shootRecoil - drawPull, 0);
        ctx.lineTo(endBotX, endBotY);
        ctx.stroke();

        // String vibration effect after shooting
        if (this.isShooting) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(endTopX, endTopY);
            ctx.quadraticCurveTo(16, Math.sin(this.shootAnimTime * 50) * 5, 14, 0);
            ctx.quadraticCurveTo(16, -Math.sin(this.shootAnimTime * 50) * 5, endBotX, endBotY);
            ctx.stroke();
        }

        // === ARROW ===
        if (!this.isShooting) {
            // Arrow shaft
            const shaftGradient = ctx.createLinearGradient(14, 0, 42, 0);
            shaftGradient.addColorStop(0, '#5D3A1A');
            shaftGradient.addColorStop(0.5, '#8B4513');
            shaftGradient.addColorStop(1, '#6B4423');

            ctx.strokeStyle = shaftGradient;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(14 - drawPull, 0);
            ctx.lineTo(42, 0);
            ctx.stroke();

            // Arrow head (metallic)
            const headGradient = ctx.createLinearGradient(38, -6, 48, 6);
            headGradient.addColorStop(0, '#E8E8E8');
            headGradient.addColorStop(0.5, '#C0C0C0');
            headGradient.addColorStop(1, '#A0A0A0');

            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.moveTo(42, 0);
            ctx.lineTo(36, -5);
            ctx.lineTo(38, 0);
            ctx.lineTo(36, 5);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Arrow feathers
            ctx.fillStyle = '#800020';
            ctx.beginPath();
            ctx.moveTo(16 - drawPull, 0);
            ctx.lineTo(12 - drawPull, -5);
            ctx.lineTo(20 - drawPull, 0);
            ctx.lineTo(12 - drawPull, 5);
            ctx.closePath();
            ctx.fill();

            // Feather detail
            ctx.strokeStyle = '#600015';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Second feather layer
            ctx.fillStyle = '#A00030';
            ctx.beginPath();
            ctx.moveTo(18 - drawPull, 0);
            ctx.lineTo(14 - drawPull, -3);
            ctx.lineTo(21 - drawPull, 0);
            ctx.lineTo(14 - drawPull, 3);
            ctx.closePath();
            ctx.fill();

            // Arrow glow (energy arrow)
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 3;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(40, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // === ARM ===
        // Arm holding bow
        const armGradient = ctx.createRadialGradient(10, 8, 0, 10, 8, 6);
        armGradient.addColorStop(0, '#D4A574');
        armGradient.addColorStop(0.7, '#C68642');
        armGradient.addColorStop(1, '#A0522D');

        ctx.fillStyle = armGradient;
        ctx.beginPath();
        ctx.ellipse(10, 8, 6, 5, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Arm guard
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.ellipse(8, 9, 4, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // drawReloadIndicator(ctx) {
    //     const progress = this.reloadProgress / this.reloadTime;
    //     const barWidth = 55;
    //     const barHeight = 7;
    //     const x = this.x - barWidth / 2;
    //     const y = this.y - this.size / 2 - 28;

    //     // Background
    //     ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    //     ctx.beginPath();
    //     ctx.roundRect(x - 4, y - 4, barWidth + 8, barHeight + 18, 4);
    //     ctx.fill();

    //     // Bar background
    //     ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
    //     ctx.beginPath();
    //     ctx.roundRect(x, y, barWidth, barHeight, 3);
    //     ctx.fill();

    //     // Progress
    //     const gradient = ctx.createLinearGradient(x, y, x + barWidth * progress, y);
    //     gradient.addColorStop(0, '#f39c12');
    //     gradient.addColorStop(1, '#e67e22');
    //     ctx.fillStyle = gradient;
    //     ctx.beginPath();
    //     ctx.roundRect(x, y, barWidth * progress, barHeight, 3);
    //     ctx.fill();

    //     // Text
    //     ctx.fillStyle = '#fff';
    //     ctx.font = '9px Arial';
    //     ctx.textAlign = 'center';
    //     ctx.fillText('Reloading...', this.x, y + 15);
    // }
    drawReloadIndicator(ctx) {
        const progress = this.reloadProgress / this.reloadTime;
        const barWidth = 60;
        const barHeight = 8;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - 35;

        ctx.save();

        // Background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(x - 8, y - 8, barWidth + 16, barHeight + 24, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Progress bar background
        ctx.fillStyle = 'rgba(60, 60, 60, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();

        // Progress gradient
        const progressGradient = ctx.createLinearGradient(x, y, x + barWidth * progress, y);
        progressGradient.addColorStop(0, '#f39c12');
        progressGradient.addColorStop(0.5, '#e67e22');
        progressGradient.addColorStop(1, '#d35400');

        ctx.fillStyle = progressGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * progress, barHeight, 4);
        ctx.fill();

        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * progress, barHeight / 2, 4);
        ctx.fill();

        // Arrow icon
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f39c12';
        ctx.fillText('🏹', this.x, y + 20);

        ctx.restore();
    }

    // drawBuffIndicators(ctx) {
    //     const buffs = [];
    //     if (this.speedBoostTimer > 0) buffs.push({ icon: '⚡', color: '#3498db', timer: this.speedBoostTimer });
    //     if (this.damageBoostTimer > 0) buffs.push({ icon: '💥', color: '#e74c3c', timer: this.damageBoostTimer });
    //     if (this.hasShield) buffs.push({ icon: '🛡️', color: '#2ecc71', timer: this.shieldTimer });

    //     buffs.forEach((buff, index) => {
    //         const x = this.x - 30 + index * 28;
    //         const y = this.y + this.size / 2 + 22;

    //         ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    //         ctx.beginPath();
    //         ctx.arc(x, y, 12, 0, Math.PI * 2);
    //         ctx.fill();

    //         const timerPercent = Math.min(1, buff.timer / 10);
    //         ctx.strokeStyle = buff.color;
    //         ctx.lineWidth = 2.5;
    //         ctx.beginPath();
    //         ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPercent);
    //         ctx.stroke();

    //         ctx.font = '12px Arial';
    //         ctx.textAlign = 'center';
    //         ctx.textBaseline = 'middle';
    //         ctx.fillText(buff.icon, x, y);
    //     });
    // }
    drawBuffIndicators(ctx) {
        const buffs = [];
        if (this.speedBoostTimer > 0) buffs.push({ icon: '⚡', color: '#3498db', timer: this.speedBoostTimer, name: 'Speed' });
        if (this.damageBoostTimer > 0) buffs.push({ icon: '💥', color: '#e74c3c', timer: this.damageBoostTimer, name: 'Power' });
        if (this.hasShield) buffs.push({ icon: '🛡️', color: '#2ecc71', timer: this.shieldTimer, name: 'Shield' });

        if (buffs.length === 0) return;

        ctx.save();

        buffs.forEach((buff, index) => {
            const x = this.x - ((buffs.length - 1) * 18) + index * 36;
            const y = this.y + this.size / 2 + 28;

            // Buff background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.fill();

            // Timer ring
            const timerPercent = Math.min(1, buff.timer / 10);
            ctx.strokeStyle = buff.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPercent);
            ctx.stroke();

            // Glow effect
            ctx.shadowColor = buff.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = buff.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Icon
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(buff.icon, x, y);
        });

        ctx.restore();
    }

    // drawCrosshair(ctx, mouse) {
    //     if (!mouse) return;

    //     ctx.save();
    //     ctx.translate(mouse.x, mouse.y);

    //     const time = this.animTime;
    //     const size = 14 + Math.sin(time * 4) * 1.5;

    //     ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
    //     ctx.lineWidth = 2;
    //     ctx.beginPath();
    //     ctx.arc(0, 0, size, 0, Math.PI * 2);
    //     ctx.stroke();

    //     ctx.beginPath();
    //     ctx.moveTo(-size - 4, 0);
    //     ctx.lineTo(-size + 4, 0);
    //     ctx.moveTo(size - 4, 0);
    //     ctx.lineTo(size + 4, 0);
    //     ctx.moveTo(0, -size - 4);
    //     ctx.lineTo(0, -size + 4);
    //     ctx.moveTo(0, size - 4);
    //     ctx.lineTo(0, size + 4);
    //     ctx.stroke();

    //     ctx.fillStyle = this.isShooting ? '#e74c3c' : '#D4AF37';
    //     ctx.beginPath();
    //     ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    //     ctx.fill();

    //     ctx.restore();
    // }
    drawCrosshair(ctx, mouse) {
        if (!mouse) return;

        ctx.save();
        ctx.translate(mouse.x, mouse.y);

        const time = this.animTime;
        const baseSize = 18;
        const pulse = Math.sin(time * 5) * 2;
        const size = baseSize + pulse;
        const innerSize = 8 + pulse * 0.5;

        // Outer rotating segments
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.lineWidth = 2;

        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + time * 2;
            ctx.beginPath();
            ctx.arc(0, 0, size, angle - 0.3, angle + 0.3);
            ctx.stroke();
        }

        // Inner circle
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, innerSize, 0, Math.PI * 2);
        ctx.stroke();

        // Cross lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;

        const lineLength = 6;
        const lineGap = innerSize + 2;

        ctx.beginPath();
        // Top
        ctx.moveTo(0, -lineGap);
        ctx.lineTo(0, -lineGap - lineLength);
        // Bottom
        ctx.moveTo(0, lineGap);
        ctx.lineTo(0, lineGap + lineLength);
        // Left
        ctx.moveTo(-lineGap, 0);
        ctx.lineTo(-lineGap - lineLength, 0);
        // Right
        ctx.moveTo(lineGap, 0);
        ctx.lineTo(lineGap + lineLength, 0);
        ctx.stroke();

        // Center dot
        const dotPulse = Math.sin(time * 8) * 0.5 + 1.5;
        ctx.fillStyle = this.isShooting ? '#e74c3c' : '#FFD700';
        ctx.shadowColor = this.isShooting ? '#e74c3c' : '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 2 * dotPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}