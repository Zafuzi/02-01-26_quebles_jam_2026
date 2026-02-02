import { Point, Ticker } from "pixi.js";
import { App } from "../../engine/Engine";
import { EntitySprite, type EntityOptions, type EntitySpriteOptions } from "../../engine/Entity";

export class Pickup extends EntitySprite {
    public isBeingHeld: boolean = false;

    constructor(options?: EntityOptions & EntitySpriteOptions) {
        super({
            fileName: options?.fileName ?? "apple",
            position: options?.position ?? new Point(500, 500),
            friction: new Point(0.9, 0.9),
            scale: options?.scale ?? 0.15,
            collide: true,
            debug: true,
        });

        this.sprite.anchor.set(0.5)

        this.boundTo.width = App.viewport.width / App.viewport.scale.x;
        this.boundTo.height = App.viewport.height / App.viewport.scale.y;
    }

    update = (ticker: Ticker) => {
        this.newtonian(ticker);
    }

    drop = () => {
        this.velocity.y -= 10;
        setTimeout(() => {
            this.velocity.y += 10;
        }, 100);
    }
}