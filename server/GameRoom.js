const ServerMap = require('./ServerMap');
const levels = require('../src/scripts/levels');

const TILE_SIZE = 16;
const TICK_RATE = 20; // Hz
const TICK_MS = 1000 / TICK_RATE;
const PLAYER_SPEED = 68; // px/sec
const BOMB_FUSE_TICKS = Math.round(2.5 * TICK_RATE); // 2.5 seconds = 50 ticks
const FIRE_DURATION_TICKS = Math.round(0.5 * TICK_RATE); // 0.5 seconds = 10 ticks
const BODY_W = TILE_SIZE - 1; // 15
const BODY_H = TILE_SIZE;     // 16
const BOMB_BLOCK_DISTANCE = 8;

let nextBombId = 1;

class GameRoom {
    constructor(roomId, maps) {
        this.roomId = roomId;
        this.mapQueue = maps;
        this.currentRoundIndex = 0;
        this.scores = { 1: 0, 2: 0, draws: 0 };
        this.levelIndex = maps[0];

        const level = levels[maps[0]];
        this.map = new ServerMap(level.mapKey);

        this.players = {};
        this.bombs = [];
        this.fires = [];  // { tileX, tileY, ticksLeft }
        this.tick = 0;
        this.interval = null;
        this.gameOver = false;
        this.clients = {};  // playerId -> ws

        // Track destroyed bricks and revealed/collected/exploded bonuses for state broadcast
        this.destroyedBricks = [];
        this.revealedBonuses = [];
        this.collectedBonuses = [];
        this.explodedBonuses = []; // bonuses destroyed by explosions

        this._placeBonuses();
        this._initPlayers();
    }

    _initPlayers() {
        const spawns = this.map.playerSpawns;
        // Player 1
        if (spawns.length >= 1) {
            this.players[1] = {
                x: spawns[0].x * TILE_SIZE,
                y: spawns[0].y * TILE_SIZE,
                dir: 'down',
                alive: true,
                bombPower: 2,
                bombsMax: 2,
                inputs: { up: false, down: false, left: false, right: false, bomb: false },
                prevBombInput: false,
                blockMovement: null,
                overlappingBombs: new Set(), // bomb IDs the player is currently standing on
            };
        }
        // Player 2
        if (spawns.length >= 2) {
            this.players[2] = {
                x: spawns[1].x * TILE_SIZE,
                y: spawns[1].y * TILE_SIZE,
                dir: 'down',
                alive: true,
                bombPower: 2,
                bombsMax: 2,
                inputs: { up: false, down: false, left: false, right: false, bomb: false },
                prevBombInput: false,
                blockMovement: null,
                overlappingBombs: new Set(),
            };
        }
    }

    _placeBonuses() {
        const brickTiles = [];
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.grid[y][x].name === 'bricks') {
                    brickTiles.push({ x, y });
                }
            }
        }

        const count = Math.round(brickTiles.length / 12);
        const shuffled = brickTiles.slice().sort(() => Math.random() - 0.5);

        this.bonusMap = {}; // "x,y" -> type
        let idx = 0;
        for (let i = 0; i < count && idx < shuffled.length; i++, idx++) {
            const pos = shuffled[idx];
            this.map.grid[pos.y][pos.x].containsBonus = 'bonus-bomb-power';
            this.bonusMap[`${pos.x},${pos.y}`] = 'bonus-bomb-power';
        }
        for (let i = 0; i < count && idx < shuffled.length; i++, idx++) {
            const pos = shuffled[idx];
            this.map.grid[pos.y][pos.x].containsBonus = 'bonus-bomb-count';
            this.bonusMap[`${pos.x},${pos.y}`] = 'bonus-bomb-count';
        }
    }

    addClient(playerId, ws) {
        this.clients[playerId] = ws;
    }

    setInputs(playerId, inputs) {
        const p = this.players[playerId];
        if (p && p.alive) {
            p.inputs = inputs;
        }
    }

    start() {
        this.interval = setInterval(() => this._tick(), TICK_MS);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this._gameOverTimeout) {
            clearTimeout(this._gameOverTimeout);
            this._gameOverTimeout = null;
        }
    }

    _tick() {
        if (this.gameOver) return;
        this.tick++;

        const dt = 1 / TICK_RATE;

        // 1. Move players
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;
            this._movePlayer(p, dt);
        }

        // 1b. Update bomb overlap tracking — remove bombs the player has walked off
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;
            for (const bombId of p.overlappingBombs) {
                const bomb = this.bombs.find(b => b.id === bombId);
                if (!bomb || bomb.exploded) {
                    p.overlappingBombs.delete(bombId);
                    continue;
                }
                // Check if player body still overlaps this bomb tile
                const bLeft = bomb.tileX * TILE_SIZE;
                const bRight = bLeft + TILE_SIZE;
                const bTop = bomb.tileY * TILE_SIZE;
                const bBottom = bTop + TILE_SIZE;
                const pRight = p.x + BODY_W;
                const pBottom = p.y + BODY_H;
                if (p.x >= bRight || pRight <= bLeft || p.y >= bBottom || pBottom <= bTop) {
                    // No longer overlapping — bomb becomes solid for this player
                    p.overlappingBombs.delete(bombId);
                }
            }
        }

        // 2. Check bomb placement
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;
            this._checkBombPlacement(pid, p);
        }

        // 3. Update bombs
        this._updateBombs();

        // 4. Update fires
        this._updateFires();

        // 5. Check fire kills
        this._checkFireKills();

        // 6. Check bonus pickups
        this._checkBonusPickups();

        // 7. Check bomb blocking
        this._checkBombBlocking();

        // 8. Check game over
        this._checkGameOver();

        // 9. Broadcast state
        this._broadcastState();
    }

    _movePlayer(p, dt) {
        const inputs = p.inputs;
        let vx = 0, vy = 0;

        // Direction priority: left > right > up > down (matching original)
        if (inputs.left && p.blockMovement !== 'left') {
            vx = -PLAYER_SPEED;
        } else if (inputs.right && p.blockMovement !== 'right') {
            vx = PLAYER_SPEED;
        } else if (inputs.up && p.blockMovement !== 'up') {
            vy = -PLAYER_SPEED;
        } else if (inputs.down && p.blockMovement !== 'down') {
            vy = PLAYER_SPEED;
        }
        p.blockMovement = null;

        // Update direction for animation
        if (inputs.left) p.dir = 'left';
        else if (inputs.right) p.dir = 'right';
        else if (inputs.up) p.dir = 'up';
        else if (inputs.down) p.dir = 'down';

        // Apply movement
        let newX = p.x + vx * dt;
        let newY = p.y + vy * dt;

        // AABB collision with tile grid
        // Player body: at (x, y) with size BODY_W x BODY_H
        newX = this._collideX(p, newX, p.y);
        newY = this._collideY(p, newX, newY);

        // Collision sliding — apply slide then re-check collision on the slid axis
        if (vx > 0 && newX === p.x) {
            const slidY = this._slideWhenBlocked(newX, p.y, 'right', inputs);
            newY = this._collideY(p, newX, slidY);
        } else if (vx < 0 && newX === p.x) {
            const slidY = this._slideWhenBlocked(newX, p.y, 'left', inputs);
            newY = this._collideY(p, newX, slidY);
        } else if (vy < 0 && newY === p.y) {
            const slidX = this._slideWhenBlocked(p.x, newY, 'up', inputs);
            newX = this._collideX(p, slidX, newY);
        } else if (vy > 0 && newY === p.y) {
            const slidX = this._slideWhenBlocked(p.x, newY, 'down', inputs);
            newX = this._collideX(p, slidX, newY);
        }

        p.x = newX;
        p.y = newY;
    }

    _isSolidForPlayer(tile, p) {
        if (!tile) return false;
        if (tile.collides) return true;
        // Bomb is solid ONLY if the player is NOT currently overlapping it
        if (tile.bomb && !p.overlappingBombs.has(tile.bomb.id)) return true;
        return false;
    }

    _collideX(p, newX, y) {
        const bodyLeft = newX;
        const bodyRight = newX + BODY_W - 1;
        const bodyTop = y;
        const bodyBottom = y + BODY_H - 1;

        const tileLeft = Math.floor(bodyLeft / TILE_SIZE);
        const tileRight = Math.floor(bodyRight / TILE_SIZE);
        const tileTop = Math.floor(bodyTop / TILE_SIZE);
        const tileBottom = Math.floor(bodyBottom / TILE_SIZE);

        for (let ty = tileTop; ty <= tileBottom; ty++) {
            for (let tx = tileLeft; tx <= tileRight; tx++) {
                const tile = this.map.getTile(tx, ty);
                if (this._isSolidForPlayer(tile, p)) {
                    if (newX < p.x) {
                        newX = (tx + 1) * TILE_SIZE;
                    } else if (newX > p.x) {
                        newX = tx * TILE_SIZE - BODY_W;
                    }
                }
            }
        }
        return newX;
    }

    _collideY(p, x, newY) {
        const bodyLeft = x;
        const bodyRight = x + BODY_W - 1;
        const bodyTop = newY;
        const bodyBottom = newY + BODY_H - 1;

        const tileLeft = Math.floor(bodyLeft / TILE_SIZE);
        const tileRight = Math.floor(bodyRight / TILE_SIZE);
        const tileTop = Math.floor(bodyTop / TILE_SIZE);
        const tileBottom = Math.floor(bodyBottom / TILE_SIZE);

        for (let ty = tileTop; ty <= tileBottom; ty++) {
            for (let tx = tileLeft; tx <= tileRight; tx++) {
                const tile = this.map.getTile(tx, ty);
                if (this._isSolidForPlayer(tile, p)) {
                    if (newY < p.y) {
                        newY = (ty + 1) * TILE_SIZE;
                    } else if (newY > p.y) {
                        newY = ty * TILE_SIZE - BODY_H;
                    }
                }
            }
        }
        return newY;
    }

    _slideWhenBlocked(x, y, dir, inputs) {
        // Collision sliding: when blocked, nudge player toward tile-aligned position
        // to help them enter corridors. Uses clamped movement to avoid overshoot.
        const bodyLeft = x;
        const bodyRight = x + BODY_W - 1;
        const bodyTop = y;
        const bodyBottom = y + BODY_H - 1;
        const bodyCenterX = x + BODY_W / 2;
        const bodyCenterY = y + BODY_H / 2;
        const maxSlide = PLAYER_SPEED / TICK_RATE;

        // Helper: move 'from' toward 'target' by at most 'maxStep'
        const approach = (from, target, maxStep) => {
            const diff = target - from;
            if (Math.abs(diff) <= maxStep) return target;
            return from + Math.sign(diff) * maxStep;
        };

        if ((dir === 'right' || dir === 'left') && inputs[dir]) {
            const checkX = dir === 'right' ? bodyRight + 1 : bodyLeft - 1;
            const checkTileX = Math.floor(checkX / TILE_SIZE);
            const midTile = this.map.getTile(checkTileX, Math.floor(bodyCenterY / TILE_SIZE));
            if (midTile && !midTile.bomb) {
                const upTile = this.map.getTile(checkTileX, Math.floor(bodyTop / TILE_SIZE));
                const downTile = this.map.getTile(checkTileX, Math.floor(bodyBottom / TILE_SIZE));
                if (upTile && !upTile.bomb && downTile && !downTile.bomb) {
                    // Target Y: align body to the tile row where the opening is
                    const targetTileY = Math.floor(bodyCenterY / TILE_SIZE);
                    const targetY = targetTileY * TILE_SIZE;
                    if (upTile.name === 'ground' && !upTile.collides) {
                        return approach(y, targetY, maxSlide);
                    } else if (downTile.name === 'ground' && !downTile.collides) {
                        return approach(y, targetY, maxSlide);
                    }
                }
            }
        } else if ((dir === 'up' || dir === 'down') && inputs[dir]) {
            const checkY = dir === 'up' ? bodyTop - 1 : bodyBottom + 1;
            const checkTileY = Math.floor(checkY / TILE_SIZE);
            const midTile = this.map.getTile(Math.floor(bodyCenterX / TILE_SIZE), checkTileY);
            if (midTile && !midTile.bomb) {
                const leftTile = this.map.getTile(Math.floor(bodyLeft / TILE_SIZE), checkTileY);
                const rightTile = this.map.getTile(Math.floor(bodyRight / TILE_SIZE), checkTileY);
                if (leftTile && !leftTile.bomb && rightTile && !rightTile.bomb) {
                    // Target X: align body to the tile column where the opening is
                    const targetTileX = Math.floor(bodyCenterX / TILE_SIZE);
                    const targetX = targetTileX * TILE_SIZE;
                    if (leftTile.name === 'ground' && !leftTile.collides) {
                        return approach(x, targetX, maxSlide);
                    } else if (rightTile.name === 'ground' && !rightTile.collides) {
                        return approach(x, targetX, maxSlide);
                    }
                }
            }
        }

        // Return unchanged coordinate
        return (dir === 'up' || dir === 'down') ? x : y;
    }

    _checkBombPlacement(pid, p) {
        // Edge-trigger: only place bomb on transition from false to true
        if (p.inputs.bomb && !p.prevBombInput) {
            const centerX = p.x + BODY_W / 2;
            const centerY = p.y + BODY_H / 2;
            const tileX = Math.floor(centerX / TILE_SIZE);
            const tileY = Math.floor(centerY / TILE_SIZE);
            const tile = this.map.getTile(tileX, tileY);

            if (tile && !tile.bomb) {
                // Check bomb count limit
                const activeBombs = this.bombs.filter(b => b.ownerId === pid && !b.exploded);
                if (activeBombs.length < p.bombsMax) {
                    const bomb = {
                        id: nextBombId++,
                        tileX,
                        tileY,
                        timer: BOMB_FUSE_TICKS,
                        ownerId: pid,
                        bombPower: p.bombPower,
                        exploded: false,
                    };
                    this.bombs.push(bomb);
                    tile.bomb = bomb;
                    // Player is standing on this bomb — skip collision until they walk off
                    p.overlappingBombs.add(bomb.id);
                }
            }
        }
        p.prevBombInput = p.inputs.bomb;
    }

    _updateBombs() {
        for (const bomb of this.bombs) {
            if (bomb.exploded) continue;
            bomb.timer--;
            if (bomb.timer <= 0) {
                this._explodeBomb(bomb);
            }
        }
        // Remove fully expired bombs (exploded and fire done)
        this.bombs = this.bombs.filter(b => !b.removed);
    }

    _explodeBomb(bomb) {
        if (bomb.exploded) return;
        bomb.exploded = true;

        const tile = this.map.getTile(bomb.tileX, bomb.tileY);
        if (tile) tile.bomb = null;

        // Center fire
        this._addFire(bomb.tileX, bomb.tileY, 'center', 'none');

        // 4 directions
        const dirNames = ['top', 'bottom', 'left', 'right'];
        const dirs = [
            { dx: 0, dy: -1 }, // top
            { dx: 0, dy: 1 },  // bottom
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 },  // right
        ];

        for (let d = 0; d < dirs.length; d++) {
            const dir = dirs[d];
            const dirName = dirNames[d];
            for (let i = 1; i <= bomb.bombPower; i++) {
                const tx = bomb.tileX + dir.dx * i;
                const ty = bomb.tileY + dir.dy * i;
                const t = this.map.getTile(tx, ty);
                if (!t) break;

                if (t.name === 'wall') break;

                if (t.name === 'bricks') {
                    this._destroyBrick(tx, ty, t);
                    break;
                }

                if (t.bomb) {
                    // Chain reaction
                    this._explodeBomb(t.bomb);
                    break;
                }

                if (t.bonus) {
                    // Destroy bonus and stop explosion (matches original behavior)
                    this.explodedBonuses.push({ tileX: tx, tileY: ty });
                    t.bonus = null;
                    this.revealedBonuses = this.revealedBonuses.filter(
                        b => !(b.tileX === tx && b.tileY === ty)
                    );
                    break;
                }

                const isTail = (i === bomb.bombPower);
                this._addFire(tx, ty, isTail ? 'tail' : 'line', dirName);
            }
        }

        // Mark bomb for removal after fire duration
        setTimeout(() => { bomb.removed = true; }, FIRE_DURATION_TICKS * TICK_MS);
    }

    _addFire(tileX, tileY, fireType, fireDir) {
        // Check if fire already exists at this tile
        const existing = this.fires.find(f => f.tileX === tileX && f.tileY === tileY);
        if (existing) {
            existing.ticksLeft = FIRE_DURATION_TICKS;
            return;
        }
        this.fires.push({ tileX, tileY, ticksLeft: FIRE_DURATION_TICKS, fireType, fireDir });
        const tile = this.map.getTile(tileX, tileY);
        if (tile) tile.fire = true;
    }

    _updateFires() {
        for (const fire of this.fires) {
            fire.ticksLeft--;
        }
        const expired = this.fires.filter(f => f.ticksLeft <= 0);
        for (const f of expired) {
            const tile = this.map.getTile(f.tileX, f.tileY);
            if (tile) tile.fire = false;
        }
        this.fires = this.fires.filter(f => f.ticksLeft > 0);
    }

    _destroyBrick(tileX, tileY, tile) {
        const tileSetId = tile.tileSetId;
        tile.name = 'ground';
        tile.collides = false;
        tile.destructible = false;

        this.destroyedBricks.push({ tileX, tileY, tileSetId });

        // Check for bonus
        if (tile.containsBonus) {
            tile.bonus = tile.containsBonus;
            this.revealedBonuses.push({ tileX, tileY, type: tile.containsBonus });
            tile.containsBonus = null;
        }
    }

    _checkFireKills() {
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;

            const centerX = p.x + BODY_W / 2;
            const centerY = p.y + BODY_H / 2;

            // Check with a smaller overlap area (matching safePlayerOverlapPx = 6)
            const safeOverlap = 6;
            const pLeft = p.x + safeOverlap;
            const pRight = p.x + BODY_W - safeOverlap;
            const pTop = p.y + safeOverlap;
            const pBottom = p.y + BODY_H - safeOverlap;

            for (const fire of this.fires) {
                const fLeft = fire.tileX * TILE_SIZE;
                const fRight = fLeft + TILE_SIZE;
                const fTop = fire.tileY * TILE_SIZE;
                const fBottom = fTop + TILE_SIZE;

                if (pLeft < fRight && pRight > fLeft && pTop < fBottom && pBottom > fTop) {
                    p.alive = false;
                    break;
                }
            }
        }
    }

    _checkBonusPickups() {
        const bonusOverlap = 6;
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;

            // Player body bounds with overlap shrink
            const pLeft = p.x + bonusOverlap;
            const pRight = p.x + BODY_W - bonusOverlap;
            const pTop = p.y + bonusOverlap;
            const pBottom = p.y + BODY_H - bonusOverlap;

            for (const bonus of this.revealedBonuses) {
                const bLeft = bonus.tileX * TILE_SIZE + bonusOverlap;
                const bRight = bonus.tileX * TILE_SIZE + TILE_SIZE - bonusOverlap;
                const bTop = bonus.tileY * TILE_SIZE + bonusOverlap;
                const bBottom = bonus.tileY * TILE_SIZE + TILE_SIZE - bonusOverlap;

                if (pLeft < bRight && pRight > bLeft && pTop < bBottom && pBottom > bTop) {
                    const tile = this.map.getTile(bonus.tileX, bonus.tileY);
                    if (tile && tile.bonus) {
                        if (tile.bonus === 'bonus-bomb-power') {
                            p.bombPower += 1;
                        } else if (tile.bonus === 'bonus-bomb-count') {
                            p.bombsMax += 1;
                        }
                        this.collectedBonuses.push({ tileX: bonus.tileX, tileY: bonus.tileY, playerId: pid });
                        tile.bonus = null;
                    }
                }
            }
            // Remove collected from revealed
            this.revealedBonuses = this.revealedBonuses.filter(b => {
                const tile = this.map.getTile(b.tileX, b.tileY);
                return tile && tile.bonus;
            });
        }
    }

    _checkBombBlocking() {
        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p || !p.alive) continue;

            const pCenterX = p.x + BODY_W / 2;
            const pCenterY = p.y + BODY_H / 2;

            for (const bomb of this.bombs) {
                if (bomb.exploded) continue;

                const bx = bomb.tileX * TILE_SIZE + TILE_SIZE / 2 - 1;
                const by = bomb.tileY * TILE_SIZE + TILE_SIZE / 2;

                // Check if player overlaps bomb tile
                const bLeft = bomb.tileX * TILE_SIZE;
                const bRight = bLeft + TILE_SIZE;
                const bTop = bomb.tileY * TILE_SIZE;
                const bBottom = bTop + TILE_SIZE;

                if (p.x < bRight && p.x + BODY_W > bLeft && p.y < bBottom && p.y + BODY_H > bTop) {
                    const dist = Math.sqrt((pCenterX - bx) ** 2 + (pCenterY - by) ** 2);
                    if (dist >= BOMB_BLOCK_DISTANCE) {
                        if (pCenterX === bx) {
                            p.blockMovement = pCenterY > by ? 'up' : 'down';
                        }
                        if (pCenterY === by) {
                            p.blockMovement = pCenterX > bx ? 'left' : 'right';
                        }
                    }
                }
            }
        }
    }

    _checkGameOver() {
        const alivePlayers = [1, 2].filter(pid => this.players[pid] && this.players[pid].alive);

        if (alivePlayers.length <= 1) {
            // Wait a bit for both to potentially die simultaneously
            if (!this._gameOverTimeout) {
                this._gameOverTimeout = setTimeout(() => {
                    const alive = [1, 2].filter(pid => this.players[pid] && this.players[pid].alive);
                    const winner = alive.length === 1 ? alive[0] : 0;
                    const reason = alive.length === 0 ? 'draw' : 'kill';

                    // Update scores
                    if (winner === 0) {
                        this.scores.draws++;
                    } else {
                        this.scores[winner]++;
                    }

                    const isLastRound = this.currentRoundIndex >= this.mapQueue.length - 1;

                    this.gameOver = true;
                    this.stop();

                    this._broadcast({
                        type: 'game_over',
                        winner,
                        reason,
                        scores: { ...this.scores },
                        round: this.currentRoundIndex + 1,
                        totalRounds: this.mapQueue.length,
                        matchOver: isLastRound,
                    });

                    // If more rounds, start next after delay
                    if (!isLastRound) {
                        this._nextRoundTimeout = setTimeout(() => {
                            this._startNextRound();
                        }, 4000);
                    }
                }, 500);
            }
        }
    }

    _startNextRound() {
        this.currentRoundIndex++;
        const levelIndex = this.mapQueue[this.currentRoundIndex];
        this.levelIndex = levelIndex;
        const level = levels[levelIndex];

        // Reset game state
        this.map = new ServerMap(level.mapKey);
        this.bombs = [];
        this.fires = [];
        this.tick = 0;
        this.gameOver = false;
        this._gameOverTimeout = null;
        this.destroyedBricks = [];
        this.revealedBonuses = [];
        this.collectedBonuses = [];
        this.explodedBonuses = [];

        this._placeBonuses();
        this._initPlayers();

        // Notify clients of new round
        this._broadcast({
            type: 'round_start',
            level: levelIndex,
            bonuses: this.bonusMap,
            round: this.currentRoundIndex + 1,
            totalRounds: this.mapQueue.length,
            scores: { ...this.scores },
        });

        // Restart game loop
        this.start();
    }

    _broadcastState() {
        const state = {
            type: 'state',
            tick: this.tick,
            players: {},
            bombs: [],
            fires: [],
            destroyedBricks: this.destroyedBricks,
            revealedBonuses: this.revealedBonuses,
            collectedBonuses: this.collectedBonuses,
            explodedBonuses: this.explodedBonuses,
        };

        for (const pid of [1, 2]) {
            const p = this.players[pid];
            if (!p) continue;
            state.players[pid] = {
                x: Math.round(p.x * 100) / 100,
                y: Math.round(p.y * 100) / 100,
                dir: p.dir,
                alive: p.alive,
                bombPower: p.bombPower,
                bombsMax: p.bombsMax,
            };
        }

        for (const bomb of this.bombs) {
            if (bomb.removed) continue;
            state.bombs.push({
                id: bomb.id,
                tileX: bomb.tileX,
                tileY: bomb.tileY,
                timer: bomb.timer,
                ownerId: bomb.ownerId,
                exploded: bomb.exploded,
            });
        }

        for (const fire of this.fires) {
            state.fires.push({
                tileX: fire.tileX, tileY: fire.tileY,
                fireType: fire.fireType, fireDir: fire.fireDir,
            });
        }

        this._broadcast(state);
    }

    _broadcast(msg) {
        const data = JSON.stringify(msg);
        for (const pid of [1, 2]) {
            const ws = this.clients[pid];
            if (ws && ws.readyState === 1) { // WebSocket.OPEN
                ws.send(data);
            }
        }
    }

    handleDisconnect(playerId) {
        const otherPlayer = playerId === 1 ? 2 : 1;
        this._broadcast({
            type: 'player_disconnected',
            playerId,
        });

        // Cancel any pending next round
        if (this._nextRoundTimeout) {
            clearTimeout(this._nextRoundTimeout);
            this._nextRoundTimeout = null;
        }

        if (!this.gameOver) {
            // Award remaining rounds to the other player
            const remainingRounds = this.mapQueue.length - this.currentRoundIndex;
            this.scores[otherPlayer] = (this.scores[otherPlayer] || 0) + remainingRounds;

            this.gameOver = true;
            this._broadcast({
                type: 'game_over',
                winner: otherPlayer,
                reason: 'disconnect',
                scores: { ...this.scores },
                round: this.currentRoundIndex + 1,
                totalRounds: this.mapQueue.length,
                matchOver: true,
            });
            this.stop();
        }
    }
}

module.exports = GameRoom;
