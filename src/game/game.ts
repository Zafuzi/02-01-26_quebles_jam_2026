import { type Viewport } from "pixi-viewport";
import { Assets, Point } from "pixi.js";
import { App, EntitySprite } from "../engine/Engine.ts";
import { Player } from "./components/player.ts";

export default async function Game(viewport: Viewport) {
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");

	// configure the viewport
	viewport.setSize(window.innerWidth, window.innerHeight);
	viewport.setZoom(1);

	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			const floor = new EntitySprite({
				fileName: "floor",
				position: new Point(i * 510, j * 510),
				isTiling: true,
				tileWidth: 500,
				tileHeight: 500,
				zIndex: -1,
			});

			// floor.tileSprite.anchor.set(0.5)
			viewport.addChild(floor)
		}
	}

	const player = new Player(viewport);
	viewport.follow(player);
	viewport.addChild(player);
}
