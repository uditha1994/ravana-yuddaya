// ============================================
// Audio Manager - With File Loading
// ============================================

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.currentMusic = null;

        this.soundVolume = 0.7;
        this.musicVolume = 0.5;
        this.isMuted = false;
        this.musicMuted = false;

        this.loaded = false;
        this.loadingProgress = 0;

        // Audio context for generated sounds (fallback)
        this.audioContext = null;

        this.init();
    }

    init() {
        // Try to create audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }

        // Define sound files to load
        this.soundFiles = {
            // SFX
            shoot: 'assets/sounds/sfx/shoot.wav',
            arrowHit: 'assets/sounds/sfx/arrow-hit.wav',
            enemyShoot: 'assets/sounds/sfx/enemy-shoot.mp3',
            explosion: 'assets/sounds/sfx/explosion.wav',
            playerHurt: 'assets/sounds/sfx/player-hurt.wav',
            playerDeath: 'assets/sounds/sfx/player-death.mp3',
            powerup: 'assets/sounds/sfx/powerup-collect.wav',
            powerupHealth: 'assets/sounds/sfx/powerup-collect.wav',
            powerupShield: 'assets/sounds/sfx/powerup-collect.wav',
            reload: 'assets/sounds/sfx/reload.mp3',
            special: 'assets/sounds/sfx/special-attack.mp3',
            waveStart: 'assets/sounds/sfx/wave-start.mp3',
            levelComplete: 'assets/sounds/sfx/level-complete.mp3',
            gameOver: 'assets/sounds/sfx/game-over.mp3',
            buttonClick: 'assets/sounds/sfx/button-click.wav',
            buttonHover: 'assets/sounds/sfx/button-click.wav'
        };

        this.musicFiles = {
            menu: 'assets/sounds/music/menu-theme.mp3',
            battle: 'assets/sounds/music/battle-theme.mp3',
            boss: 'assets/sounds/music/boss-theme.mp3',
            victory: 'assets/sounds/music/victory-theme.wav'
        };

        // Load all sounds
        this.loadAllSounds();

        // Generate fallback sounds
        this.generateFallbackSounds();
    }

    async loadAllSounds() {
        const totalFiles = Object.keys(this.soundFiles).length + Object.keys(this.musicFiles).length;
        let loadedCount = 0;

        // Load SFX
        for (const [name, path] of Object.entries(this.soundFiles)) {
            try {
                await this.loadSound(name, path);
            } catch (e) {
                console.warn(`Failed to load sound: ${name}`, e);
            }
            loadedCount++;
            this.loadingProgress = (loadedCount / totalFiles) * 100;
        }

        // Load Music
        for (const [name, path] of Object.entries(this.musicFiles)) {
            try {
                await this.loadMusic(name, path);
            } catch (e) {
                console.warn(`Failed to load music: ${name}`, e);
            }
            loadedCount++;
            this.loadingProgress = (loadedCount / totalFiles) * 100;
        }

        this.loaded = true;
        console.log('✅ Audio loading complete');
    }

    loadSound(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';

            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
                resolve(audio);
            };

            audio.onerror = () => {
                reject(new Error(`Failed to load: ${path}`));
            };

            audio.src = path;
        });
    }

    loadMusic(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.loop = true;

            audio.oncanplaythrough = () => {
                this.music[name] = audio;
                resolve(audio);
            };

            audio.onerror = () => {
                reject(new Error(`Failed to load: ${path}`));
            };

            audio.src = path;
        });
    }

    // Generate procedural sounds as fallback
    generateFallbackSounds() {
        this.fallbackSounds = {
            shoot: () => this.playTone(800, 0.1, 'square'),
            arrowHit: () => this.playTone(400, 0.15, 'sawtooth'),
            enemyShoot: () => this.playTone(300, 0.1, 'square'),
            explosion: () => this.playNoise(0.3),
            playerHurt: () => this.playTone(200, 0.2, 'sawtooth'),
            powerup: () => this.playArpeggio([523, 659, 784, 1047], 0.1),
            reload: () => this.playTone(600, 0.3, 'triangle'),
            special: () => this.playArpeggio([261, 329, 392, 523, 659], 0.08),
            buttonClick: () => this.playTone(1000, 0.05, 'sine'),
            buttonHover: () => this.playTone(800, 0.03, 'sine')
        };
    }

    // Play a sound effect
    play(soundName, volume = 1) {
        if (this.isMuted) return;

        const finalVolume = this.soundVolume * volume;

        // Try to play loaded sound file
        if (this.sounds[soundName]) {
            try {
                const sound = this.sounds[soundName].cloneNode();
                sound.volume = Math.min(1, Math.max(0, finalVolume));
                sound.play().catch(e => console.warn('Sound play error:', e));
                return;
            } catch (e) {
                console.warn('Sound play error:', e);
            }
        }

        // Fallback to generated sound
        if (this.fallbackSounds[soundName]) {
            try {
                this.fallbackSounds[soundName]();
            } catch (e) {
                console.warn('Fallback sound error:', e);
            }
        }
    }

    // Play music
    playMusic(trackName, fadeIn = true) {
        if (this.musicMuted) return;

        // Stop current music
        this.stopMusic();

        const track = this.music[trackName];
        if (!track) {
            console.warn(`Music track not found: ${trackName}`);
            return;
        }

        track.volume = fadeIn ? 0 : this.musicVolume;
        track.currentTime = 0;

        track.play().then(() => {
            this.currentMusic = track;

            if (fadeIn) {
                this.fadeIn(track, this.musicVolume, 2000);
            }
        }).catch(e => {
            console.warn('Music play error:', e);
        });
    }

    // Stop music
    stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;

        if (fadeOut) {
            this.fadeOut(this.currentMusic, 1000, () => {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
                this.currentMusic = null;
            });
        } else {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    // Pause music
    pauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
    }

    // Resume music
    resumeMusic() {
        if (this.currentMusic && !this.musicMuted) {
            this.currentMusic.play().catch(e => console.warn('Resume error:', e));
        }
    }

    // Fade in
    fadeIn(audio, targetVolume, duration) {
        const startVolume = 0;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = (targetVolume - startVolume) / steps;

        let currentStep = 0;

        const fade = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(targetVolume, startVolume + volumeStep * currentStep);

            if (currentStep >= steps) {
                clearInterval(fade);
            }
        }, stepDuration);
    }

    // Fade out
    fadeOut(audio, duration, callback) {
        const startVolume = audio.volume;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = startVolume / steps;

        let currentStep = 0;

        const fade = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(0, startVolume - volumeStep * currentStep);

            if (currentStep >= steps) {
                clearInterval(fade);
                if (callback) callback();
            }
        }, stepDuration);
    }

    // Volume controls
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));

        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }

    // Mute controls
    mute() {
        this.isMuted = true;
    }

    unmute() {
        this.isMuted = false;
    }

    muteMusic() {
        this.musicMuted = true;
        this.pauseMusic();
    }

    unmuteMusic() {
        this.musicMuted = false;
        this.resumeMusic();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    toggleMuteMusic() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.pauseMusic();
        } else {
            this.resumeMusic();
        }
        return this.musicMuted;
    }

    // ============================================
    // Procedural Sound Generation (Fallback)
    // ============================================

    playTone(frequency, duration, type = 'sine') {
        if (!this.audioContext) return;
        if (this.isMuted) return;

        try {
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

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
        } catch (e) {
            console.warn('Tone generation error:', e);
        }
    }

    playNoise(duration) {
        if (!this.audioContext) return;
        if (this.isMuted) return;

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            noise.buffer = buffer;
            noise.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            gainNode.gain.setValueAtTime(this.soundVolume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );

            noise.start(this.audioContext.currentTime);
        } catch (e) {
            console.warn('Noise generation error:', e);
        }
    }

    playArpeggio(frequencies, noteDuration) {
        if (!this.audioContext) return;
        if (this.isMuted) return;

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, noteDuration * 2, 'sine');
            }, index * noteDuration * 1000);
        });
    }
}