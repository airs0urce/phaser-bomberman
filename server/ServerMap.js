const fs = require('fs');
const path = require('path');

const TILE_SIZE = 16;

class ServerMap {
    constructor(mapKey) {
        const mapPath = path.join(__dirname, '..', 'src', 'maps', mapKey + '.json');
        const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

        this.width = mapData.width;   // 15
        this.height = mapData.height; // 13
        this.tileSize = TILE_SIZE;

        // Build tile ID -> properties lookup from tileset
        const tileset = mapData.tilesets[0];
        this.tileProperties = {};
        for (const tile of tileset.tiles) {
            const props = {};
            for (const p of tile.properties) {
                props[p.name] = p.value;
            }
            // tile IDs in tileset are 0-based, but in layer data they are 1-based (firstgid=1)
            this.tileProperties[tile.id + tileset.firstgid] = props;
        }

        // Decode base64 tile layer
        const groundLayer = mapData.layers.find(l => l.name === 'ground');
        const buf = Buffer.from(groundLayer.data, 'base64');
        const tileIds = [];
        for (let i = 0; i < buf.length; i += 4) {
            tileIds.push(buf.readUInt32LE(i));
        }

        // Build grid[y][x]
        this.grid = [];
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                const tileId = tileIds[y * this.width + x];
                const props = this.tileProperties[tileId] || {};
                this.grid[y][x] = {
                    name: props.name || 'ground',
                    collides: props.collides || false,
                    destructible: props.destructible || false,
                    tileSetId: props.tile_set_id || 1,
                    bomb: null,
                    fire: false,
                    bonus: null,
                    containsBonus: null,
                };
            }
        }

        // Parse player spawn positions from objects layer
        this.playerSpawns = [];
        const objectsLayer = mapData.layers.find(l => l.name === 'objects');
        if (objectsLayer) {
            for (const obj of objectsLayer.objects) {
                if (obj.type === 'player') {
                    this.playerSpawns.push({
                        name: obj.name,
                        x: Math.round(obj.x / TILE_SIZE),
                        y: Math.round(obj.y / TILE_SIZE),
                    });
                }
            }
        }
        // Sort so player1 comes first
        this.playerSpawns.sort((a, b) => a.name.localeCompare(b.name));
    }

    getTile(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return null;
        }
        return this.grid[tileY][tileX];
    }

    pixelToTile(px, py) {
        return {
            x: Math.floor(px / TILE_SIZE),
            y: Math.floor(py / TILE_SIZE),
        };
    }

    tileToPixelCenter(tileX, tileY) {
        return {
            x: tileX * TILE_SIZE + TILE_SIZE / 2,
            y: tileY * TILE_SIZE + TILE_SIZE / 2,
        };
    }
}

module.exports = ServerMap;
