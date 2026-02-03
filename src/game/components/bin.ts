import { GlowFilter } from "pixi-filters";
import { EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";

export class Bin extends EntitySprite {
	public glowFilter: GlowFilter = new GlowFilter({
		color: "#00aacc",
		alpha: 0,
	});

	constructor(options: {} & EntitySpriteOptions) {
		super({
			...options,
			zIndex: 1,
			collide: true,
		});

		this.collider.body = {
			width: this.width,
			height: this.height,
		};

		this.filters = [this.glowFilter];
	}

	update = () => {};
}
