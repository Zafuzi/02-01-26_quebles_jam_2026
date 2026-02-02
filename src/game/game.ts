import { AdjustmentFilter, ColorOverlayFilter } from "pixi-filters";
import { type Viewport } from "pixi-viewport";
import { Assets, Color, Point } from "pixi.js";
import { EntitySprite, NumberInRange } from "../engine/Engine.ts";
import { Player } from "./components/player.ts";

export default async function Game(viewport: Viewport) {
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");

	// Warm/cozy full-viewport grade
	const worldColor = new AdjustmentFilter({
		gamma: 1.5,
		saturation: 1,
		brightness: 0.9,
		contrast: 1.3,
	});

	// configure the viewport
	viewport.setSize(window.innerWidth, window.innerHeight);
	viewport.setZoom(0.8);

	viewport.filters = [worldColor];

	const gridSize = 2;
	for (let i = 0; i < gridSize; i++) {
		for (let j = 0; j < gridSize; j++) {
			const floor = new EntitySprite({
				fileName: "floor",
				position: new Point(Math.round(i * 500), Math.round(j * 500)),
				isTiling: true,
				tileWidth: 500,
				tileHeight: 500,
				zIndex: -1,
			});

			floor.tileSprite.filters = [
				new ColorOverlayFilter({
					color: new Color([NumberInRange(0, 1), NumberInRange(0, 1), NumberInRange(0, 1)]),
					alpha: 0.1,
				}),
			];
			// floor.tileSprite.anchor.set(0.5)
			viewport.addChild(floor);
		}
	}

	const player = new Player(viewport);

	viewport.follow(player, {
		speed: 1,
		acceleration: 0.8,
		radius: 40,
	});

	viewport.addChild(player);
}
