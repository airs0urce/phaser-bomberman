const levels = require('../levels');

module.exports = class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelect');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000');
        const centerX = this.cameras.main.centerX;
        const registry = this.game.registry;

        // Initialize registry defaults if not set
        if (!registry.has('player1Name')) registry.set('player1Name', 'Player 1');
        if (!registry.has('player2Name')) registry.set('player2Name', 'Player 2');
        if (!registry.has('player1Wins')) registry.set('player1Wins', 0);
        if (!registry.has('player2Wins')) registry.set('player2Wins', 0);
        if (!registry.has('draws')) registry.set('draws', 0);

        const shadow = {
            offsetX: 1, offsetY: 1,
            color: '#000', blur: 0, stroke: false, fill: true
        };

        // Title
        this.add.text(centerX, 6, 'BOMBERMAN', {
            font: '16px Arial', fill: '#fff', shadow: shadow
        }).setOrigin(0.5, 0);

        // Player names (clickable)
        const p1Name = registry.get('player1Name');
        const p2Name = registry.get('player2Name');

        const p1Text = this.add.text(centerX, 30, `P1: ${p1Name}`, {
            font: '9px Arial', fill: '#6cf'
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

        const p2Text = this.add.text(centerX, 42, `P2: ${p2Name}`, {
            font: '9px Arial', fill: '#f66'
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

        p1Text.on('pointerdown', () => {
            const name = prompt('Enter Player 1 name:', registry.get('player1Name'));
            if (name && name.trim()) {
                registry.set('player1Name', name.trim());
                p1Text.setText(`P1: ${name.trim()}`);
            }
        });

        p2Text.on('pointerdown', () => {
            const name = prompt('Enter Player 2 name:', registry.get('player2Name'));
            if (name && name.trim()) {
                registry.set('player2Name', name.trim());
                p2Text.setText(`P2: ${name.trim()}`);
            }
        });

        // Click name hint
        this.add.text(centerX, 54, '(click name to edit)', {
            font: '6px Arial', fill: '#555'
        }).setOrigin(0.5, 0);

        // Scores
        const p1Wins = registry.get('player1Wins');
        const p2Wins = registry.get('player2Wins');
        const draws = registry.get('draws');

        this.scoreText = this.add.text(centerX, 66, this._scoreString(), {
            font: '8px Arial', fill: '#aaa', shadow: shadow
        }).setOrigin(0.5, 0);

        // Level grid (two columns)
        this.selectedIndex = 0;
        this.levelTexts = [];

        const colLeft = centerX - 42;
        const colRight = centerX + 42;
        const startY = 86;
        const rowHeight = 14;

        for (let i = 0; i < levels.length; i++) {
            const col = i < 6 ? colLeft : colRight;
            const row = i < 6 ? i : i - 6;
            const x = col;
            const y = startY + row * rowHeight;

            const text = this.add.text(x, y, levels[i].name, {
                font: '9px Arial', fill: '#888'
            }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

            text.on('pointerover', () => {
                this.selectedIndex = i;
                this._updateSelection();
            });
            text.on('pointerdown', () => {
                this.selectedIndex = i;
                this._startFromLevel(i);
            });

            this.levelTexts.push(text);
        }

        // Selection arrow
        this.arrow = this.add.text(0, 0, '>', {
            font: '9px Arial', fill: '#fff'
        }).setOrigin(0.5, 0);

        this._updateSelection();

        // Controls
        const cursors = this.input.keyboard.createCursorKeys();
        const enterKey = this.input.keyboard.addKey('ENTER');
        const spaceKey = this.input.keyboard.addKey('SPACE');

        this.inputReady = true;

        cursors.up.on('down', () => {
            if (!this.inputReady) return;
            this.selectedIndex = (this.selectedIndex - 1 + levels.length) % levels.length;
            this._updateSelection();
        });

        cursors.down.on('down', () => {
            if (!this.inputReady) return;
            this.selectedIndex = (this.selectedIndex + 1) % levels.length;
            this._updateSelection();
        });

        cursors.left.on('down', () => {
            if (!this.inputReady) return;
            if (this.selectedIndex >= 6) {
                this.selectedIndex -= 6;
            }
            this._updateSelection();
        });

        cursors.right.on('down', () => {
            if (!this.inputReady) return;
            if (this.selectedIndex < 6) {
                this.selectedIndex += 6;
            }
            this._updateSelection();
        });

        enterKey.on('down', () => {
            if (!this.inputReady) return;
            this._startFromLevel(this.selectedIndex);
        });

        spaceKey.on('down', () => {
            if (!this.inputReady) return;
            this._startFromLevel(this.selectedIndex);
        });
    }

    _scoreString() {
        const registry = this.game.registry;
        const p1Wins = registry.get('player1Wins') || 0;
        const p2Wins = registry.get('player2Wins') || 0;
        const draws = registry.get('draws') || 0;
        return `Wins: ${p1Wins} - ${p2Wins}  Draws: ${draws}`;
    }

    _updateSelection() {
        const colLeft = this.cameras.main.centerX - 42;
        const colRight = this.cameras.main.centerX + 42;
        const startY = 86;
        const rowHeight = 14;

        for (let i = 0; i < this.levelTexts.length; i++) {
            this.levelTexts[i].setStyle({
                fill: i === this.selectedIndex ? '#fff' : '#888'
            });
        }

        const i = this.selectedIndex;
        const col = i < 6 ? colLeft : colRight;
        const row = i < 6 ? i : i - 6;
        this.arrow.setPosition(col - 30, startY + row * rowHeight);
    }

    _startFromLevel(index) {
        if (!this.inputReady) return;
        this.inputReady = false;

        // Reset scores when starting a new game
        const registry = this.game.registry;
        registry.set('player1Wins', 0);
        registry.set('player2Wins', 0);
        registry.set('draws', 0);

        this.scene.start('Map1', { levelIndex: index });
    }
}
