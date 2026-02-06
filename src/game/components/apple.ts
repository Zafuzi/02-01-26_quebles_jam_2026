import type { Entity, EntitySpriteOptions } from "../../engine/Entity";
import { Pickup } from "./pickup";

export class Apple extends Pickup {
	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "apple",
		});
	}
}
