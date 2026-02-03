import { Point, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision";
import { Entity, EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";
import { LAYERS } from "../game";

export class Pickup extends EntitySprite {
	public isBeingHeld: boolean = false;
	public dropTarget: Entity | null = null;

	constructor(options?: { dropTarget?: Entity } & EntitySpriteOptions) {
		super({
			...options,
			fileName: options?.fileName ?? "apple",
			position: options?.position ?? new Point(500, 500),
			friction: new Point(0.9, 0.9),
			scale: options?.scale ?? 0.15,
			collide: true,
			zIndex: LAYERS.pickup,
			anchor: 0.5,
		});

		if (options?.dropTarget) {
			this.dropTarget = options?.dropTarget as Entity;
		}
	}

	update = (ticker: Ticker) => {
		this.newtonian(ticker);
	};

	drop = () => {
		this.velocity.y -= 10;
		setTimeout(() => {
			this.velocity.y += 10;
		}, 100);

		if (this.dropTarget && collideEntities(this.dropTarget.collider, this.collider)) {
			this.alive = false;
			this.debug = false;
			this.collide = false;
			this.destroy();
			console.debug("Dropped", this.uid)
		}
	};
}
