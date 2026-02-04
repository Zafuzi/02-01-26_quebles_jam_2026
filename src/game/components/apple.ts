import type { Entity } from "../../engine/Entity";
import type { EntitySpriteOptions } from "../../engine/Entity";
import { Score } from "../GLOBALS";
import { Pickup } from "./pickup";

export class Apple extends Pickup {
	constructor(options?: { dropTarget?: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "apple",
		});

		this.on("destroyed", () => {
			Score.apples++;
		});
	}
}
