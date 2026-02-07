import type { Viewport } from "pixi-viewport";
import { EntityTilingSprite, type EntitySpriteOptions, type EntityTilingSpriteOptions } from "../../engine/Engine.ts";

export class Background extends EntityTilingSprite {
	public tileWidth: number = 1;
	public tileHeight: number = 1;

	constructor(options: EntityTilingSpriteOptions & EntitySpriteOptions) {
		super(options);

		this.position.set(0, 0);

		this.resize(options);
	}

	onViewportMoved = (viewport: Viewport) => {
		this.position.set(viewport.left, viewport.top);

		this.sprite.tilePosition.x = -viewport.left;
		this.sprite.tilePosition.y = -viewport.top;

		this.sprite.width = viewport.screenWidth / viewport.scale.x;
		this.sprite.height = viewport.screenHeight / viewport.scale.y;
	};

	resize = (options: Partial<EntityTilingSpriteOptions>) => {
		this.sprite.width = options.width ?? 0;
		this.sprite.height = options.height ?? 0;
		this.sprite.tileScale = options.tileScale ?? 1;
	};
}
