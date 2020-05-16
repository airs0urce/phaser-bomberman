import {PlayerView} from '../views/PlayerView'

export class Player extends Phaser.Events.EventEmitter {

    constructor(scene, x, y) {
        super();
        this.scene = scene;
        this.view = new PlayerView(this.scene, this, x, y);
    }

}