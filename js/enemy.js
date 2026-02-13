export const EnemyTypes = {
    yaksha: {
        name: 'යක්ෂයා',
        nameEn: 'Yaksha Demon',
        health: 50,
        speed: 80,
        damage: 10,
        collisionDamage: 15,
        size: 45,
        points: 100,
        canShoot: false,
        colors: {
            primary: '#e74c3c',
            secondary: '#c0392b',
            accent: '#f39c12',
            skin: '#922B21',
            eyes: '#F4D03F'
        }
    },
    dunuhara: {
        name: 'දුනු හරය',
        nameEn: 'Demon Archer',
        health: 40,
        speed: 60,
        damage: 15,
        collisionDamage: 10,
        size: 42,
        points: 150,
        canShoot: true,
        fireRate: 2,
        colors: {
            primary: '#9b59b6',
            secondary: '#7d3c98',
            accent: '#e74c3c',
            skin: '#6C3483',
            eyes: '#E74C3C'
        }
    },
    vegaraksha: {
        name: 'වේග රාක්ෂයා',
        nameEn: 'Speed Demon',
        health: 30,
        speed: 150,
        damage: 8,
        collisionDamage: 20,
        size: 38,
        points: 120,
        canShoot: false,
        colors: {
            primary: '#3498db',
            secondary: '#2980b9',
            accent: '#1abc9c',
            skin: '#1F618D',
            eyes: '#00FFFF'
        }
    },
    maharaksha: {
        name: 'මහා රාක්ෂයා',
        nameEn: 'Giant Demon',
        health: 150,
        speed: 40,
        damage: 25,
        collisionDamage: 30,
        size: 55,
        points: 300,
        canShoot: false,
        colors: {
            primary: '#2c3e50',
            secondary: '#1a252f',
            accent: '#e74c3c',
            skin: '#17202A',
            eyes: '#E74C3C'
        }
    },
    ravana: {
        name: 'රාවණ රජු',
        nameEn: 'King Ravana',
        health: 400,
        speed: 50,
        damage: 30,
        collisionDamage: 40,
        size: 80,
        points: 1000,
        canShoot: true,
        fireRate: 1.5,
        isBoss: true,
        colors: {
            primary: '#8e44ad',
            secondary: '#5b2c6f',
            accent: '#f1c40f',
            skin: '#4A235A',
            eyes: '#FFD700',
            crown: '#F1C40F'
        }
    }
};

// Default colors fallback
const DEFAULT_COLORS = {
    primary: '#e74c3c',
    secondary: '#c0392b',
    accent: '#f39c12',
    skin: '#922B21',
    eyes: '#F4D03F'
};

export class Enemy {
    constructor(x, y, type, game) {
        if (!game) {
            console.error('Enemy: game reference is null!');
        }

        this.game = game;
        this.x = x || 0;
        this.y = y || 0;
        this.type = type || 'yaksha';

        // Get config with fallback to yaksha
        const config = EnemyTypes[this.type] || EnemyTypes.yaksha;

        this.name = config.name || 'Enemy';
        this.nameEn = config.nameEn || 'Enemy';
        this.maxHealth = config.health || 50;
        this.health = this.maxHealth;
        this.speed = config.speed || 80;
        this.baseSpeed = config.speed || 80;
        this.damage = config.damage || 10;
        this.collisionDamage = config.collisionDamage || config.damage || 10;
        this.size = config.size || 40;
        this.radius = this.size / 2;
        this.points = config.points || 100;
        this.canShoot = config.canShoot || false;
        this.fireRate = config.fireRate || 2;
        this.isBoss = config.isBoss || false;

        // Colors with fallback
        this.colors = config.colors ? { ...config.colors } : { ...DEFAULT_COLORS };
        this.color = this.colors.primary || '#e74c3c';

        // State
        this.isAlive = true;
        this.angle = 0;
        this.lastShot = 0;

        // AI behavior
        this.behaviorTimer = 0;
        this.currentBehavior = 'chase';

        this.animTime = 0;
        this.walkCycle = 0;
        this.hitFlash = 0;
        this.spawnAnimation = 1;

        this.floatingParts = [];
        this.initFloatingParts();

        this.phase = 1;
        this.headAngles = [];

        if (this.isBoss) {
            for (let i = 0; i < 10; i++) {
                this.headAngles.push(Math.random() * 0.3 - 0.15);
            }
        }
    }

    initFloatingParts() {
        // Limit floating parts to prevent memory issues
        const maxParts = this.isBoss ? 6 : (this.type === 'maharaksha' ? 4 : 3);

        this.floatingParts = [];

        for (let i = 0; i < maxParts; i++) {
            this.floatingParts.push({
                angle: (Math.PI * 2 / maxParts) * i,
                distance: this.size / 2 + 5 + Math.random() * 8,
                size: 2 + Math.random() * 3,
                speed: 0.5 + Math.random() * 0.5,
                offset: Math.random() * Math.PI * 2
            });
        }
    }

    update(dt, player) {
        // Safety checks
        if (!this.isAlive) return;
        if (!player) return;
        if (!dt || dt <= 0 || dt > 0.1) dt = 0.016;

        // Animation timers
        this.animTime += dt;
        this.walkCycle += dt * 6;

        // Spawn animation
        if (this.spawnAnimation > 0) {
            this.spawnAnimation -= dt * 2;
            return;
        }

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
        }

        // Update floating parts (simple update)
        for (let i = 0; i < this.floatingParts.length; i++) {
            const part = this.floatingParts[i];
            part.angle += part.speed * dt;
            part.offset += dt * 2;
        }

        // AI behavior
        this.updateBehavior(dt, player);
        this.move(dt, player);

        // Shooting
        if (this.canShoot) {
            this.updateShooting(dt, player);
        }

        // Boss phase
        if (this.isBoss) {
            this.updateBossPhase();
        }
    }

    updateBossPhase() {
        const healthPercent = this.health / this.maxHealth;

        if (healthPercent > 0.6) {
            this.phase = 1;
        } else if (healthPercent > 0.3) {
            this.phase = 2;
            this.speed = this.baseSpeed * 1.3;
        } else {
            this.phase = 3;
            this.speed = this.baseSpeed * 1.6;
        }
    }

    updateBehavior(dt, player) {
        this.behaviorTimer += dt;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Update angle
        if (distance > 0) {
            this.angle = Math.atan2(dy, dx);
        }

        // Behavior based on type
        switch (this.type) {
            case 'yaksha':
                this.currentBehavior = 'chase';
                break;

            case 'dunuhara':
                if (distance < 200) {
                    this.currentBehavior = 'retreat';
                } else if (distance > 350) {
                    this.currentBehavior = 'chase';
                } else {
                    this.currentBehavior = 'strafe';
                }
                break;

            case 'vegaraksha':
                if (this.behaviorTimer > 1.5) {
                    this.currentBehavior = this.currentBehavior === 'chase' ? 'circle' : 'chase';
                    this.behaviorTimer = 0;
                }
                break;

            case 'maharaksha':
                this.currentBehavior = 'chase';
                break;

            case 'ravana':
                if (this.phase === 1) {
                    this.currentBehavior = distance < 250 ? 'retreat' : 'chase';
                } else if (this.phase === 2) {
                    this.currentBehavior = 'strafe';
                } else {
                    this.currentBehavior = 'chase';
                }
                break;

            default:
                this.currentBehavior = 'chase';
        }
    }

    move(dt, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        let moveX = 0;
        let moveY = 0;

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
                moveX = -dy / distance;
                moveY = dx / distance;
                moveX += (dx / distance) * 0.3;
                moveY += (dy / distance) * 0.3;
                break;

            case 'circle':
                const circleAngle = this.angle + Math.PI / 2;
                moveX = Math.cos(circleAngle) * 0.7 + (dx / distance) * 0.3;
                moveY = Math.sin(circleAngle) * 0.7 + (dy / distance) * 0.3;
                break;

            default:
                moveX = dx / distance;
                moveY = dy / distance;
        }

        // Apply movement
        this.x += moveX * this.speed * dt;
        this.y += moveY * this.speed * dt;

        // Bounds check with safety
        if (this.game && this.game.canvas) {
            const margin = 150;
            const canvasWidth = this.game.canvas.width || 1920;
            const canvasHeight = this.game.canvas.height || 1080;

            this.x = Math.max(-margin, Math.min(canvasWidth + margin, this.x));
            this.y = Math.max(-margin, Math.min(canvasHeight + margin, this.y));
        }
    }

    updateShooting(dt, player) {
        const now = performance.now() / 1000;
        let adjustedFireRate = this.fireRate;

        // Boss shoots faster in later phases
        if (this.isBoss && this.phase >= 2) {
            adjustedFireRate = this.fireRate * 0.7;
        }

        if (now - this.lastShot >= adjustedFireRate) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 450) {
                this.shoot(player);
                this.lastShot = now;
            }
        }
    }

    shoot(player) {
        // Safety check
        if (!this.game || !this.game.enemyBullets) {
            console.warn('Enemy.shoot: game.enemyBullets not available');
            return;
        }

        // Limit enemy bullets
        if (this.game.enemyBullets.length >= 50) {
            return;
        }

        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const spread = this.isBoss ? 0.1 : 0.2;
        const finalAngle = angle + (Math.random() - 0.5) * spread;

        const bulletX = this.x + Math.cos(finalAngle) * (this.size / 2 + 5);
        const bulletY = this.y + Math.sin(finalAngle) * (this.size / 2 + 5);

        // Create bullet as simple object (no Bullet class dependency)
        const bullet = this.createBullet(bulletX, bulletY, finalAngle, this.damage);
        this.game.enemyBullets.push(bullet);

        // Boss multi-shot
        if (this.isBoss && this.phase >= 2) {
            const bulletCount = this.phase === 3 ? 4 : 2;

            for (let i = 1; i <= bulletCount; i++) {
                if (this.game.enemyBullets.length >= 50) break;

                const spreadAngle = finalAngle + (i - bulletCount / 2) * 0.2;
                const b = this.createBullet(
                    this.x + Math.cos(spreadAngle) * (this.size / 2 + 5),
                    this.y + Math.sin(spreadAngle) * (this.size / 2 + 5),
                    spreadAngle,
                    this.damage * 0.5
                );
                this.game.enemyBullets.push(b);
            }
        }
    }

    // Create bullet without external dependency
    createBullet(x, y, angle, damage) {
        const speed = 280;
        const color = this.colors.accent || '#e74c3c';

        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5,
            damage: damage,
            color: color,
            isActive: true,
            owner: 'enemy',

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
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
    }

    takeDamage(amount) {
        if (!this.isAlive) return false;

        this.health -= amount;
        this.hitFlash = 1;

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            return true; // Killed
        }

        return false; // Still alive
    }

    knockback(player) {
        if (!player) return;

        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * 25;
            this.y += (dy / distance) * 25;
        }
    }

    render(ctx) {
        if (!this.isAlive) return;
        if (!ctx) return;

        ctx.save();

        // Spawn animation
        if (this.spawnAnimation > 0) {
            ctx.globalAlpha = Math.max(0, 1 - this.spawnAnimation);
            const scale = Math.max(0.5, 2 - this.spawnAnimation);
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.filter = `brightness(${1 + this.hitFlash * 0.8})`;
        }

        // Draw based on type
        try {
            switch (this.type) {
                case 'yaksha':
                    this.drawYaksha(ctx);
                    break;
                case 'dunuhara':
                    this.drawDunuhara(ctx);
                    break;
                case 'vegaraksha':
                    this.drawVegaraksha(ctx);
                    break;
                case 'maharaksha':
                    this.drawMaharaksha(ctx);
                    break;
                case 'ravana':
                    this.drawRavana(ctx);
                    break;
                default:
                    this.drawDefault(ctx);
            }
        } catch (error) {
            console.error('Enemy render error:', error);
            this.drawDefault(ctx);
        }

        ctx.restore();

        // Health bar (outside main transform)
        if (this.health < this.maxHealth || this.isBoss) {
            this.drawHealthBar(ctx);
        }

        // Boss name
        if (this.isBoss) {
            this.drawBossName(ctx);
        }
    }

    // ===== DEFAULT FALLBACK DRAW =====
    drawDefault(ctx) {
        ctx.save();

        // Body
        ctx.fillStyle = this.color || '#e74c3c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = this.darkenColor(this.color);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = `${this.size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👹', this.x, this.y);

        ctx.restore();
    }

    // ===== YAKSHA DEMON =====
    drawYaksha(ctx) {
        const bounce = Math.sin(this.walkCycle) * 2;

        // Floating parts
        this.drawFloatingParts(ctx);

        // Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.size / 2, this.size / 2.5, this.size / 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y + bounce);

        // Body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2);
        bodyGradient.addColorStop(0, this.colors.primary);
        bodyGradient.addColorStop(0.7, this.colors.secondary);
        bodyGradient.addColorStop(1, '#1a0505');

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        ctx.fillStyle = this.colors.secondary;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + this.animTime * 0.5;
            const x = Math.cos(angle) * (this.size / 2 - 5);
            const y = Math.sin(angle) * (this.size / 2 - 5);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
            ctx.lineTo(x + Math.cos(angle + 0.4) * 6, y + Math.sin(angle + 0.4) * 6);
            ctx.closePath();
            ctx.fill();
        }

        // Eyes
        const eyeGlow = Math.sin(this.animTime * 4) * 0.2 + 0.8;
        ctx.fillStyle = this.colors.eyes;
        ctx.shadowColor = this.colors.eyes;
        ctx.shadowBlur = 8 * eyeGlow;

        ctx.beginPath();
        ctx.ellipse(-7, -5, 5, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(7, -5, 5, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5, -5, 2, 0, Math.PI * 2);
        ctx.arc(9, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 6, 8, 0.3, Math.PI - 0.3);
        ctx.stroke();

        // Fangs
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(-5, 14);
        ctx.lineTo(-3, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, 8);
        ctx.lineTo(5, 14);
        ctx.lineTo(6, 8);
        ctx.fill();

        // Horns
        ctx.fillStyle = this.colors.accent;
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.quadraticCurveTo(-18, -25, -6, -28);
        ctx.quadraticCurveTo(-8, -18, -8, -12);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10, -12);
        ctx.quadraticCurveTo(18, -25, 6, -28);
        ctx.quadraticCurveTo(8, -18, 8, -12);
        ctx.fill();

        ctx.restore();
    }

    // ===== DEMON ARCHER =====
    drawDunuhara(ctx) {
        const bounce = Math.sin(this.walkCycle) * 1.5;

        this.drawFloatingParts(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Cloak
        const cloakGradient = ctx.createLinearGradient(-this.size / 2, 0, this.size / 2, 0);
        cloakGradient.addColorStop(0, this.colors.secondary);
        cloakGradient.addColorStop(0.5, this.colors.primary);
        cloakGradient.addColorStop(1, this.colors.secondary);

        ctx.fillStyle = cloakGradient;
        ctx.beginPath();
        ctx.ellipse(-3, bounce, this.size / 2 - 3, this.size / 2 - 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hood
        ctx.fillStyle = this.colors.secondary;
        ctx.beginPath();
        ctx.arc(6, bounce, 13, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.save();
        ctx.rotate(-this.angle);

        const faceGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        faceGradient.addColorStop(0, this.colors.skin);
        faceGradient.addColorStop(1, '#1a0a1a');

        ctx.fillStyle = faceGradient;
        ctx.beginPath();
        ctx.arc(0, bounce, 10, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = this.colors.eyes;
        ctx.shadowColor = this.colors.eyes;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-3, -1 + bounce, 2.5, 0, Math.PI * 2);
        ctx.arc(3, -1 + bounce, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Bow
        ctx.strokeStyle = '#5a3000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.size / 2 - 2, 0, 14, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        // Bowstring
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size / 2 - 2 + Math.cos(-Math.PI * 0.45) * 14, Math.sin(-Math.PI * 0.45) * 14);
        ctx.lineTo(this.size / 2 - 6, 0);
        ctx.lineTo(this.size / 2 - 2 + Math.cos(Math.PI * 0.45) * 14, Math.sin(Math.PI * 0.45) * 14);
        ctx.stroke();

        // Energy arrow
        ctx.strokeStyle = this.colors.accent;
        ctx.shadowColor = this.colors.accent;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.size / 2 - 6, 0);
        ctx.lineTo(this.size / 2 + 16, 0);
        ctx.stroke();

        // Arrow tip
        ctx.fillStyle = this.colors.accent;
        ctx.beginPath();
        ctx.moveTo(this.size / 2 + 20, 0);
        ctx.lineTo(this.size / 2 + 14, -4);
        ctx.lineTo(this.size / 2 + 14, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ===== SPEED DEMON =====
    drawVegaraksha(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Speed trails
        for (let i = 3; i > 0; i--) {
            ctx.globalAlpha = 0.15 * (3 - i);
            ctx.fillStyle = this.colors.primary;
            ctx.beginPath();
            ctx.ellipse(-i * 7, 0, this.size / 2 - i * 3, this.size / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Body
        const bodyGradient = ctx.createLinearGradient(-this.size / 2, 0, this.size / 2, 0);
        bodyGradient.addColorStop(0, this.colors.secondary);
        bodyGradient.addColorStop(0.4, this.colors.primary);
        bodyGradient.addColorStop(0.8, this.colors.primary);
        bodyGradient.addColorStop(1, this.colors.accent);

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lightning bolts
        ctx.strokeStyle = this.colors.eyes;
        ctx.shadowColor = this.colors.eyes;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;

        for (let i = 0; i < 2; i++) {
            const startX = -6 + i * 10;
            ctx.beginPath();
            ctx.moveTo(startX, -6);
            ctx.lineTo(startX + 2, -1);
            ctx.lineTo(startX - 1, 1);
            ctx.lineTo(startX + 3, 6);
            ctx.stroke();
        }

        // Head
        ctx.save();
        ctx.rotate(-this.angle);

        ctx.fillStyle = this.colors.skin;
        ctx.beginPath();
        ctx.ellipse(this.size / 4, 0, 8, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Intense eyes
        ctx.fillStyle = this.colors.eyes;
        ctx.shadowColor = this.colors.eyes;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(this.size / 4 + 2, -1, 3, 1.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(this.size / 4 + 2, 1, 3, 1.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    // ===== GIANT DEMON =====
    drawMaharaksha(ctx) {
        const bounce = Math.sin(this.walkCycle * 0.4) * 3;

        this.drawFloatingParts(ctx);

        // Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.size / 2, this.size / 2.2, this.size / 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y + bounce);

        // Massive body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2);
        bodyGradient.addColorStop(0, this.colors.primary);
        bodyGradient.addColorStop(0.6, this.colors.secondary);
        bodyGradient.addColorStop(1, '#050505');

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#151515';
        ctx.strokeStyle = this.colors.accent;
        ctx.lineWidth = 2;

        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i + Math.PI / 5;
            const px = Math.cos(angle) * (this.size / 3);
            const py = Math.sin(angle) * (this.size / 3);

            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Head with helmet
        ctx.fillStyle = this.colors.skin;
        ctx.beginPath();
        ctx.arc(0, -8, 16, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#151515';
        ctx.beginPath();
        ctx.arc(0, -12, 18, Math.PI, 0);
        ctx.fill();

        // Helmet spike
        ctx.fillStyle = this.colors.accent;
        ctx.beginPath();
        ctx.moveTo(-4, -30);
        ctx.lineTo(0, -42);
        ctx.lineTo(4, -30);
        ctx.closePath();
        ctx.fill();

        // Angry eyes
        ctx.fillStyle = this.colors.eyes;
        ctx.shadowColor = this.colors.eyes;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(-7, -6, 4, 2.5, -0.15, 0, Math.PI * 2);
        ctx.ellipse(7, -6, 4, 2.5, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Tusks
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.lineTo(-12, 16);
        ctx.lineTo(-6, 6);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10, 4);
        ctx.lineTo(12, 16);
        ctx.lineTo(6, 6);
        ctx.fill();

        ctx.restore();
    }

    // ===== KING RAVANA - BOSS =====
    drawRavana(ctx) {
        const bounce = Math.sin(this.walkCycle * 0.25) * 2;
        const phaseGlow = this.phase === 3 ? 1.4 : (this.phase === 2 ? 1.15 : 1);

        // Phase aura
        const auraSize = this.size / 2 + 25 + Math.sin(this.animTime * 2.5) * 8;
        const auraGradient = ctx.createRadialGradient(this.x, this.y, this.size / 2, this.x, this.y, auraSize);

        if (this.phase === 1) {
            auraGradient.addColorStop(0, 'rgba(142, 68, 173, 0.25)');
            auraGradient.addColorStop(1, 'rgba(142, 68, 173, 0)');
        } else if (this.phase === 2) {
            auraGradient.addColorStop(0, 'rgba(231, 76, 60, 0.35)');
            auraGradient.addColorStop(1, 'rgba(231, 76, 60, 0)');
        } else {
            auraGradient.addColorStop(0, 'rgba(241, 196, 15, 0.45)');
            auraGradient.addColorStop(1, 'rgba(241, 196, 15, 0)');
        }

        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraSize, 0, Math.PI * 2);
        ctx.fill();

        // Floating parts
        this.drawFloatingParts(ctx);

        ctx.save();
        ctx.translate(this.x, this.y + bounce);

        // Royal cape
        ctx.save();
        ctx.rotate(this.angle + Math.PI);

        const capeGradient = ctx.createLinearGradient(0, 0, 0, 45);
        capeGradient.addColorStop(0, this.colors.primary);
        capeGradient.addColorStop(1, this.colors.secondary);

        ctx.fillStyle = capeGradient;
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.quadraticCurveTo(-32, 35, -18, 52 + Math.sin(this.animTime * 1.8) * 4);
        ctx.lineTo(18, 52 + Math.sin(this.animTime * 1.8 + 0.8) * 4);
        ctx.quadraticCurveTo(32, 35, 22, 8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.colors.crown || '#F1C40F';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Main body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2 - 8);
        bodyGradient.addColorStop(0, this.colors.primary);
        bodyGradient.addColorStop(0.7, this.colors.secondary);
        bodyGradient.addColorStop(1, '#100520');

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2 - 8, 0, Math.PI * 2);
        ctx.fill();

        // Armor patterns
        ctx.strokeStyle = this.colors.crown || '#F1C40F';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
            ctx.lineTo(Math.cos(angle) * (this.size / 2 - 12), Math.sin(angle) * (this.size / 2 - 12));
            ctx.stroke();
        }

        // Central gem
        const gemColor = this.phase === 3 ? '#e74c3c' : (this.colors.crown || '#F1C40F');
        ctx.fillStyle = gemColor;
        ctx.shadowColor = gemColor;
        ctx.shadowBlur = 15 * phaseGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // THE TEN HEADS
        this.drawRavanaHeads(ctx, bounce, phaseGlow);

        // Multiple arms
        this.drawRavanaArms(ctx, bounce);
    }

    drawRavanaHeads(ctx, bounce, phaseGlow) {
        ctx.save();
        ctx.translate(this.x, this.y + bounce);

        const headRadius = 10;
        const headDistance = this.size / 2 + 3;

        for (let i = 0; i < 10; i++) {
            const baseAngle = -Math.PI / 2 + (i - 4.5) * 0.32;
            const headAngle = baseAngle + (this.headAngles[i] || 0) * Math.sin(this.animTime * 1.8 + i * 0.5);
            const hx = Math.cos(headAngle) * headDistance;
            const hy = Math.sin(headAngle) * headDistance;

            ctx.save();
            ctx.translate(hx, hy);
            ctx.rotate(headAngle + Math.PI / 2);

            // Head
            const headGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, headRadius);
            headGradient.addColorStop(0, this.colors.skin);
            headGradient.addColorStop(1, this.colors.secondary);

            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
            ctx.fill();

            // Crown on center heads
            if (i === 4 || i === 5) {
                ctx.fillStyle = this.colors.crown || '#F1C40F';
                ctx.beginPath();
                ctx.moveTo(-6, -headRadius);
                ctx.lineTo(-3, -headRadius - 10);
                ctx.lineTo(0, -headRadius - 4);
                ctx.lineTo(3, -headRadius - 10);
                ctx.lineTo(6, -headRadius);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(0, -headRadius - 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Eyes
            ctx.fillStyle = this.colors.eyes;
            ctx.shadowColor = this.colors.eyes;
            ctx.shadowBlur = 8 * phaseGlow;
            ctx.beginPath();
            ctx.arc(-2.5, -1.5, 2, 0, Math.PI * 2);
            ctx.arc(2.5, -1.5, 2, 0, Math.PI * 2);
            ctx.fill();

            // Mouth
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(0, 2.5, 3, 0.2, Math.PI - 0.2);
            ctx.stroke();

            ctx.restore();
        }

        ctx.restore();
    }

    drawRavanaArms(ctx, bounce) {
        ctx.save();
        ctx.translate(this.x, this.y + bounce);

        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const armAngle = side * (0.35 + i * 0.3) + Math.sin(this.animTime * 1.5 + i) * 0.08;
                const armLength = 22 + i * 4;

                ctx.save();
                ctx.rotate(armAngle);

                // Arm
                ctx.fillStyle = this.colors.skin;
                ctx.beginPath();
                ctx.ellipse(armLength, 0, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Weapon
                if (i % 2 === 0) {
                    // Sword
                    ctx.fillStyle = '#888';
                    ctx.fillRect(armLength + 6, -1.5, 16, 3);
                    ctx.fillStyle = this.colors.crown || '#F1C40F';
                    ctx.beginPath();
                    ctx.moveTo(armLength + 22, 0);
                    ctx.lineTo(armLength + 28, -3);
                    ctx.lineTo(armLength + 28, 3);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Energy orb
                    ctx.fillStyle = this.colors.accent;
                    ctx.shadowColor = this.colors.accent;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(armLength + 12, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        ctx.restore();
    }

    // ===== HELPER METHODS =====
    drawFloatingParts(ctx) {
        for (let i = 0; i < this.floatingParts.length; i++) {
            const part = this.floatingParts[i];
            const px = this.x + Math.cos(part.angle) * part.distance;
            const py = this.y + Math.sin(part.angle) * part.distance;
            const pulse = Math.sin(part.offset) * 0.25 + 0.75;

            ctx.save();
            ctx.globalAlpha = 0.5 * pulse;
            ctx.fillStyle = this.colors.accent || '#f39c12';
            ctx.shadowColor = this.colors.accent || '#f39c12';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, part.size * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.isBoss ? 90 : this.size + 5;
        const barHeight = this.isBoss ? 8 : 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - (this.isBoss ? 20 : 12);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        // Health
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const healthColor = healthPercent > 0.5 ? '#2ecc71' :
            healthPercent > 0.25 ? '#f39c12' : '#e74c3c';

        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
    }

    drawBossName(ctx) {
        ctx.save();
        ctx.font = 'bold 14px "Noto Sans Sinhala", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.crown || '#FFD700';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name || 'රාවණ රජු', this.x, this.y - this.size / 2 - 28);
        ctx.restore();
    }

    darkenColor(color) {
        if (!color) return '#880000';

        try {
            const hex = color.replace('#', '');
            const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 35);
            const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 35);
            const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 35);
            return `rgb(${r},${g},${b})`;
        } catch (e) {
            return '#660000';
        }
    }

    lightenColor(color) {
        if (!color) return '#ff8888';

        try {
            const hex = color.replace('#', '');
            const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 35);
            const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 35);
            const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 35);
            return `rgb(${r},${g},${b})`;
        } catch (e) {
            return '#ffaaaa';
        }
    }
}