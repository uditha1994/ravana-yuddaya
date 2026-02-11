// ============================================
// Audio Manager - ශබ්ද කළමනාකරු
// ============================================

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.soundVolume = 0.7;
        this.musicVolume = 0.5;
        this.isMuted = false;

        this.init();
    }

    init() {
        // Create audio context for Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Generate procedural sounds (since we don't have audio files)
        this.generateSounds();
    }

    generateSounds() {
        // Generate shoot sound
        this.sounds.shoot = this.createOscillatorSound(800, 0.1, 'square');
        this.sounds.shootEnemy = this.createOscillatorSound(400, 0.1, 'sawtooth');

        // Generate hit sound
        this.sounds.hit = this.createNoiseSound(0.1);

        // Generate explosion sound
        this.sounds.explosion = this.createExplosionSound();

        // Generate powerup sound
        this.sounds.powerup = this.createPowerupSound();

        // Generate damage sound
        this.sounds.damage = this.createOscillatorSound(200, 0.2, 'sawtooth');
    }

    createOscillatorSound(frequency, duration, type = 'sine') {
        return () => {
            if (this.isMuted) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                frequency / 2,
                this.audioContext.currentTime + duration
            );

            gainNode.gain.setValueAtTime(this.soundVolume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    createNoiseSound(duration) {
        return () => {
            if (this.isMuted) return;

            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            whiteNoise.buffer = buffer;
            whiteNoise.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            gainNode.gain.setValueAtTime(this.soundVolume * 0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );

            whiteNoise.start(this.audioContext.currentTime);
        };
    }

    createExplosionSound() {
        return () => {
            if (this.isMuted) return;

            const duration = 0.3;

            // Low rumble
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                20,
                this.audioContext.currentTime + duration
            );

            gainNode.gain.setValueAtTime(this.soundVolume * 0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);

            // Add noise
            this.createNoiseSound(0.2)();
        };
    }

    createPowerupSound() {
        return () => {
            if (this.isMuted) return;

            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

                    gainNode.gain.setValueAtTime(this.soundVolume * 0.2, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.01,
                        this.audioContext.currentTime + 0.2
                    );

                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                }, index * 100);
            });
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            try {
                // Resume audio context if suspended (required for some browsers)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                this.sounds[soundName]();
            } catch (e) {
                console.warn('Audio play error:', e);
            }
        }
    }

    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    mute() {
        this.isMuted = true;
    }

    unmute() {
        this.isMuted = false;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}