import type { Viewport } from "pixi-viewport";
import { EntityTilingSprite, type EntitySpriteOptions } from "../../engine/Engine.ts";
import { LAYERS } from "../GLOBALS.ts";


export type EntityTilingSpriteOptions = {
	width?: number, height?: number, tileScale?: number
}
export class Background extends EntityTilingSprite {
	public tileWidth: number = 1;
	public tileHeight: number = 1;

	constructor(options: EntityTilingSpriteOptions & EntitySpriteOptions) {
		super(options);

		this.zIndex = LAYERS.bg;
		this.position.set(0, 0);

		this.resize(options);
	}

	onViewportMoved = (viewport: Viewport) => {
		this.position.set(viewport.left, viewport.top);

		this.tileSprite.tilePosition.x = -viewport.left;
		this.tileSprite.tilePosition.y = -viewport.top;

		this.tileSprite.width = viewport.screenWidth / viewport.scale.x;
		this.tileSprite.height = viewport.screenHeight / viewport.scale.y;
	};

	resize = (options: Partial<EntityTilingSpriteOptions>) => {
		this.tileSprite.width = options.width ?? 0;
		this.tileSprite.height = options.height ?? 0;
		this.tileSprite.tileScale = options.tileScale ?? 1;
	}
}
