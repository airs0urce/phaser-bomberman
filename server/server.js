const http = require('http');
const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const GameRoom = require('./GameRoom');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use('/src', express.static(path.join(__dirname, '..', 'src')));

// Serve the game for /online/:gameId routes (client-side routing)
app.get('/online/:gameId', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

wss.on('connection', (ws) => {
    let assignedRoom = null;
    let assignedPlayerId = null;

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            return;
        }

        if (msg.type === 'create_room') {
            const maps = msg.maps || [msg.level || 0];
            let roomId;
            do {
                roomId = generateRoomId();
            } while (rooms.has(roomId));

            const room = new GameRoom(roomId, maps);
            rooms.set(roomId, room);

            assignedRoom = room;
            assignedPlayerId = 1;
            room.addClient(1, ws);

            ws.send(JSON.stringify({
                type: 'room_created',
                roomId,
                playerId: 1,
            }));

        } else if (msg.type === 'join_room') {
            const room = rooms.get(msg.roomId);
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                return;
            }
            if (room.clients[2]) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
                return;
            }
            if (room.gameOver) {
                ws.send(JSON.stringify({ type: 'error', message: 'Game already finished' }));
                return;
            }

            assignedRoom = room;
            assignedPlayerId = 2;
            room.addClient(2, ws);

            // Send game_start to both players
            const startMsg = {
                type: 'game_start',
                level: room.mapQueue[0],
                bonuses: room.bonusMap,
                round: 1,
                totalRounds: room.mapQueue.length,
            };

            room.clients[1].send(JSON.stringify({ ...startMsg, playerId: 1 }));
            room.clients[2].send(JSON.stringify({ ...startMsg, playerId: 2 }));

            // Start the game loop
            room.start();

        } else if (msg.type === 'input' && assignedRoom && assignedPlayerId) {
            assignedRoom.setInputs(assignedPlayerId, {
                up: !!msg.up,
                down: !!msg.down,
                left: !!msg.left,
                right: !!msg.right,
                bomb: !!msg.bomb,
            });
        }
    });

    ws.on('close', () => {
        if (assignedRoom && assignedPlayerId) {
            assignedRoom.handleDisconnect(assignedPlayerId);

            // Clean up room after 30 seconds
            setTimeout(() => {
                if (rooms.has(assignedRoom.roomId)) {
                    assignedRoom.stop();
                    rooms.delete(assignedRoom.roomId);
                }
            }, 30000);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Bomberman server running on http://localhost:${PORT}`);
});
