import { type Viewport } from "pixi-viewport";
import { Assets, Color, Point } from "pixi.js";
import { App, EntitySprite, NumberInRange } from "../engine/Engine.ts";
import { Player } from "./components/player.ts";
import { ColorOverlayFilter } from "pixi-filters";

export default async function Game(viewport: Viewport) {
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");

	// configure the viewport
	viewport.setSize(window.innerWidth, window.innerHeight);
	viewport.setZoom(0.8);

	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			const floor = new EntitySprite({
				fileName: "floor",
				position: new Point(Math.round(i * 510), Math.round(j * 510)),
				isTiling: true,
				tileWidth: 500,
				tileHeight: 500,
				zIndex: -1,
			});

			floor.tileSprite.filters = [
				new ColorOverlayFilter({
					color: new Color([
						NumberInRange(0, 1),
						NumberInRange(0, 1),
						NumberInRange(0, 1),
					]),
					alpha: 0.1,
				})
			]
			// floor.tileSprite.anchor.set(0.5)
			viewport.addChild(floor)
		}
	}

	const player = new Player(viewport);
	viewport.follow(player);
	viewport.addChild(player);
}
