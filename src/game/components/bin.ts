import { EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";

export class Bin extends EntitySprite {
	constructor(options: {} & EntitySpriteOptions) {
		super({
			...options,
			collide: true,
		});
	}

	update = () => {};
}
