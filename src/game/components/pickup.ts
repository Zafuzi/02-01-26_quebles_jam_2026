import { Point, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision";
import { App } from "../../engine/Engine";
import { Entity, EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";

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
		});

		this.sprite.anchor.set(0.5);

		this.boundTo.width = App.viewport.width / App.viewport.scale.x;
		this.boundTo.height = App.viewport.height / App.viewport.scale.y;

		if (options?.dropTarget) {
			this.dropTarget = options?.dropTarget as Entity;
		}
	}

	update = (ticker: Ticker) => {
		this.newtonian(ticker);
	};

	drop = () => {
		if (this.dropTarget && collideEntities(this.dropTarget.collider, this.collider)) {
			this.alive = false;
			this.debug = false;
			this.collide = false;
			console.debug("Dropped", this.uid)
			this.destroy();
		}
	};
}
