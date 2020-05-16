import {
    Player
} from "../models/Player";



export class PlayerView extends Phaser.GameObjects.Sprite {

    constructor(scene, model, x, y) {
        super(scene, 0, 0, 'objects', 'man-blue-move-down.png');

        this.position = {
            x: 0,
            y: 0
        };
        this.model = null;

        this.model = model;

        this.x = this.position.x = (x * 16);
        this.y = this.position.y = (y * 16);

        this._init();
        this._create();
    }

    _init() {}

    _create() {
        this.scene.add.existing(this);
        this.setOrigin(0, 0.2);
    }


}