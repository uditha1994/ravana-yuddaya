// ============================================
// Player Class - රාවණ යෝධයා (Continued)
// ============================================

import { Bullet } from './bullet.js';

export class Player {
    constructor(x, y, game) {
        this.game = game;

        // Position
        this.x = x;
        this.y = y;
        this.spawnX = x;
        this.spawnY = y;

        // Size
        this.size = 40;
        this.radius = this.size / 2;

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

        // Special ability
        this.specialCharge = 0;
        this.maxSpecialCharge = 100;

        // Buffs
        this.hasShield = false;
        this.shieldTimer = 0;
        this.speedBoostTimer = 0;
        this.damageBoostTimer = 0;

        // Visual
        this.angle = 0;
        this.color = '#D4AF37';
        this.trailPositions = [];
        this.maxTrailLength = 10;

        // Invincibility frames
        this.invincible = false;
        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.visible = true;
    }

    update(dt, keys, mouse) {
        // Movement
        let dx = 0;
        let dy = 0;

        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Apply movement
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;

        // Keep player in bounds
        const padding = this.size / 2;
        this.x = Math.max(padding, Math.min(this.game.canvas.width - padding, this.x));
        this.y = Math.max(padding + 60, Math.min(this.game.canvas.height - padding, this.y));

        // Update angle to face mouse
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        // Update trail
        this.updateTrail();

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

        // Update invincibility
        if (this.invincible) {
            this.invincibleTimer -= dt;
            this.flashTimer += dt;

            if (this.flashTimer > 0.1) {
                this.visible = !this.visible;
                this.flashTimer = 0;
            }

            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.visible = true;
            }
        }
    }

    updateTrail() {
        this.trailPositions.unshift({ x: this.x, y: this.y });
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.pop();
        }
    }

    updateBuffs(dt) {
        // Speed boost
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            this.speed = this.baseSpeed * 1.5;
            if (this.speedBoostTimer <= 0) {
                this.speed = this.baseSpeed;
            }
        }

        // Damage boost
        if (this.damageBoostTimer > 0) {
            this.damageBoostTimer -= dt;
            this.damage = this.baseDamage * 2;
            if (this.damageBoostTimer <= 0) {
                this.damage = this.baseDamage;
            }
        }

        // Shield
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
            }
        }
    }

    canShoot() {
        const now = performance.now() / 1000;
        return !this.isReloading &&
            this.ammo > 0 &&
            (now - this.lastShot) >= this.fireRate;
    }

    shoot(targetX, targetY) {
        if (!this.canShoot()) return null;

        this.lastShot = performance.now() / 1000;
        this.ammo--;

        // Auto reload when empty
        if (this.ammo <= 0) {
            this.reload();
        }

        // Calculate bullet direction
        const angle = Math.atan2(targetY - this.y, targetX - this.x);

        // Spawn bullet at gun position
        const gunDistance = this.size / 2 + 10;
        const bulletX = this.x + Math.cos(angle) * gunDistance;
        const bulletY = this.y + Math.sin(angle) * gunDistance;

        return new Bullet(bulletX, bulletY, angle, this.damage, 'player');
    }

    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;

        this.isReloading = true;
        this.reloadProgress = 0;
    }

    takeDamage(amount) {
        if (this.invincible) return;
        if (this.hasShield) {
            this.hasShield = false;
            this.shieldTimer = 0;
            return;
        }

        this.health -= amount;
        this.health = Math.max(0, this.health);

        // Trigger invincibility frames
        this.invincible = true;
        this.invincibleTimer = 1.5;

        // Screen shake effect
        this.game.screenFlash('#ff0000');
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    applySpeedBoost() {
        this.speedBoostTimer = 10; // 10 seconds
    }

    applyDamageBoost() {
        this.damageBoostTimer = 10; // 10 seconds
    }

    applyShield() {
        this.hasShield = true;
        this.shieldTimer = 15; // 15 seconds
    }

    chargeSpecial(amount) {
        this.specialCharge = Math.min(this.maxSpecialCharge, this.specialCharge + amount);
    }

    useSpecial() {
        if (this.specialCharge >= 100) {
            this.specialCharge = 0;
            return true;
        }
        return false;
    }

    respawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.invincible = true;
        this.invincibleTimer = 3;
        this.hasShield = false;
        this.speedBoostTimer = 0;
        this.damageBoostTimer = 0;
    }

    render(ctx, mouse) {
        if (!this.visible) return;

        ctx.save();

        // Draw trail
        this.drawTrail(ctx);

        // Draw shield if active
        if (this.hasShield) {
            this.drawShield(ctx);
        }

        // Draw player body
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Main body - Lion symbol inspired
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, '#8B6914');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw weapon/arrow
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.size / 2 - 5, -3, 25, 6);

        // Arrow tip
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(this.size / 2 + 20, 0);
        ctx.lineTo(this.size / 2 + 35, -8);
        ctx.lineTo(this.size / 2 + 35, 8);
        ctx.closePath();
        ctx.fill();

        // Inner lion emblem
        ctx.fillStyle = '#800020';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-this.angle); // Counter-rotate for text
        ctx.fillText('🦁', 0, 0);

        ctx.restore();

        // Draw reload indicator
        if (this.isReloading) {
            this.drawReloadIndicator(ctx);
        }

        // Draw buff indicators
        this.drawBuffIndicators(ctx);
    }

    drawTrail(ctx) {
        if (this.trailPositions.length < 2) return;

        ctx.save();
        for (let i = 1; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const alpha = 1 - (i / this.trailPositions.length);
            const size = (this.size / 2) * (1 - i / this.trailPositions.length);

            ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawShield(ctx) {
        ctx.save();

        const time = performance.now() / 1000;
        const pulseSize = this.size / 2 + 15 + Math.sin(time * 5) * 3;

        // Outer glow
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 20;

        ctx.strokeStyle = `rgba(46, 204, 113, ${0.5 + Math.sin(time * 3) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();

        // Inner shield
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawReloadIndicator(ctx) {
        ctx.save();

        const progress = this.reloadProgress / this.reloadTime;
        const barWidth = 50;
        const barHeight = 8;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - 20;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Progress
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x, y, barWidth * progress, barHeight);

        // Border
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Reloading...', this.x, y - 5);

        ctx.restore();
    }

    drawBuffIndicators(ctx) {
        ctx.save();

        const indicators = [];
        if (this.speedBoostTimer > 0) indicators.push({ icon: '⚡', color: '#3498db' });
        if (this.damageBoostTimer > 0) indicators.push({ icon: '💥', color: '#e74c3c' });
        if (this.hasShield) indicators.push({ icon: '🛡️', color: '#2ecc71' });

        indicators.forEach((buff, index) => {
            const x = this.x - 30 + index * 25;
            const y = this.y + this.size / 2 + 15;

            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(buff.icon, x, y);
        });

        ctx.restore();
    }
}