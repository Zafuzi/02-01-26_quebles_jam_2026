import { Point, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision";
import { Entity, EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";
import { LAYERS } from "../GLOBALS";

export class Pickup extends EntitySprite {
	public isBeingHeld: boolean = false;
	public dropTarget: Entity | null = null;
	public pickupCooldownMs: number = 0;

	constructor(options?: { dropTarget?: Entity; pickupCooldownMs?: number } & EntitySpriteOptions) {
		super({
			...options,
			fileName: options?.fileName ?? "apple",
			position: options?.position ?? new Point(500, 500),
			collide: true,
			zIndex: LAYERS.pickup,
			anchor: 0.5,
		});

		if (options?.dropTarget) {
			this.dropTarget = options?.dropTarget as Entity;
		}
		if (options?.pickupCooldownMs) {
			this.pickupCooldownMs = options.pickupCooldownMs;
		}
	}

	update = (ticker: Ticker) => {
		this.updatePickupCooldown(ticker);
		this.newtonian(ticker);
	};

	checkIfInDropTarget = () => {
		return this.dropTarget ? collideEntities(this.collider, this.dropTarget?.collider) : false;
	}

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
		}
	};

	protected updatePickupCooldown(ticker: Ticker) {
		if (this.pickupCooldownMs <= 0) return;
		this.pickupCooldownMs = Math.max(0, this.pickupCooldownMs - ticker.deltaMS);
	}
}
