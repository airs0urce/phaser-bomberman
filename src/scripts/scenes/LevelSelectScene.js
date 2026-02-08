const levels = require('../levels');

module.exports = class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelect');
    }

    create() {
        // Auto-join online game if URL matches /online/<gameId>
        const pathMatch = window.location.pathname.match(/^\/online\/([A-Za-z0-9]+)$/);
        if (pathMatch) {
            this.scene.start('OnlineLobby', { gameId: pathMatch[1] });
            return;
        }

        this.cameras.main.setBackgroundColor('#000');
        const registry = this.game.registry;

        // Initialize registry defaults if not set
        if (!registry.has('player1Wins')) registry.set('player1Wins', 0);
        if (!registry.has('player2Wins')) registry.set('player2Wins', 0);
        if (!registry.has('draws')) registry.set('draws', 0);

        this.selectedIndex = 0;
        this.inputReady = true;

        this._createOverlay();
        this._setupKeyboard();

        this._onResize = () => this._createOverlay();
        window.addEventListener('resize', this._onResize);

        this.events.on('shutdown', () => {
            this._destroyOverlay();
            this._destroyJoinOverlay();
            window.removeEventListener('resize', this._onResize);
        });
    }

    _createOverlay() {
        this._destroyOverlay();

        const canvas = this.game.canvas;
        const container = canvas.parentElement;
        container.style.position = 'relative';

        const gameW = this.game.config.width;
        const displayW = canvas.clientWidth || canvas.offsetWidth || gameW * this.game.config.zoom;
        const displayH = canvas.clientHeight || canvas.offsetHeight || this.game.config.height * this.game.config.zoom;
        const scale = displayW / gameW;
        this._scale = scale;

        const overlay = document.createElement('div');
        this.overlay = overlay;
        overlay.id = 'menu-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: displayW + 'px',
            height: displayH + 'px',
            pointerEvents: 'none',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
            userSelect: 'none',
            webkitUserSelect: 'none'
        });

        // --- Title ---
        const title = this._makeEl(overlay, {
            top: 6, fontSize: 16, color: '#fff', centered: true,
            shadow: true, bold: true, letterSpacing: 2
        });
        title.textContent = 'BOMBERMAN';

        // --- Scores ---
        this.scoreEl = this._makeEl(overlay, {
            top: 30, fontSize: 8, color: '#aaa', centered: true, shadow: true
        });
        this.scoreEl.textContent = this._scoreString();

        // --- Level grid ---
        this.levelEls = [];
        const centerX = gameW / 2;
        this._colLeft = centerX - 42;
        this._colRight = centerX + 42;
        this._startY = 46;
        this._rowHeight = 14;

        for (let i = 0; i < levels.length; i++) {
            const col = i < 6 ? this._colLeft : this._colRight;
            const row = i < 6 ? i : i - 6;
            const y = this._startY + row * this._rowHeight;

            const el = this._makeEl(overlay, {
                left: col, top: y, fontSize: 9, color: '#888', interactive: true
            });
            el.textContent = levels[i].name;

            el.addEventListener('mouseenter', () => {
                this.selectedIndex = i;
                this._updateSelection();
            });

            el.addEventListener('click', () => {
                this.selectedIndex = i;
                this._startFromLevel(i);
            });

            this.levelEls.push(el);
        }

        // --- Selection arrow ---
        this.arrowEl = this._makeEl(overlay, {
            left: 0, top: 0, fontSize: 9, color: '#fff'
        });
        this.arrowEl.textContent = '>';

        // --- Online buttons ---
        const onlineEl = this._makeEl(overlay, {
            top: 136, fontSize: 10, color: '#0f0', centered: true, interactive: true
        });
        onlineEl.textContent = '[ CREATE ONLINE GAME ]';
        onlineEl.addEventListener('click', () => {
            this.scene.start('OnlineMapSelect');
        });

        const joinEl = this._makeEl(overlay, {
            top: 152, fontSize: 10, color: '#0f0', centered: true, interactive: true
        });
        joinEl.textContent = '[ JOIN BY CODE ]';
        joinEl.addEventListener('click', () => {
            this._showJoinCodeInput();
        });

        container.appendChild(overlay);
        this._updateSelection();
    }

    _makeEl(parent, opts) {
        const el = document.createElement('div');
        const s = this._scale;
        const fontSize = Math.round(opts.fontSize * s);

        el.style.position = 'absolute';
        el.style.fontSize = fontSize + 'px';
        el.style.lineHeight = '1.2';
        el.style.color = opts.color;
        el.style.whiteSpace = 'nowrap';
        el.style.top = Math.round(opts.top * s) + 'px';

        if (opts.centered) {
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
        } else {
            el.style.left = Math.round(opts.left * s) + 'px';
            el.style.transform = 'translateX(-50%)';
        }

        if (opts.shadow) {
            const sh = Math.max(1, Math.round(s));
            el.style.textShadow = `${sh}px ${sh}px 0 #000`;
        }
        if (opts.bold) el.style.fontWeight = 'bold';
        if (opts.letterSpacing) el.style.letterSpacing = opts.letterSpacing + 'px';
        if (opts.interactive) {
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
        }

        parent.appendChild(el);
        return el;
    }

    _destroyOverlay() {
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
        this.overlay = null;
    }

    _scoreString() {
        const registry = this.game.registry;
        const p1Wins = registry.get('player1Wins') || 0;
        const p2Wins = registry.get('player2Wins') || 0;
        const draws = registry.get('draws') || 0;
        return `Blue: ${p1Wins}  Red: ${p2Wins}  Draws: ${draws}`;
    }

    _updateSelection() {
        for (let i = 0; i < this.levelEls.length; i++) {
            this.levelEls[i].style.color = i === this.selectedIndex ? '#fff' : '#888';
        }

        const i = this.selectedIndex;
        const col = i < 6 ? this._colLeft : this._colRight;
        const row = i < 6 ? i : i - 6;
        this.arrowEl.style.left = Math.round((col - 30) * this._scale) + 'px';
        this.arrowEl.style.top = Math.round((this._startY + row * this._rowHeight) * this._scale) + 'px';
    }

    _setupKeyboard() {
        const cursors = this.input.keyboard.createCursorKeys();
        const enterKey = this.input.keyboard.addKey('ENTER');
        const spaceKey = this.input.keyboard.addKey('SPACE');

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

    _showJoinCodeInput() {
        if (this._joinOverlay) return;

        const canvas = this.game.canvas;
        const container = canvas.parentElement;
        const displayW = canvas.clientWidth || canvas.offsetWidth;
        const displayH = canvas.clientHeight || canvas.offsetHeight;

        const joinOverlay = document.createElement('div');
        this._joinOverlay = joinOverlay;
        Object.assign(joinOverlay.style, {
            position: 'absolute',
            top: (canvas.offsetTop || 0) + 'px',
            left: (canvas.offsetLeft || 0) + 'px',
            width: displayW + 'px',
            height: displayH + 'px',
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            zIndex: '20',
        });

        const label = document.createElement('div');
        label.textContent = 'Enter game code:';
        Object.assign(label.style, { color: '#fff', fontSize: '20px', marginBottom: '16px' });
        joinOverlay.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 6;
        input.placeholder = 'ABC123';
        input.autocapitalize = 'characters';
        Object.assign(input.style, {
            background: '#111',
            border: '2px solid #0f0',
            color: '#0f0',
            fontSize: '28px',
            fontFamily: 'monospace',
            padding: '8px 16px',
            textAlign: 'center',
            width: '160px',
            borderRadius: '6px',
            outline: 'none',
            letterSpacing: '4px',
            textTransform: 'uppercase',
        });
        joinOverlay.appendChild(input);

        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, { display: 'flex', gap: '12px', marginTop: '16px' });

        const joinBtn = document.createElement('button');
        joinBtn.textContent = 'JOIN';
        Object.assign(joinBtn.style, {
            background: '#0a0', border: 'none', color: '#fff',
            fontSize: '16px', fontWeight: 'bold', padding: '8px 28px',
            borderRadius: '4px', cursor: 'pointer',
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'CANCEL';
        Object.assign(cancelBtn.style, {
            background: '#333', border: 'none', color: '#aaa',
            fontSize: '16px', fontWeight: 'bold', padding: '8px 20px',
            borderRadius: '4px', cursor: 'pointer',
        });

        btnRow.appendChild(joinBtn);
        btnRow.appendChild(cancelBtn);
        joinOverlay.appendChild(btnRow);

        const doJoin = () => {
            const code = input.value.trim().toUpperCase();
            if (code.length > 0) {
                this._destroyJoinOverlay();
                this.scene.start('OnlineLobby', { gameId: code });
            }
        };

        joinBtn.addEventListener('click', doJoin);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doJoin();
            if (e.key === 'Escape') this._destroyJoinOverlay();
        });
        cancelBtn.addEventListener('click', () => this._destroyJoinOverlay());

        container.appendChild(joinOverlay);
        input.focus();
    }

    _destroyJoinOverlay() {
        if (this._joinOverlay && this._joinOverlay.parentElement) {
            this._joinOverlay.parentElement.removeChild(this._joinOverlay);
        }
        this._joinOverlay = null;
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
