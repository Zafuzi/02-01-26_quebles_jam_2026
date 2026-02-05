import type { Entity } from "../../engine/Entity";
import type { EntitySpriteOptions } from "../../engine/Entity";
import { Pickup } from "./pickup";

export class Egg extends Pickup {
	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "egg",
			collide: true,
		});

		this.collider = {
			body: 30,
			position: this.position,
			scale: 1,
		};
	}
}
