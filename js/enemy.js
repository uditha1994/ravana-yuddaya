// ============================================
// Enemy Classes - යක්ෂ සතුරන්
// ============================================

import { Bullet } from './bullet.js';

// Enemy type configurations
export const EnemyTypes = {
    // Basic enemy - යක්ෂයා (Yaksha)
    yaksha: {
        name: 'යක්ෂයා',
        nameEn: 'Yaksha',
        health: 50,
        speed: 80,
        damage: 10,
        collisionDamage: 15,
        size: 35,
        color: '#e74c3c',
        points: 100,
        canShoot: false
    },

    // Archer enemy - දුනු හරය (Archer Demon)
    dunuhara: {
        name: 'දුනු හරය',
        nameEn: 'Demon Archer',
        health: 40,
        speed: 60,
        damage: 15,
        collisionDamage: 10,
        size: 32,
        color: '#9b59b6',
        points: 150,
        canShoot: true,
        fireRate: 2
    },

    // Fast enemy - වේග රාක්ෂයා (Speed Demon)
    vegaraksha: {
        name: 'වේග රාක්ෂයා',
        nameEn: 'Speed Demon',
        health: 30,
        speed: 180,
        damage: 8,
        collisionDamage: 20,
        size: 28,
        color: '#3498db',
        points: 120,
        canShoot: false
    },

    // Tank enemy - මහා රාක්ෂයා (Giant Demon)
    maharaksha: {
        name: 'මහා රාක්ෂයා',
        nameEn: 'Giant Demon',
        health: 150,
        speed: 40,
        damage: 25,
        collisionDamage: 30,
        size: 55,
        color: '#2c3e50',
        points: 300,
        canShoot: false
    },

    // Boss enemy - රාවණ රජු (King Ravana)
    ravana: {
        name: 'රාවණ රජු',
        nameEn: 'King Ravana',
        health: 500,
        speed: 50,
        damage: 30,
        collisionDamage: 40,
        size: 70,
        color: '#8e44ad',
        points: 1000,
        canShoot: true,
        fireRate: 1,
        isBoss: true
    }
};

export class Enemy {
    constructor(x, y, type, game) {
        this.game = game;

        // Get type configuration
        const config = EnemyTypes[type] || EnemyTypes.yaksha;

        // Position
        this.x = x;
        this.y = y;

        // Copy all config properties
        this.type = type;
        this.name = config.name;
        this.nameEn = config.nameEn;
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.speed = config.speed;
        this.damage = config.damage;
        this.collisionDamage = config.collisionDamage;
        this.size = config.size;
        this.radius = this.size / 2;
        this.color = config.color;
        this.points = config.points;
        this.canShoot = config.canShoot;
        this.fireRate = config.fireRate || 2;
        this.isBoss = config.isBoss || false;

        // State
        this.isAlive = true;
        this.angle = 0;
        this.lastShot = 0;

        // AI behavior
        this.behaviorTimer = 0;
        this.currentBehavior = 'chase';
        this.targetX = x;
        this.targetY = y;

        // Visual effects
        this.hitFlash = 0;
        this.spawnAnimation = 1;
    }

    update(dt, player) {
        if (!this.isAlive || !player) return;

        // Spawn animation
        if (this.spawnAnimation > 0) {
            this.spawnAnimation -= dt * 2;
            return;
        }

        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 5;
        }

        // Update behavior
        this.updateBehavior(dt, player);

        // Move towards target
        this.move(dt, player);

        // Shooting
        if (this.canShoot) {
            this.updateShooting(dt, player);
        }
    }

    updateBehavior(dt, player) {
        this.behaviorTimer += dt;

        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Update angle to face player
        this.angle = Math.atan2(dy, dx);

        // Behavior switching based on type
        switch (this.type) {
            case 'yaksha':
                // Simple chase behavior
                this.currentBehavior = 'chase';
                break;

            case 'dunuhara':
                // Keep distance and shoot
                if (distance < 200) {
                    this.currentBehavior = 'retreat';
                } else if (distance > 400) {
                    this.currentBehavior = 'chase';
                } else {
                    this.currentBehavior = 'strafe';
                }
                break;

            case 'vegaraksha':
                // Dash attack pattern
                if (this.behaviorTimer > 2) {
                    this.currentBehavior = this.currentBehavior === 'chase' ? 'circle' : 'chase';
                    this.behaviorTimer = 0;
                }
                break;

            case 'maharaksha':
                // Slow but steady
                this.currentBehavior = 'chase';
                break;

            case 'ravana':
                // Boss pattern - multiple phases
                if (this.health > this.maxHealth * 0.6) {
                    this.currentBehavior = distance < 300 ? 'retreat' : 'chase';
                } else if (this.health > this.maxHealth * 0.3) {
                    this.currentBehavior = 'strafe';
                    this.speed = EnemyTypes.ravana.speed * 1.5;
                } else {
                    this.currentBehavior = 'chase';
                    this.speed = EnemyTypes.ravana.speed * 2;
                }
                break;
        }
    }

    move(dt, player) {
        let moveX = 0;
        let moveY = 0;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        switch (this.currentBehavior) {
            case 'chase':
                moveX = dx / distance;
                moveY = dy / distance;
                break;

            case 'retreat':
                moveX = -dx / distance;
                moveY = -dy / distance;
                break;

            case 'strafe':
                // Move perpendicular to player
                moveX = -dy / distance;
                moveY = dx / distance;
                // Slowly approach
                moveX += (dx / distance) * 0.3;
                moveY += (dy / distance) * 0.3;
                break;

            case 'circle':
                // Circle around player
                const circleAngle = this.angle + Math.PI / 2;
                moveX = Math.cos(circleAngle) * 0.8 + (dx / distance) * 0.2;
                moveY = Math.sin(circleAngle) * 0.8 + (dy / distance) * 0.2;
                break;
        }

        // Apply movement
        this.x += moveX * this.speed * dt;
        this.y += moveY * this.speed * dt;

        // Keep in bounds (with some margin for offscreen spawning)
        const margin = 100;
        this.x = Math.max(-margin, Math.min(this.game.canvas.width + margin, this.x));
        this.y = Math.max(-margin, Math.min(this.game.canvas.height + margin, this.y));
    }

    updateShooting(dt, player) {
        const now = performance.now() / 1000;

        if (now - this.lastShot >= this.fireRate) {
            // Check if player is in range
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 500) {
                this.shoot(player);
                this.lastShot = now;
            }
        }
    }

    shoot(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        // Add some inaccuracy
        const spread = this.isBoss ? 0.1 : 0.2;
        const finalAngle = angle + (Math.random() - 0.5) * spread;

        const bulletX = this.x + Math.cos(finalAngle) * (this.size / 2 + 5);
        const bulletY = this.y + Math.sin(finalAngle) * (this.size / 2 + 5);

        const bullet = new Bullet(bulletX, bulletY, finalAngle, this.damage, 'enemy');
        bullet.color = this.color;
        bullet.speed = 300;

        this.game.enemyBullets.push(bullet);

        // Boss fires multiple bullets
        if (this.isBoss && this.health < this.maxHealth * 0.5) {
            for (let i = -2; i <= 2; i++) {
                if (i === 0) continue;
                const spreadAngle = finalAngle + i * 0.2;
                const b = new Bullet(
                    this.x + Math.cos(spreadAngle) * (this.size / 2 + 5),
                    this.y + Math.sin(spreadAngle) * (this.size / 2 + 5),
                    spreadAngle,
                    this.damage * 0.5,
                    'enemy'
                );
                b.color = this.color;
                b.speed = 250;
                this.game.enemyBullets.push(b);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitFlash = 1;

        if (this.health <= 0) {
            this.isAlive = false;
            return true; // Enemy killed
        }
        return false;
    }

    knockback(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * 30;
            this.y += (dy / distance) * 30;
        }
    }

    render(ctx) {
        if (!this.isAlive) return;

        ctx.save();

        // Spawn animation
        if (this.spawnAnimation > 0) {
            ctx.globalAlpha = 1 - this.spawnAnimation;
            const scale = 2 - this.spawnAnimation;
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        }

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw glow for boss
        if (this.isBoss) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 30;
        }

        // Main body
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2);

        if (this.hitFlash > 0) {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, this.color);
        } else {
            gradient.addColorStop(0, this.lightenColor(this.color, 30));
            gradient.addColorStop(0.7, this.color);
            gradient.addColorStop(1, this.darkenColor(this.color, 30));
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : this.darkenColor(this.color, 20);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Enemy type indicator
        ctx.rotate(-this.angle);
        this.drawTypeIndicator(ctx);

        ctx.restore();

        // Draw health bar for bosses and damaged enemies
        if (this.isBoss || this.health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }

        // Draw name for boss
        if (this.isBoss) {
            this.drawBossName(ctx);
        }
    }

    drawTypeIndicator(ctx) {
        ctx.font = `${this.size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const icons = {
            yaksha: '👹',
            dunuhara: '🏹',
            vegaraksha: '💨',
            maharaksha: '👺',
            ravana: '👑'
        };

        ctx.fillText(icons[this.type] || '👹', 0, 0);
    }

    drawHealthBar(ctx) {
        const barWidth = this.isBoss ? 100 : this.size + 10;
        const barHeight = this.isBoss ? 12 : 6;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - (this.isBoss ? 25 : 15);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#2ecc71' :
            healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawBossName(ctx) {
        ctx.save();
        ctx.font = 'bold 16px "Noto Sans Sinhala", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, this.x, this.y - this.size / 2 - 40);
        ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R},${G},${B})`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R},${G},${B})`;
    }
}