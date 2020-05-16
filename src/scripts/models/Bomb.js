
export default class Bomb extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;

    constructor(scene, x, y, level) {
        super(scene, x, y, 'objects', 'bomb-pending-1.png');

        this.level = level;

        scene.add.existing(this);
        scene.physics.add.existing(this, true)

        this.setDepth(1);
        this.setName('bomb');
        

        this.setData('explodeTilesLength', 2);

        level.addBomb(this);

        this._addAnims();
        this.anims.play("bomb-pending", true);
    }

    destroy() {
        super.destroy();
        this.level.removeBomb(this);
    }

    _addAnims() {
        if (Bomb.#animsLoaded) {
            return;
        }
        Bomb.#animsLoaded = true;

        const anims = this.scene.anims;

        anims.create({
            key: "bomb-pending",
            frames: [
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-2.png'},
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-2.png'},
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-3.png'},
            ],
            frameRate: 4,
            repeat: 1,
        });


        const bombExplodeFrameRate = 14;
        anims.create({
            key: "bomb-explode-center",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-center.png'},
                {key: 'objects', frame: 'bomb-explode-2-center.png'},
                {key: 'objects', frame: 'bomb-explode-3-center.png'},
                {key: 'objects', frame: 'bomb-explode-4-center.png'},
                {key: 'objects', frame: 'bomb-explode-3-center.png'},
                {key: 'objects', frame: 'bomb-explode-2-center.png'},
                {key: 'objects', frame: 'bomb-explode-1-center.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: "bomb-explode-line",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-line.png'},
                {key: 'objects', frame: 'bomb-explode-2-line.png'},
                {key: 'objects', frame: 'bomb-explode-3-line.png'},
                {key: 'objects', frame: 'bomb-explode-4-line.png'},
                {key: 'objects', frame: 'bomb-explode-3-line.png'},
                {key: 'objects', frame: 'bomb-explode-2-line.png'},
                {key: 'objects', frame: 'bomb-explode-1-line.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: "bomb-explode-tail",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-tail.png'},
                {key: 'objects', frame: 'bomb-explode-2-tail.png'},
                {key: 'objects', frame: 'bomb-explode-3-tail.png'},
                {key: 'objects', frame: 'bomb-explode-4-tail.png'},
                {key: 'objects', frame: 'bomb-explode-3-tail.png'},
                {key: 'objects', frame: 'bomb-explode-2-tail.png'},
                {key: 'objects', frame: 'bomb-explode-1-tail.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
    }

    // setTileUnderPlayer(tile) {
    //     this.tileUnderPlayer = ;
    // }
}

