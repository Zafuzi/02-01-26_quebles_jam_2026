import type { Entity } from "../../engine/Entity";
import type { EntitySpriteOptions } from "../../engine/Entity";
import { CoinFlip, EntitySprite, NumberInRange } from "../../engine/Engine";
import { Spawner } from "./spawner";
import { Egg } from "./egg";
import { Apple } from "./apple";
import { pickupLayer } from "../GLOBALS";

export class Tree extends EntitySprite {
	public appleSpawner: Spawner<Egg>;
	private dropTarget: Entity | undefined;

	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "tree",
			anchor: 0.5
		});

		this.dropTarget = options?.dropTarget;

		this.appleSpawner = new Spawner({
			spawn_rate: NumberInRange(1_000, 5_000),
			max: 2,
			spawnPoint: () => ({
				x: this.x + NumberInRange(-this.width / 2, this.width / 2),
				y: this.y + this.height + NumberInRange(-20, 20),
			}),

			pickupCooldownMs: 500,
			factory: (position, spawner) => {
				spawner.spawn_rate = NumberInRange(1_000, 5_000);
				return new Apple({
					position,
					layer: pickupLayer,
					dropTarget: this.dropTarget,
				})
			},
		});

		if (CoinFlip()) {
			this.appleSpawner.spawn();
		}
	}
}
