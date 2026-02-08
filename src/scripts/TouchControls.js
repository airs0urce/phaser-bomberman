class TouchControls {
    constructor() {
        this.state = { up: false, down: false, left: false, right: false, bomb: false };
        this.enabled = false;
        this.layout = localStorage.getItem('tc-layout') || 'dpad-left';
        this.onMenuPress = null;

        this._dpadTouchId = null;
        this._bombTouchId = null;
        this._leftPanel = null;
        this._rightPanel = null;
        this._dpadEl = null;
        this._bombEl = null;
        this._swapEl = null;
        this._menuEl = null;
        this._fullscreenEl = null;
        this._iosTooltipEl = null;
        this._arrows = {};
        this._visible = false;
    }

    static isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    static _isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    static _isStandalone() {
        return window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;
    }

    init() {
        if (!TouchControls.isTouchDevice()) return;

        this.enabled = true;
        document.body.classList.add('touch-device');

        // Prevent context menu on long press
        document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        this._createDOM();
        this._applyLayout();
        this.hide(); // hidden by default until gameplay scene shows them
    }

    _createDOM() {
        const wrapper = document.getElementById('game-wrapper');

        // Left panel
        this._leftPanel = document.createElement('div');
        this._leftPanel.className = 'touch-panel';
        this._leftPanel.id = 'touch-panel-left';
        wrapper.insertBefore(this._leftPanel, wrapper.firstChild);

        // Right panel
        this._rightPanel = document.createElement('div');
        this._rightPanel.className = 'touch-panel';
        this._rightPanel.id = 'touch-panel-right';
        wrapper.appendChild(this._rightPanel);

        // D-pad
        this._dpadEl = this._createDpad();

        // Bomb button
        this._bombEl = this._createBombButton();

        // Swap button (top center)
        this._swapEl = document.createElement('div');
        this._swapEl.textContent = '⇄';
        Object.assign(this._swapEl.style, {
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            color: '#666',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '4px 12px',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            zIndex: '100',
        });
        this._swapEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._toggleLayout();
        }, { passive: false });
        wrapper.appendChild(this._swapEl);

        // Menu button (top corner)
        this._menuEl = document.createElement('div');
        this._menuEl.textContent = '✕';
        Object.assign(this._menuEl.style, {
            position: 'absolute',
            top: '8px',
            fontSize: '22px',
            color: '#666',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '4px 10px',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            zIndex: '100',
        });
        this._positionMenuButton();
        this._menuEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.onMenuPress) this.onMenuPress();
        }, { passive: false });
        wrapper.appendChild(this._menuEl);

        // Fullscreen button (hidden if already in standalone/fullscreen mode)
        if (!TouchControls._isStandalone()) {
            this._fullscreenEl = document.createElement('div');
            this._fullscreenEl.textContent = '⛶';
            Object.assign(this._fullscreenEl.style, {
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '22px',
                color: '#666',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '4px 10px',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                zIndex: '100',
            });
            this._fullscreenEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._requestFullscreen();
            }, { passive: false });
            wrapper.appendChild(this._fullscreenEl);
        }
    }

    _requestFullscreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else {
            // Fullscreen API not available (iOS Safari) — show "Add to Home Screen" tip
            this._showIOSTooltip();
        }
    }

    _showIOSTooltip() {
        if (this._iosTooltipEl) return;

        const wrapper = document.getElementById('game-wrapper');
        this._iosTooltipEl = document.createElement('div');
        Object.assign(this._iosTooltipEl.style, {
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,30,30,0.95)',
            color: '#fff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            padding: '10px 16px',
            borderRadius: '10px',
            zIndex: '200',
            textAlign: 'center',
            maxWidth: '260px',
            lineHeight: '1.4',
            whiteSpace: 'nowrap',
        });
        this._iosTooltipEl.innerHTML = 'Tap <span style="font-size:18px;vertical-align:middle">⎙</span> then <b>"Add to Home Screen"</b> for fullscreen';
        wrapper.appendChild(this._iosTooltipEl);

        setTimeout(() => {
            if (this._iosTooltipEl && this._iosTooltipEl.parentNode) {
                this._iosTooltipEl.parentNode.removeChild(this._iosTooltipEl);
                this._iosTooltipEl = null;
            }
        }, 5000);
    }

    _createDpad() {
        const dpad = document.createElement('div');
        Object.assign(dpad.style, {
            position: 'relative',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
        });

        const arrowDirs = [
            { dir: 'up',    text: '▲', top: '8px',  left: '50%', tx: '-50%', ty: '0' },
            { dir: 'down',  text: '▼', top: 'auto', left: '50%', tx: '-50%', ty: '0', bottom: '8px' },
            { dir: 'left',  text: '◀', top: '50%',  left: '8px', tx: '0',    ty: '-50%' },
            { dir: 'right', text: '▶', top: '50%',  left: 'auto', tx: '0',   ty: '-50%', right: '8px' },
        ];

        for (const a of arrowDirs) {
            const arrow = document.createElement('div');
            arrow.textContent = a.text;
            Object.assign(arrow.style, {
                position: 'absolute',
                fontSize: '28px',
                color: '#666',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
            });
            arrow.style.top = a.top;
            arrow.style.left = a.left;
            if (a.bottom) arrow.style.bottom = a.bottom;
            if (a.right) arrow.style.right = a.right;
            arrow.style.transform = `translate(${a.tx}, ${a.ty})`;
            dpad.appendChild(arrow);
            this._arrows[a.dir] = arrow;
        }

        // Center dot
        const dot = document.createElement('div');
        Object.assign(dot.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
        });
        dpad.appendChild(dot);

        dpad.addEventListener('touchstart', (e) => this._onDpadTouch(e), { passive: false });
        dpad.addEventListener('touchmove', (e) => this._onDpadTouch(e), { passive: false });
        dpad.addEventListener('touchend', (e) => this._onDpadRelease(e), { passive: false });
        dpad.addEventListener('touchcancel', (e) => this._onDpadRelease(e), { passive: false });

        return dpad;
    }

    _createBombButton() {
        const bomb = document.createElement('div');
        bomb.textContent = '💣';
        Object.assign(bomb.style, {
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '36px',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            border: '2px solid #666',
            transition: 'border-color 0.1s',
        });

        bomb.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this._bombTouchId = touch.identifier;
            this.state.bomb = true;
            bomb.style.borderColor = '#fff';
            bomb.style.background = 'rgba(255,255,255,0.25)';
        }, { passive: false });

        bomb.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this._bombTouchId) {
                    this._bombTouchId = null;
                    this.state.bomb = false;
                    bomb.style.borderColor = '#666';
                    bomb.style.background = 'rgba(255,255,255,0.1)';
                    break;
                }
            }
        }, { passive: false });

        bomb.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this._bombTouchId = null;
            this.state.bomb = false;
            bomb.style.borderColor = '#666';
            bomb.style.background = 'rgba(255,255,255,0.1)';
        }, { passive: false });

        return bomb;
    }

    _onDpadTouch(e) {
        e.preventDefault();

        // Use the first touch that's on the dpad
        let touch = null;
        if (this._dpadTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this._dpadTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
        }
        if (!touch) {
            touch = e.changedTouches[0];
            this._dpadTouchId = touch.identifier;
        }

        const rect = this._dpadEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const deadZone = 10;

        // Reset all
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;

        if (Math.abs(dx) < deadZone && Math.abs(dy) < deadZone) {
            this._highlightArrow(null);
            return;
        }

        // Only one direction at a time
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) { this.state.right = true; this._highlightArrow('right'); }
            else        { this.state.left = true;  this._highlightArrow('left'); }
        } else {
            if (dy > 0) { this.state.down = true;  this._highlightArrow('down'); }
            else        { this.state.up = true;    this._highlightArrow('up'); }
        }
    }

    _onDpadRelease(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this._dpadTouchId) {
                this._dpadTouchId = null;
                this.state.up = false;
                this.state.down = false;
                this.state.left = false;
                this.state.right = false;
                this._highlightArrow(null);
                break;
            }
        }
    }

    _highlightArrow(activeDir) {
        for (const dir of ['up', 'down', 'left', 'right']) {
            this._arrows[dir].style.color = (dir === activeDir) ? '#fff' : '#666';
        }
    }

    _toggleLayout() {
        this.layout = (this.layout === 'dpad-left') ? 'dpad-right' : 'dpad-left';
        localStorage.setItem('tc-layout', this.layout);
        this._applyLayout();
    }

    _applyLayout() {
        if (!this._leftPanel || !this._rightPanel) return;

        // Remove children from panels
        if (this._dpadEl.parentNode) this._dpadEl.parentNode.removeChild(this._dpadEl);
        if (this._bombEl.parentNode) this._bombEl.parentNode.removeChild(this._bombEl);

        if (this.layout === 'dpad-left') {
            this._leftPanel.appendChild(this._dpadEl);
            this._rightPanel.appendChild(this._bombEl);
        } else {
            this._leftPanel.appendChild(this._bombEl);
            this._rightPanel.appendChild(this._dpadEl);
        }

        this._positionMenuButton();
    }

    _positionMenuButton() {
        if (!this._menuEl) return;
        // Place menu button on the bomb side
        if (this.layout === 'dpad-left') {
            this._menuEl.style.right = '12px';
            this._menuEl.style.left = '';
        } else {
            this._menuEl.style.left = '12px';
            this._menuEl.style.right = '';
        }
    }

    show() {
        if (!this.enabled) return;
        this._visible = true;
        if (this._leftPanel) this._leftPanel.style.display = 'flex';
        if (this._rightPanel) this._rightPanel.style.display = 'flex';
        if (this._swapEl) this._swapEl.style.display = '';
        if (this._menuEl) this._menuEl.style.display = '';
        if (this._fullscreenEl) this._fullscreenEl.style.display = '';
    }

    hide() {
        if (!this.enabled) return;
        this._visible = false;
        this._resetState();
        if (this._leftPanel) this._leftPanel.style.display = 'none';
        if (this._rightPanel) this._rightPanel.style.display = 'none';
        if (this._swapEl) this._swapEl.style.display = 'none';
        if (this._menuEl) this._menuEl.style.display = 'none';
        if (this._fullscreenEl) this._fullscreenEl.style.display = 'none';
    }

    _resetState() {
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;
        this.state.bomb = false;
        this._dpadTouchId = null;
        this._bombTouchId = null;
        this._highlightArrow(null);
    }

    destroy() {
        if (this._leftPanel && this._leftPanel.parentNode) this._leftPanel.parentNode.removeChild(this._leftPanel);
        if (this._rightPanel && this._rightPanel.parentNode) this._rightPanel.parentNode.removeChild(this._rightPanel);
        if (this._swapEl && this._swapEl.parentNode) this._swapEl.parentNode.removeChild(this._swapEl);
        if (this._menuEl && this._menuEl.parentNode) this._menuEl.parentNode.removeChild(this._menuEl);
        if (this._fullscreenEl && this._fullscreenEl.parentNode) this._fullscreenEl.parentNode.removeChild(this._fullscreenEl);
        if (this._iosTooltipEl && this._iosTooltipEl.parentNode) this._iosTooltipEl.parentNode.removeChild(this._iosTooltipEl);
        this.enabled = false;
    }
}

module.exports = TouchControls;
