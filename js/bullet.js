// ============================================
// Bullet Class - ඊතල
// ============================================

export class Bullet {
    constructor(x, y, angle, damage, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.owner = owner; // 'player' or 'enemy'

        this.speed = owner === 'player' ? 600 : 350;
        this.radius = owner === 'player' ? 6 : 5;
        this.color = owner === 'player' ? '#FFD700' : '#e74c3c';

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;

        this.isActive = true;

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 8;
    }

    update(dt) {
        // Save position for trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }

        // Move bullet
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    render(ctx) {
        if (!this.isActive) return;

        ctx.save();

        // Draw trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);

            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }

            ctx.strokeStyle = this.owner === 'player'
                ? 'rgba(255, 215, 0, 0.3)'
                : 'rgba(231, 76, 60, 0.3)';
            ctx.lineWidth = this.radius * 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;

        // Draw bullet
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.owner === 'player' ? '#B8860B' : '#c0392b');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}