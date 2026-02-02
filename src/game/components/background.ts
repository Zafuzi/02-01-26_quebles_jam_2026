import type { Viewport } from "pixi-viewport";
import { App, EntitySprite, type EntitySpriteOptions } from "../../engine/Engine.ts";

export default class Background extends EntitySprite {
	constructor(options: EntitySpriteOptions) {
		options.isTiling = true;

		super(options);

		this.zIndex = -1;
		this.position.set(0, 0);
		this.tileSprite.setSize(App.WORLD_WIDTH, App.WORLD_HEIGHT);
	}

	onViewportMoved = (viewport: Viewport) => {
		if (this.tileSprite && viewport.scale) {
			this.tileSprite.position.set(viewport.left, viewport.top);
			this.tileSprite.width = viewport.worldScreenWidth / viewport.scale.x;
			this.tileSprite.height = viewport.worldScreenHeight / viewport.scale.y;
			this.tileSprite.tilePosition.x = -viewport.left;
			this.tileSprite.tilePosition.y = -viewport.top;
		}
	};
}
