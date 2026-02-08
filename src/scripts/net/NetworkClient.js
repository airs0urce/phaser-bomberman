class NetworkClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.lastInputs = null;

        // Callbacks
        this.onRoomCreated = null;
        this.onGameStart = null;
        this.onState = null;
        this.onGameOver = null;
        this.onRoundStart = null;
        this.onDisconnect = null;
        this.onError = null;
        this.onPlayerDisconnected = null;
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(serverUrl);

            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };

            this.ws.onerror = (err) => {
                if (!this.connected) {
                    reject(err);
                }
                if (this.onError) this.onError(err);
            };

            this.ws.onclose = () => {
                this.connected = false;
                if (this.onDisconnect) this.onDisconnect();
            };

            this.ws.onmessage = (event) => {
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                this._handleMessage(msg);
            };
        });
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'room_created':
                this.playerId = msg.playerId;
                if (this.onRoomCreated) this.onRoomCreated(msg.roomId, msg.playerId);
                break;
            case 'game_start':
                this.playerId = msg.playerId;
                if (this.onGameStart) this.onGameStart(msg);
                break;
            case 'state':
                if (this.onState) this.onState(msg);
                break;
            case 'game_over':
                if (this.onGameOver) this.onGameOver(msg);
                break;
            case 'round_start':
                if (this.onRoundStart) this.onRoundStart(msg);
                break;
            case 'player_disconnected':
                if (this.onPlayerDisconnected) this.onPlayerDisconnected(msg.playerId);
                break;
            case 'error':
                if (this.onError) this.onError(msg.message);
                break;
        }
    }

    createRoom(maps) {
        this._send({ type: 'create_room', maps: maps });
    }

    joinRoom(roomId) {
        this._send({ type: 'join_room', roomId });
    }

    sendInputs(inputs) {
        // Only send when inputs change
        if (this.lastInputs &&
            this.lastInputs.up === inputs.up &&
            this.lastInputs.down === inputs.down &&
            this.lastInputs.left === inputs.left &&
            this.lastInputs.right === inputs.right &&
            this.lastInputs.bomb === inputs.bomb) {
            return;
        }
        this.lastInputs = { ...inputs };
        this._send({ type: 'input', ...inputs });
    }

    _send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

module.exports = NetworkClient;
