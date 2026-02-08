const NetworkClient = require('../net/NetworkClient');

module.exports = class OnlineLobbyScene extends Phaser.Scene {
    constructor() {
        super('OnlineLobby');
    }

    init(data) {
        this.selectedMaps = (data && data.selectedMaps) ? data.selectedMaps : [0];
        this.gameId = (data && data.gameId) ? data.gameId : null;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000');

        // Use HTML overlay for crisp text and copyable URL
        this._createOverlay();

        this.net = new NetworkClient();

        this._onResize = () => this._repositionOverlay();
        window.addEventListener('resize', this._onResize);

        this.events.on('shutdown', () => {
            this._removeOverlay();
            window.removeEventListener('resize', this._onResize);
        });
        this.events.on('destroy', () => {
            this._removeOverlay();
            window.removeEventListener('resize', this._onResize);
        });

        this._connect();
    }

    _createOverlay() {
        // Get the canvas element to match its position/size
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();

        this.overlay = document.createElement('div');
        this.overlay.id = 'online-lobby-overlay';
        Object.assign(this.overlay.style, {
            position: 'absolute',
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            zIndex: '10',
            pointerEvents: 'none',
        });

        // Status text
        this.statusEl = document.createElement('div');
        Object.assign(this.statusEl.style, {
            color: '#fff',
            fontSize: '22px',
            marginBottom: '24px',
            textAlign: 'center',
        });
        this.statusEl.textContent = 'Connecting...';
        this.overlay.appendChild(this.statusEl);

        // URL input (read-only, selectable, copyable)
        this.urlInput = document.createElement('input');
        this.urlInput.type = 'text';
        this.urlInput.readOnly = true;
        Object.assign(this.urlInput.style, {
            background: '#111',
            border: '1px solid #0f0',
            color: '#0f0',
            fontSize: '16px',
            fontFamily: 'monospace',
            padding: '8px 12px',
            textAlign: 'center',
            width: '80%',
            maxWidth: '400px',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'text',
            display: 'none',
            pointerEvents: 'auto',
        });
        this.urlInput.addEventListener('click', () => {
            this.urlInput.select();
        });
        this.overlay.appendChild(this.urlInput);

        // Copy button
        this.copyBtn = document.createElement('button');
        this.copyBtn.textContent = 'COPY LINK';
        Object.assign(this.copyBtn.style, {
            background: '#0a0',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            padding: '8px 24px',
            marginTop: '12px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'none',
            pointerEvents: 'auto',
        });
        this.copyBtn.addEventListener('click', () => {
            this.urlInput.select();
            navigator.clipboard.writeText(this.urlInput.value).then(() => {
                this.copyBtn.textContent = 'COPIED!';
                setTimeout(() => { this.copyBtn.textContent = 'COPY LINK'; }, 1500);
            });
        });
        this.overlay.appendChild(this.copyBtn);

        // Room code display (large, easy to read aloud)
        this.codeEl = document.createElement('div');
        Object.assign(this.codeEl.style, {
            color: '#0f0',
            fontSize: '36px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            letterSpacing: '6px',
            marginBottom: '8px',
            display: 'none',
            textAlign: 'center',
            pointerEvents: 'auto',
            cursor: 'pointer',
        });
        this.codeEl.title = 'Tap to copy code';
        this.codeEl.addEventListener('click', () => {
            navigator.clipboard.writeText(this.codeEl.textContent.trim()).then(() => {
                this.codeHintEl.textContent = 'Code copied!';
                setTimeout(() => { this.codeHintEl.textContent = 'Game code (tap to copy)'; }, 1500);
            });
        });
        this.overlay.appendChild(this.codeEl);

        // Code hint
        this.codeHintEl = document.createElement('div');
        Object.assign(this.codeHintEl.style, {
            color: '#888',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'none',
            textAlign: 'center',
        });
        this.codeHintEl.textContent = 'Game code (tap to copy)';
        this.overlay.appendChild(this.codeHintEl);

        // Info text
        this.infoEl = document.createElement('div');
        Object.assign(this.infoEl.style, {
            color: '#888',
            fontSize: '14px',
            marginTop: '12px',
            textAlign: 'center',
        });
        this.overlay.appendChild(this.infoEl);

        // Back button
        this.backBtn = document.createElement('button');
        this.backBtn.textContent = '[ BACK ]';
        Object.assign(this.backBtn.style, {
            background: 'none',
            border: 'none',
            color: '#f66',
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            marginTop: '32px',
            cursor: 'pointer',
            pointerEvents: 'auto',
        });
        this.backBtn.addEventListener('click', () => {
            if (this.net) this.net.disconnect();
            window.history.replaceState(null, '', '/');
            this.scene.start('LevelSelect');
        });
        this.overlay.appendChild(this.backBtn);

        document.body.appendChild(this.overlay);
    }

    _repositionOverlay() {
        if (!this.overlay) return;
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        Object.assign(this.overlay.style, {
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
        });
    }

    _removeOverlay() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    async _connect() {
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = (location.port === '8082' || location.port === '8080') ? location.hostname + ':3000' : location.host;
        const wsUrl = wsProtocol + '//' + wsHost;

        try {
            await this.net.connect(wsUrl);
        } catch (e) {
            this.statusEl.textContent = 'Connection failed!';
            this.infoEl.textContent = 'Is the server running? (npm run server)';
            return;
        }

        this.net.onGameStart = (msg) => {
            this.scene.start('OnlineGame', {
                net: this.net,
                playerId: msg.playerId,
                level: msg.level,
                bonuses: msg.bonuses,
                round: msg.round || 1,
                totalRounds: msg.totalRounds || 1,
                scores: { 1: 0, 2: 0, draws: 0 },
            });
        };

        this.net.onError = (err) => {
            this.statusEl.textContent = 'Error: ' + (typeof err === 'string' ? err : 'Connection lost');
        };

        this.net.onDisconnect = () => {
            this.statusEl.textContent = 'Disconnected';
        };

        if (this.gameId) {
            // Joining existing room via /online/<gameId> URL
            this.statusEl.textContent = 'Joining room...';
            this.net.joinRoom(this.gameId);
        } else {
            // Creating new room
            this.statusEl.textContent = 'Creating room...';
            this.net.onRoomCreated = (roomId, playerId) => {
                const shareUrl = window.location.origin + '/online/' + roomId;
                window.history.replaceState(null, '', '/online/' + roomId);
                this.statusEl.textContent = 'Waiting for opponent...';
                this.codeEl.textContent = roomId;
                this.codeEl.style.display = '';
                this.codeHintEl.style.display = '';
                this.urlInput.value = shareUrl;
                this.urlInput.style.display = '';
                this.copyBtn.style.display = '';
                this.infoEl.textContent = 'Share the code or link with your opponent';
            };
            this.net.createRoom(this.selectedMaps);
        }
    }
}
