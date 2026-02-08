const levels = require('../levels');

module.exports = class OnlineMapSelectScene extends Phaser.Scene {
    constructor() {
        super('OnlineMapSelect');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000');

        // All maps selected by default
        this.selected = new Set();
        for (let i = 0; i < levels.length; i++) {
            this.selected.add(i);
        }

        this._createOverlay();

        this._onResize = () => this._createOverlay();
        window.addEventListener('resize', this._onResize);

        this.events.on('shutdown', () => {
            this._destroyOverlay();
            window.removeEventListener('resize', this._onResize);
        });
    }

    _createOverlay() {
        this._destroyOverlay();

        const canvas = this.game.canvas;
        const container = canvas.parentElement;
        container.style.position = 'relative';

        const gameW = this.game.config.width;
        const displayW = canvas.clientWidth || canvas.offsetWidth || gameW * 3;
        const displayH = canvas.clientHeight || canvas.offsetHeight || this.game.config.height * 3;
        const scale = displayW / gameW;
        this._scale = scale;

        const overlay = document.createElement('div');
        this.overlay = overlay;
        overlay.id = 'map-select-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            top: (canvas.offsetTop || 0) + 'px',
            left: (canvas.offsetLeft || 0) + 'px',
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
            top: 10, fontSize: 14, color: '#fff', centered: true,
            shadow: true, bold: true
        });
        title.textContent = 'SELECT MAPS';

        // --- Subtitle ---
        const subtitle = this._makeEl(overlay, {
            top: 28, fontSize: 7, color: '#888', centered: true
        });
        subtitle.textContent = '(click to toggle, play selected maps in order)';

        // --- Level grid with checkboxes ---
        this.levelEls = [];
        const centerX = gameW / 2;
        const colLeft = centerX - 42;
        const colRight = centerX + 42;
        const startY = 46;
        const rowHeight = 14;

        for (let i = 0; i < levels.length; i++) {
            const col = i < 6 ? colLeft : colRight;
            const row = i < 6 ? i : i - 6;
            const y = startY + row * rowHeight;

            const el = this._makeEl(overlay, {
                left: col, top: y, fontSize: 9, color: '#0f0', interactive: true
            });
            el.textContent = this._labelFor(i);

            el.addEventListener('click', () => {
                if (this.selected.has(i)) {
                    this.selected.delete(i);
                } else {
                    this.selected.add(i);
                }
                this._updateAll();
            });

            this.levelEls.push(el);
        }

        // --- Select All / None toggle ---
        this.toggleAllEl = this._makeEl(overlay, {
            top: 136, fontSize: 8, color: '#aaa', centered: true, interactive: true
        });
        this.toggleAllEl.textContent = '[ DESELECT ALL ]';
        this.toggleAllEl.addEventListener('click', () => {
            if (this.selected.size === levels.length) {
                this.selected.clear();
            } else {
                for (let i = 0; i < levels.length; i++) {
                    this.selected.add(i);
                }
            }
            this._updateAll();
        });

        // --- Count label ---
        this.countEl = this._makeEl(overlay, {
            top: 150, fontSize: 7, color: '#888', centered: true
        });

        // --- START button ---
        this.startEl = this._makeEl(overlay, {
            top: 166, fontSize: 11, color: '#0f0', centered: true, interactive: true,
            shadow: true, bold: true
        });
        this.startEl.textContent = '[ START ]';
        this.startEl.addEventListener('click', () => {
            if (this.selected.size === 0) return;
            // Convert to sorted array of level indices
            const selectedMaps = Array.from(this.selected).sort((a, b) => a - b);
            this.scene.start('OnlineLobby', { selectedMaps });
        });

        // --- BACK button ---
        const backEl = this._makeEl(overlay, {
            top: 184, fontSize: 9, color: '#f66', centered: true, interactive: true
        });
        backEl.textContent = '[ BACK ]';
        backEl.addEventListener('click', () => {
            this.scene.start('LevelSelect');
        });

        container.appendChild(overlay);
        this._updateAll();
    }

    _labelFor(index) {
        const check = this.selected.has(index) ? '\u2713' : '\u2022';
        return `${check} ${levels[index].name}`;
    }

    _updateAll() {
        for (let i = 0; i < this.levelEls.length; i++) {
            this.levelEls[i].textContent = this._labelFor(i);
            this.levelEls[i].style.color = this.selected.has(i) ? '#0f0' : '#555';
        }

        // Toggle all label
        if (this.selected.size === levels.length) {
            this.toggleAllEl.textContent = '[ DESELECT ALL ]';
        } else {
            this.toggleAllEl.textContent = '[ SELECT ALL ]';
        }

        // Count
        this.countEl.textContent = `${this.selected.size} map${this.selected.size !== 1 ? 's' : ''} selected`;

        // START button state
        if (this.selected.size === 0) {
            this.startEl.style.color = '#333';
            this.startEl.style.cursor = 'default';
        } else {
            this.startEl.style.color = '#0f0';
            this.startEl.style.cursor = 'pointer';
        }
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
}
