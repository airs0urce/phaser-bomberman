# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Development (two servers needed)
- `npm start` — Webpack dev server on localhost:8080 (hot reload, auto-opens browser)
- `npm run server` — Game/WebSocket server on localhost:3000 (multiplayer backend)

Both must be running for multiplayer to work in development. The client on port 8080 connects WebSocket to port 3000 automatically.

### Production
- `npm run build` — Production build to `dist/bundle.min.js`
- `npm run server` — Serves `dist/` and WebSocket on port 3000 (default)
- `PORT=8080 npm run server` — Use custom port (set `PORT` env var)

In production, only the game server is needed — it serves both static files and WebSocket on the same port.

## Architecture

Bomberman II clone built with **Phaser 3.90.0** (Canvas/WebGL), bundled with **Webpack 5**. Multiplayer uses **Express + ws (WebSocket)** on a Node.js server.

### Game Configuration
- Tile size: 16x16px, grid: 15x13 tiles per map
- Canvas: 240x208px scaled 2.6x
- Controls: Arrow keys to move, Space or 'A' to place bombs. Gamepad supported.
- 12 level maps defined as Tiled JSON in `src/maps/`

### Client (`src/scripts/`)
- **Entry point:** `index.js` — creates Phaser Game, registers all 6 scenes, applies tile extensions from `modifyPhaser.js`
- **Scenes:** `WelcomeScene` -> `LevelSelectScene` -> `Map1Scene` (single-player) or `OnlineMapSelectScene` -> `OnlineLobbyScene` -> `OnlineGameScene` (multiplayer)
- **Models:** `Player.js` (movement, collision sliding, bombs), `Bomb.js` (placement, explosion, chain reactions), `Level.js` (tile management, bonus spawning, player groups)
- **Network:** `NetworkClient.js` — WebSocket client that sends input deltas and receives authoritative state

### Server (`server/`)
- **server.js** — Express HTTP + WebSocket server, room management (6-char room codes, max 2 players). Port configurable via `PORT` env var (default 3000).
- **GameRoom.js** — Server-authoritative game loop at 20Hz. Handles physics, bomb fuse (50 ticks/2.5s), fire duration (10 ticks/0.5s), player speed (68 px/s), chain explosions, multi-round support
- **ServerMap.js** — Server-side map parsing, destructible brick tracking, bonus placement (1 per 12 bricks)

### Key Patterns
- **Tile data system:** `modifyPhaser.js` extends Phaser Tiles with `setData/getData` to track bombs, bonuses, and fire per tile
- **Collision sliding:** Player.js implements corner-sliding (when blocked, checks perpendicular tiles to allow smooth movement)
- **Server-authoritative multiplayer:** Server calculates all positions/collisions; client only sends inputs and renders interpolated state
- **Bonuses:** `bonus-bomb-power` (explosion range) and `bonus-bomb-count` (simultaneous bombs)

### Assets
- `src/assets/images/atlas.png` + `atlas.json` — sprite atlas (characters, bombs, explosions)
- `src/assets/images/ground.png` — tileset
- `src/assets/audio/` — music and sound effects
