// ============================================
// Level Configuration - මට්ටම් සැකසුම්
// ============================================

export const LEVELS = [
    // Level 1 - සීගිරිය (Sigiriya)
    {
        id: 1,
        name: 'Sigiriya',
        nameSinhala: 'සීගිරිය',
        description: 'The ancient rock fortress',
        descriptionSinhala: 'පැරණි ගල් බලකොටුව',
        difficulty: 'easy',
        backgroundColor: '#1a1a2e',
        waves: [
            {
                enemies: [
                    { type: 'yaksha', count: 3, delay: 500 }
                ]
            },
            {
                enemies: [
                    { type: 'yaksha', count: 5, delay: 400 }
                ]
            },
            {
                enemies: [
                    { type: 'yaksha', count: 4, delay: 300 },
                    { type: 'vegaraksha', count: 2, delay: 800 }
                ]
            },
            {
                enemies: [
                    { type: 'yaksha', count: 6, delay: 300 },
                    { type: 'dunuhara', count: 2, delay: 1000 }
                ]
            },
            {
                enemies: [
                    { type: 'yaksha', count: 5, delay: 250 },
                    { type: 'vegaraksha', count: 3, delay: 600 },
                    { type: 'dunuhara', count: 2, delay: 1200 }
                ]
            }
        ]
    },

    // Level 2 - අනුරාධපුරය (Anuradhapura)
    {
        id: 2,
        name: 'Anuradhapura',
        nameSinhala: 'අනුරාධපුරය',
        description: 'The sacred city',
        descriptionSinhala: 'පුද බිම',
        difficulty: 'medium',
        backgroundColor: '#1a2e1a',
        waves: [
            {
                enemies: [
                    { type: 'yaksha', count: 5, delay: 400 },
                    { type: 'dunuhara', count: 2, delay: 600 }
                ]
            },
            {
                enemies: [
                    { type: 'vegaraksha', count: 4, delay: 500 },
                    { type: 'yaksha', count: 3, delay: 300 }
                ]
            },
            {
                enemies: [
                    { type: 'dunuhara', count: 4, delay: 800 },
                    { type: 'vegaraksha', count: 3, delay: 400 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 1, delay: 0 },
                    { type: 'yaksha', count: 5, delay: 400 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 2, delay: 1000 },
                    { type: 'dunuhara', count: 3, delay: 600 },
                    { type: 'vegaraksha', count: 4, delay: 400 }
                ]
            }
        ]
    },

    // Level 3 - පොළොන්නරුව (Polonnaruwa)
    {
        id: 3,
        name: 'Polonnaruwa',
        nameSinhala: 'පොළොන්නරුව',
        description: 'The medieval capital',
        descriptionSinhala: 'මධ්‍යකාලීන අගනුවර',
        difficulty: 'medium',
        backgroundColor: '#2e1a1a',
        waves: [
            {
                enemies: [
                    { type: 'dunuhara', count: 4, delay: 500 },
                    { type: 'yaksha', count: 4, delay: 300 }
                ]
            },
            {
                enemies: [
                    { type: 'vegaraksha', count: 5, delay: 400 },
                    { type: 'dunuhara', count: 3, delay: 700 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 2, delay: 1500 },
                    { type: 'yaksha', count: 6, delay: 300 }
                ]
            },
            {
                enemies: [
                    { type: 'dunuhara', count: 5, delay: 600 },
                    { type: 'vegaraksha', count: 4, delay: 400 },
                    { type: 'maharaksha', count: 1, delay: 0 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 3, delay: 2000 },
                    { type: 'dunuhara', count: 4, delay: 500 },
                    { type: 'vegaraksha', count: 5, delay: 300 }
                ]
            }
        ]
    },

    // Level 4 - මහනුවර (Kandy)
    {
        id: 4,
        name: 'Kandy',
        nameSinhala: 'මහනුවර',
        description: 'The hill capital',
        descriptionSinhala: 'කන්ද උඩරට අගනුවර',
        difficulty: 'hard',
        backgroundColor: '#1a1a1a',
        waves: [
            {
                enemies: [
                    { type: 'vegaraksha', count: 6, delay: 300 },
                    { type: 'dunuhara', count: 4, delay: 500 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 2, delay: 1000 },
                    { type: 'dunuhara', count: 5, delay: 400 },
                    { type: 'yaksha', count: 5, delay: 250 }
                ]
            },
            {
                enemies: [
                    { type: 'vegaraksha', count: 8, delay: 250 },
                    { type: 'maharaksha', count: 2, delay: 1500 }
                ]
            },
            {
                enemies: [
                    { type: 'dunuhara', count: 6, delay: 400 },
                    { type: 'maharaksha', count: 3, delay: 1000 },
                    { type: 'vegaraksha', count: 4, delay: 300 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 4, delay: 1500 },
                    { type: 'dunuhara', count: 6, delay: 400 },
                    { type: 'vegaraksha', count: 6, delay: 300 },
                    { type: 'yaksha', count: 8, delay: 200 }
                ]
            }
        ]
    },

    // Level 5 - රාවණ ගුහාව (Ravana Cave) - Boss Level
    {
        id: 5,
        name: 'Ravana Cave',
        nameSinhala: 'රාවණ ගුහාව',
        description: 'The final battle',
        descriptionSinhala: 'අවසන් සටන',
        difficulty: 'boss',
        backgroundColor: '#2e1a2e',
        waves: [
            {
                enemies: [
                    { type: 'yaksha', count: 8, delay: 200 },
                    { type: 'dunuhara', count: 4, delay: 400 }
                ]
            },
            {
                enemies: [
                    { type: 'vegaraksha', count: 6, delay: 300 },
                    { type: 'maharaksha', count: 2, delay: 1000 },
                    { type: 'dunuhara', count: 4, delay: 500 }
                ]
            },
            {
                enemies: [
                    { type: 'maharaksha', count: 4, delay: 1000 },
                    { type: 'vegaraksha', count: 8, delay: 250 }
                ]
            },
            {
                enemies: [
                    { type: 'dunuhara', count: 6, delay: 400 },
                    { type: 'yaksha', count: 10, delay: 200 },
                    { type: 'maharaksha', count: 3, delay: 1200 }
                ]
            },
            // Final wave - Boss fight!
            {
                enemies: [
                    { type: 'ravana', count: 1, delay: 0 },
                    { type: 'dunuhara', count: 4, delay: 2000 },
                    { type: 'vegaraksha', count: 4, delay: 3000 }
                ]
            }
        ]
    }
];

// Level Manager Class
export class LevelManager {
    constructor() {
        this.currentLevel = 0;
        this.unlockedLevels = this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem('ravanaGameProgress');
        if (saved) {
            return JSON.parse(saved);
        }
        return [1]; // Only first level unlocked by default
    }

    saveProgress() {
        localStorage.setItem('ravanaGameProgress', JSON.stringify(this.unlockedLevels));
    }

    unlockLevel(level) {
        if (!this.unlockedLevels.includes(level)) {
            this.unlockedLevels.push(level);
            this.saveProgress();
        }
    }

    isLevelUnlocked(level) {
        return this.unlockedLevels.includes(level);
    }

    getLevel(levelId) {
        return LEVELS.find(l => l.id === levelId);
    }

    completeLevel(levelId) {
        const nextLevel = levelId + 1;
        if (nextLevel <= LEVELS.length) {
            this.unlockLevel(nextLevel);
        }
    }
}