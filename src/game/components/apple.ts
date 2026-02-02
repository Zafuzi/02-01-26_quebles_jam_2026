import { Point, Ticker } from "pixi.js";
import { EntitySprite } from "../../engine/Entity";
import { collideEntities } from "../../engine/Collision";
import type { Player } from "./player";
import { App, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine";

export class Apple extends EntitySprite {
    private player: Player;
    private isBeingHeld: boolean = false;

    constructor(player: Player) {
        super({
            fileName: "apple",
            position: new Point(500, 500),
            friction: new Point(0.9, 0.9),
            scale: 0.15,
            collide: true,
            debug: true,
        });

        this.player = player;
        this.sprite.anchor.set(0.5)

        this.boundTo.width = App.viewport.width / App.viewport.scale.x;
        this.boundTo.height = App.viewport.height / App.viewport.scale.y;
    }

    update = (ticker: Ticker) => {
        this.keepInBounds();

        if (collideEntities(this.player.collider, this.collider)) {
            this.isBeingHeld = true;
        }

        if (this.isBeingHeld) {
            this.position = this.player.position.add(new Point(0, -this.player.height))
            this.collide = false;
        } else {
            this.collide = true; // TODO move to an event
        }

        if (PlayerInteract.value && this.isBeingHeld) {
            console.log(PlayerInteract.value)
            this.isBeingHeld = false;
        }
    }
}