import { AdjustmentFilter } from "pixi-filters";
import { Assets, Point } from "pixi.js";
import { App, EntitySprite, NumberInRange } from "../engine/Engine.ts";
import Background from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";
import { collideEntities } from "../engine/Collision.ts";

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
	const baseSpawnMargin = 10;
	const maxSpawnAttempts = 30;
	const worldWidth = viewport.width / viewport.scale.x;
	const worldHeight = viewport.height / viewport.scale.y;
	for (let i = 0; i < 5; i++) {
		const pickup = new Pickup({
			fileName: "apple",
			position: new Point(0, 0),
			zIndex: 2,
		});

		if (!pickup.collider.body) {
			pickup.collider.body = pickup.getSize();
			pickup.collider.scale = pickup.scale;
		}

		let pickupExtent = 0;
		if (typeof pickup.collider.body === "number") {
			const scale = typeof pickup.collider.scale === "number" ? pickup.collider.scale : pickup.collider.scale.x;
			pickupExtent = pickup.collider.body * scale;
		} else {
			const scaleX = typeof pickup.collider.scale === "number" ? pickup.collider.scale : pickup.collider.scale.x;
			const scaleY = typeof pickup.collider.scale === "number" ? pickup.collider.scale : pickup.collider.scale.y;
			pickupExtent = Math.max(pickup.collider.body.width * scaleX, pickup.collider.body.height * scaleY) * 0.5;
		}
		const spawnPadding = baseSpawnMargin + pickupExtent;

		let placed = false;
		for (let attempt = 0; attempt < maxSpawnAttempts; attempt++) {
			pickup.position.set(
				NumberInRange(spawnPadding, worldWidth - spawnPadding),
				NumberInRange(spawnPadding, worldHeight - spawnPadding),
			);
			pickup.collider.position = pickup.position;

			if (collideEntities(pickup.collider, player.collider)) continue;
			if (collideEntities(pickup.collider, bin.collider)) continue;

			let overlapsPickup = false;
			for (let j = 0; j < pickups.length; j++) {
				if (collideEntities(pickup.collider, pickups[j].collider)) {
					overlapsPickup = true;
					break;
				}
			}
			if (overlapsPickup) continue;

			placed = true;
			break;
		}

		if (!placed) {
			pickup.position.set(
				NumberInRange(spawnPadding, worldWidth - spawnPadding),
				NumberInRange(spawnPadding, worldHeight - spawnPadding),
			);
			pickup.collider.position = pickup.position;
		}

		pickups.push(pickup);
	}

	let isWon = false;
	let dbgFrame = 0;
	const dbgState = ebi<HTMLDivElement>("dbg_state");
	const toggle_debug_collisions = ebi<HTMLDivElement>("debug_colliders");
	toggle_debug_collisions.setAttribute("checked", App.DEBUG_COLLIDERS ? "checked" : "");
	toggle_debug_collisions.addEventListener("change", (event: Event) => {
		App.DEBUG_COLLIDERS = (event.currentTarget as HTMLInputElement).checked;
		console.log("debug", App.DEBUG_COLLIDERS);
	});
	const dropZones = [bin];
	App.ticker.add(() => {
		player.handleTriggers(pickups, dropZones);
		player.blockAgainst(bin.collider);

		if (
			player.inventory &&
			player.inventory.alive &&
			player.inventory.collide &&
			player.triggerZone.contains(bin.collider)
		) {
			bin.glowFilter.alpha = 1;
		} else {
			bin.glowFilter.alpha = 0;
		}

		let picked_up = 0;
		for (let i = 0; i < pickups.length; i++) {
			if (pickups[i].alive) picked_up++;
		}
		if (!isWon && picked_up === 0) {
			isWon = true;

			const playAgain = confirm("You Win! Play Again?");
			if (playAgain) {
				window.location.reload();
			}
		}

		if (dbgState && dbgFrame++ % 6 === 0) {
			dbgState.innerHTML = `
				<h2> State </h2>
				<div>
					<h3> Player </h3>
					<p>fileName: ${player.fileName}</p>
					<p>x: ${Math.round(player.position.x)}, y: ${Math.round(player.position.y)}</p>
					<p>Inventory: [${player.inventory?.fileName ?? " "}]</p>
				</div>
			`;
		}
	});

	viewport.follow(player, {
		speed: 1,
		acceleration: 0.8,
		radius: 40,
	});

	viewport.addChild(bg, player, bin, ...pickups);
}

export function ebi<T>(id: string) {
	return (globalThis as any)[id] as T;
}
