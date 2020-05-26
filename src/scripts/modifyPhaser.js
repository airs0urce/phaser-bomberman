export default function(Phaser) {

    // add data management to Tile object
    Phaser.Tilemaps.Tile.prototype.setData = function(key, value) {
        if (!this.data) {
            this.data = {};
        }
        this.data[key] = value;
    }
    Phaser.Tilemaps.Tile.prototype.getData = function(key, defaultVal = null) {
        if (this.data && this.data[key]) {
            return this.data[key];
        }
        return defaultVal;
    }

    Phaser.Tilemaps.Tile.prototype.removeData = function(key) {
        delete this.data[key];
    }

    // add functions to tilemap
    
    /*
    newTileId:
            format 1: tile index
            format 2: object that matches properties of needed tile. First atched tile will be used
    */
    Phaser.Tilemaps.Tilemap.prototype.replaceTile = function(tile, newTileId, keepData = true) {
        const tileset = this.tilesets[0];

        let tileIndex = null;
        if (typeof newTileId == 'object') {
            for (let index of Object.keys(tileset.tileProperties)) {
                index = +index;

                let allFieldsMatches = true;
                for (let field of Object.keys(newTileId)) {
                    if (newTileId[field] != tileset.tileProperties[index][field]) {
                        allFieldsMatches = false;
                        break;
                    }
                }

                if (allFieldsMatches) {
                    tileIndex = index + 1;
                    break;
                }
            }
        } else {
            tileIndex = newTileId;
        }

        let data = {};
        if (keepData) {
            data = tile.data;
        }

        this.removeTile(tile, tileIndex);
        const newTile = this.getTileAt(tile.x, tile.y);
        newTile.properties = tileset.tileProperties[tileIndex - 1];
        newTile.data = data;
    }

}



