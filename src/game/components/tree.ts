import { Point } from "pixi.js";
import { CoinFlip, EntitySprite, LocationAround, NumberInRange } from "../../engine/Engine";
import type { Entity, EntitySpriteOptions } from "../../engine/Entity";
import { envLayer } from "../GLOBALS";
import { Apple } from "./apple";
import { Egg } from "./egg";
import { Spawner } from "./spawner";

export class Tree extends EntitySprite {
	public appleSpawner: Spawner<Egg>;
	private dropTarget: Entity | undefined;

	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "tree",
			anchor: new Point(0.5, 1),
			scale: new Point(CoinFlip() ? NumberInRange(-2, -1) : NumberInRange(1, 2), NumberInRange(1, 2)),
		});

		this.dropTarget = options?.dropTarget;

		this.appleSpawner = new Spawner({
			spawn_rate: NumberInRange(0, 10_000),
			max: 2,
			spawnPoint: () => LocationAround(this.position, 10, 100),

			pickupCooldownMs: 500,
			factory: (position) => {
				return new Apple({
					position,
					layer: envLayer,
					dropTarget: this.dropTarget,
				});
			},
		});

		if (Math.round(NumberInRange(0, 10)) === 3) {
			this.appleSpawner.spawn();
		}
	}
}
