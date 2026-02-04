import { Point, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision";
import { Entity, EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";
import { LAYERS } from "../GLOBALS";
import { Clamp, Distance } from "../../engine/Math";

export class Pickup extends EntitySprite {
	public isBeingHeld: boolean = false;
	public dropTarget: Entity | null = null;
	public pickupCooldownMs: number = 0;
	private alphaTarget: number = 1;
	public movement: null | ((...args: any[]) => void) = null;

	constructor(options?: { dropTarget?: Entity; pickupCooldownMs?: number } & EntitySpriteOptions) {
		super({
			...options,
			fileName: options?.fileName ?? "apple",
			position: options?.position ?? new Point(500, 500),
			collide: true,
			zIndex: LAYERS.pickup,
			anchor: 0.5,
			alpha: 1,
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

		if (this.movement) {
			this.movement(ticker);
		} else {
			this.newtonian(ticker);
		}

		if (this.alpha !== this.alphaTarget) {
			this.alpha -= 0.01;
			this.alpha = Clamp(this.alpha, 0, 1);
		}

		if (this.alpha === this.alphaTarget && !this.collide) {
			console.log("die")
			this.alive = false;
			this.debug = false;
			this.destroy();
		}
	};

	checkIfInDropTarget = () => {
		return this.dropTarget ? collideEntities(this.collider, this.dropTarget?.collider) : false;
	}

	drop = () => {
		if (this.dropTarget && collideEntities(this.dropTarget.collider, this.collider)) {
			this.alphaTarget = 0;
			this.collide = false;
		}
	};

	protected updatePickupCooldown(ticker: Ticker) {
		if (this.pickupCooldownMs <= 0) return;
		this.pickupCooldownMs = Math.max(0, this.pickupCooldownMs - ticker.deltaMS);
	}
}
