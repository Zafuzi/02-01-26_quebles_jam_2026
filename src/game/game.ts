import { AdjustmentFilter, ColorOverlayFilter } from "pixi-filters";
import { Assets, Color, Point } from "pixi.js";
import { App, EntitySprite, NumberInRange } from "../engine/Engine.ts";
import { Player } from "./components/player.ts";
import { collideEntities } from "../engine/Collision.ts";
import { Pickup } from "./components/pickup.ts";

export default async function Game() {
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");

	// Warm/cozy full-viewport grade
	const worldColor = new AdjustmentFilter({
		gamma: 1.5,
		saturation: 1,
		brightness: 0.9,
		contrast: 1.3,
	});

	const viewport = App.viewport;
	if (!viewport) {
		throw new Error("missing viewport");
	}

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

			viewport.addChild(floor);
		}
	}

	const player = new Player(viewport);
	const pickups: Pickup[] = [];
	for (let i = 0; i < 10; i++) {
		pickups.push(new Pickup({
			fileName: "apple",
			position: new Point(NumberInRange(0, viewport.width / viewport.scale.x), NumberInRange(0, viewport.height / viewport.scale.y))
		}));
	}

	App.ticker.add(() => {
		pickups.forEach(p => {
			if (!player.inventory && collideEntities(player.collider, p.collider)) {
				player.inventory = p;
				return;
			}
		})
	})

	viewport.follow(player, {
		speed: 1,
		acceleration: 0.8,
		radius: 40,
	});

	viewport.addChild(player, ...pickups);
}
