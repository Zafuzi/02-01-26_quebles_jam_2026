import type { Entity } from "../../engine/Entity";
import type { EntitySpriteOptions } from "../../engine/Entity";
import { CoinFlip, EntitySprite, LocationAround, NumberInRange } from "../../engine/Engine";
import { Spawner } from "./spawner";
import { Egg } from "./egg";
import { Apple } from "./apple";
import { envLayer } from "../GLOBALS";
import { Point } from "pixi.js";

export class Tree extends EntitySprite {
	public appleSpawner: Spawner<Egg>;
	private dropTarget: Entity | undefined;

	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {

		super({
			...options,
			fileName: "tree",
			anchor: new Point(0.5, 1),
			scale: new Point(CoinFlip() ? NumberInRange(-2, -1) : NumberInRange(1, 2), NumberInRange(1, 2))
		});

		this.dropTarget = options?.dropTarget;

		this.appleSpawner = new Spawner({
			spawn_rate: NumberInRange(1_000, 5_000),
			max: 2,
			spawnPoint: () => LocationAround(this.position, 10, 100),

			pickupCooldownMs: 500,
			factory: (position, spawner) => {
				spawner.spawn_rate = NumberInRange(1_000, 5_000);
				return new Apple({
					position,
					layer: envLayer,
					dropTarget: this.dropTarget,
				});
			},
		});

		if (CoinFlip()) {
			this.appleSpawner.spawn();
		}
	}
}
