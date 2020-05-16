import config from '../config';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;
    tile = null;
    speed = 70;

    constructor(level, x, y) {
        super(level.scene, x, y, 'objects', 'man-blue-move-down.png');

        this.level = level;
        this.scene = level.scene;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this)
        
        this.setName('player');
        this.body.setSize(config.tileSize - 1, config.tileSize);
        this.setOffset(4, 5);
        this.setDisplayOrigin(4, 5);
        this.setDepth(10);

        this._addAnims();

        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keyA = this.scene.input.keyboard.addKey('A');

    }

    update() {
        this._updateTile();
        this._updateMovements();
        this._updateCollisionSliding();
    }

    _updateMovements() {
        // Stop any previous movement from the last frame
        this.body.setVelocity(0);

        // Movement
        if (this.cursors.left.isDown && this.getData('blockMovement') !== 'left') {
            this.body.setVelocityX(-this.speed);
        } else if (this.cursors.right.isDown && this.getData('blockMovement') !== 'right') {
            this.body.setVelocityX(this.speed);
        } else if (this.cursors.up.isDown && this.getData('blockMovement') !== 'up') {
            this.body.setVelocityY(-this.speed);
        } else if (this.cursors.down.isDown && this.getData('blockMovement') !== 'down') {
            this.body.setVelocityY(this.speed);
        }
        this.setData('blockMovement', null);

        // Movement animations
        if (this.cursors.left.isDown) {
            this.anims.play("man-blue-left-walk", true);
        } else if (this.cursors.right.isDown) {
            this.anims.play("man-blue-right-walk", true);
        } else if (this.cursors.up.isDown) {
            this.anims.play("man-blue-up-walk", true);
        } else if (this.cursors.down.isDown) {
            this.anims.play("man-blue-down-walk", true);
        } else {
            if (this.anims.currentAnim) {
                this.anims.setCurrentFrame(this.anims.currentAnim.frames[0]);
                this.anims.stop();
            }
        }
    }

    _updateCollisionSliding() {
        // collision sliding
        if (this.cursors.right.isDown && this.body.blocked.right) {
            const upRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y);
            const downRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y + config.tileSize - 1);

            if (!upRightTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }

        }
        if (this.cursors.left.isDown && this.body.blocked.left) {
            const upLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y);
            const downLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y + config.tileSize - 1);
            
            if (!upLeftTile.getData('bomb') && !downLeftTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }
        }
        if (this.cursors.up.isDown && this.body.blocked.up) {

            const upLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x, this.body.y - 1);
            const upRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y - 1);

            if (!upLeftTile.getData('bomb') && !upRightTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityX(-this.speed);
                } else if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityX(this.speed);
                }
            }
        }
        if (this.cursors.down.isDown && this.body.blocked.down) {
            const downLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x, this.body.y + config.tileSize + 1);
            const downRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y + config.tileSize + 1);

            if (!downLeftTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.body.setVelocityX(-this.speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.body.setVelocityX(this.speed);
                }
            }
        }
    }

    _updateTile() {
        if (this.cursors.left.isDown 
            || this.cursors.right.isDown 
            || this.cursors.up.isDown 
            || this.cursors.down.isDown
        ) {
            // update tile under player
            const tile = this.level.groundLayer.getTileAtWorldXY(
                this.body.center.x, 
                this.body.center.y
            );
            this.setData('tile', tile);
        }
    }

    getTile() {
        return this.getData('tile');
    }

    _addAnims() {
        
        if (Player.#animsLoaded) {
            return;
        }
        Player.#animsLoaded = true;

        const anims = this.scene.anims;
        
        if (! anims.exists('man-blue-left-walk')) {
            anims.create({
                key: "man-blue-left-walk",
                frames: [
                    {key: 'objects', frame: 'man-blue-move-left.png'},
                    {key: 'objects', frame: 'man-blue-move-left-anim-1.png'},
                    {key: 'objects', frame: 'man-blue-move-left.png'},
                    {key: 'objects', frame: 'man-blue-move-left-anim-2.png'},
                ],
                frameRate: 8,
                repeat: -1,
            });
        }

        
        anims.create({
            key: "man-blue-right-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-right.png'},
                {key: 'objects', frame: 'man-blue-move-right-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-right.png'},
                {key: 'objects', frame: 'man-blue-move-right-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-up-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-up.png'},
                {key: 'objects', frame: 'man-blue-move-up-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-up.png'},
                {key: 'objects', frame: 'man-blue-move-up-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-down-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-down.png'},
                {key: 'objects', frame: 'man-blue-move-down-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-down.png'},
                {key: 'objects', frame: 'man-blue-move-down-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
    }

}
