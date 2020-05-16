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
}



