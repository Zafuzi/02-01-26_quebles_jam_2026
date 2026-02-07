import type { Ticker } from "pixi.js";
import { EntitySprite, EntityTilingSprite, type EntityTilingSpriteOptions } from "../../engine/Entity";
import { CollisionDirection } from "../../engine/Math";

export class Wall extends EntityTilingSprite {
	private collidables: EntitySprite[] = [];

	constructor(options: EntityTilingSpriteOptions) {
		super(options);
	}

	update = (ticker: Ticker) => {
		this.collidables.forEach((collidable: EntitySprite) => {
			const hit = CollisionDirection(this.collider, collidable.collider);
			if (hit) {
				collidable.collider.position.x -= hit.reverse.x;
				collidable.collider.position.y -= hit.reverse.y;
			}
		});
	};

	registerCollider(entity: EntitySprite) {
		this.collidables.push(entity);
	}
}
