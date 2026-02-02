import { AdjustmentFilter, ColorOverlayFilter, DropShadowFilter, GlowFilter } from "pixi-filters";
import { Assets, Color, Point } from "pixi.js";
import { collideEntities } from "../engine/Collision.ts";
import { App, EntitySprite, NumberInRange } from "../engine/Engine.ts";
import Background from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";

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
	viewport.sortableChildren = true;
	viewport.setSize(window.innerWidth, window.innerHeight);
	viewport.setZoom(1);

	viewport.filters = [worldColor];

	const gridSize = 10;
	for (let i = 0; i < gridSize; i++) {
		for (let j = 0; j < gridSize; j++) {
			let tile = "floor_center";
			let rotation = 0;

			// left
			if (i == 0 && j > 0) {
				tile = "floor_left";
			}

			// top
			if (i > 0 && j == 0) {
				tile = "floor_top";
			}

			// right
			if (i == gridSize - 1 && j >= 0) {
				tile = "floor_right";
			}

			// bottom
			if (i > 0 && j == gridSize - 1) {
				tile = "floor_bottom";
			}

			// TOP LEFT CORNER
			if (i == 0 && j == 0) {
				tile = "floor_corner_top_left";
			}

			// TOP RIGHT CORNER
			if (i == gridSize - 1 && j == 0) {
				tile = "floor_corner_top_right";
			}

			// BOTTOM RIGHT CORNER
			if (i == gridSize - 1 && j == gridSize - 1) {
				tile = "floor_corner_bottom_right";
			}

			// BOTTOM LEFT CORNER
			if (i == 0 && j == gridSize - 1) {
				tile = "floor_corner_bottom_left";
			}

			const scale = 64;
			const floor = new EntitySprite({
				fileName: tile,
				position: new Point(Math.round(i * scale), Math.round(j * scale)),
				scale: scale / 32,
				zIndex: 0,
				rotation,
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
	const bg = new Background({
		fileName: "grass",
		isTiling: true,
		tileHeight: 32,
		tileWidth: 32,
		zIndex: 0,
	});
	bg.onViewportMoved(viewport);

	viewport.on("moved", () => {
		bg.onViewportMoved(viewport);
	});

	const player = new Player(viewport);

	const bin = new Bin({
		fileName: "apple_bin",
		position: new Point(333, 590),
	});
	bin.sprite.zIndex = 6;
	bin.sprite.anchor.set(0.5);

	const pickups: Pickup[] = [];
	for (let i = 0; i < 5; i++) {
		pickups.push(new Pickup({
			fileName: "apple",
			position: new Point(
				NumberInRange(20, viewport.width / viewport.scale.x - 20),
				NumberInRange(20, viewport.height / viewport.scale.y - 20),
			),
			zIndex: 2,
			dropTarget: bin,
		}))
	}

	let isWon = false;
	App.ticker.add(() => {
		pickups.forEach((p) => {
			if (
				p.alive && p.collide &&
				player.inventory_lock_timeout <= 0 &&
				!player.inventory &&
				collideEntities(player.collider, p.collider)
			) {
				console.debug("picked up", p.uid)
				player.inventory = p;
				return;
			}
		});

		if (collideEntities(player.collider, bin.collider)) {
			// todo get dir of collision
			player.y = bin.y - bin.height / 2 - player.height / 2;
		}

		const picked_up = pickups.filter((p) => p.alive).length;
		if (!isWon && picked_up === 0) {
			isWon = true;

			const playAgain = confirm("You Win! Play Again?");
			if (playAgain) {
				window.location.reload();
			}
		}

		dbg_state.innerHTML = `
			<h2> State </h2>
			<div>
				<h3> Player </h3>
				<p>fileName: ${player.fileName}</p>
				<p>x: ${Math.round(player.position.x)}, y: ${Math.round(player.position.y)}</p>
				<p>Inventory: [${player.inventory?.fileName ?? " "}]</p>
			</div>
		`
	});

	viewport.follow(player, {
		speed: 1,
		acceleration: 0.8,
		radius: 40,
	});

	viewport.addChild(bg, player, bin, ...pickups);
}
