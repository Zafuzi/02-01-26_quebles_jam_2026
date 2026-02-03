import { AdjustmentFilter } from "pixi-filters";
import { Assets, Point } from "pixi.js";
import { collideEntities } from "../engine/Collision.ts";
import { App, NumberInRange } from "../engine/Engine.ts";
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

	const player = new Player();

	const bin = new Bin({
		fileName: "apple_bin",
		position: new Point(500, 500),
	});
	bin.sprite.anchor.set(0.5);

	const pickups: Pickup[] = [];
	for (let i = 0; i < 5; i++) {
		pickups.push(new Pickup({
			fileName: "apple",
			position: new Point(
				NumberInRange(20, App.screen.width),
				NumberInRange(20, App.screen.height),
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
				<p>PosX: ${Math.round(player.position.x)}, PosY: ${Math.round(player.position.y)}</p>
				<p>Inventory: [${player.inventory?.fileName ?? ""}]</p>
			</div>
		`
	});

	viewport.follow(player, {
		speed: 0.8,
		acceleration: 0.2,
		radius: 40,
	});

	viewport.addChild(player, bin, ...pickups);
}
