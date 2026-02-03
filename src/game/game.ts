import { initDevtools } from "@pixi/devtools";
import { AdjustmentFilter } from "pixi-filters";
import { Viewport } from "pixi-viewport";
import { Assets, Point, type ApplicationOptions } from "pixi.js";
import { collideEntities } from "../engine/Collision.ts";
import { Game, NumberInRange } from "../engine/Engine.ts";
import { LAYERS } from "./GLOBALS.ts";
import { Background } from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";

const config: Partial<ApplicationOptions> = {
	roundPixels: false,
	antialias: true,
	useBackBuffer: false,
	resolution: window.devicePixelRatio,
	autoDensity: true,
	resizeTo: window, // Automatically resize to fit window
	clearBeforeRender: true,
	backgroundColor: "#1b8738",
	sharedTicker: true,
	powerPreference: "high-performance",
	canvas: document.querySelector("#game_canvas") as HTMLCanvasElement,
};

(async () => {
	console.debug("STARTING GAME");

	await initDevtools({ app: Game });
	await Game.init(config);

	console.debug("LOADING ASSETS...")
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");
	console.debug("ASSETS LOADED")

	Game.viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: Game.screen.width,
		worldHeight: Game.screen.height,
		events: Game.renderer.events,
		ticker: Game.ticker,
	});

	Game.stage.addChild(Game.viewport);

	// Warm/cozy full-viewport grade
	const worldColor = new AdjustmentFilter({
		gamma: 1.5,
		saturation: 1,
		brightness: 0.9,
		contrast: 1.3,
	});
	Game.viewport.filters = [worldColor];

	const background = new Background({
		fileName: "grass",
		tileScale: 5,
		width: Game.viewport.screenWidth,
		height: Game.viewport.screenHeight,
	})
	background.onViewportMoved(Game.viewport);

	Game.viewport.on("moved", () => {
		background.onViewportMoved(Game.viewport);
	})
	Game.viewport.addChild(background);

	const player = new Player();
	Game.viewport.addChild(player)

	const bin = new Bin({
		fileName: "apple_bin",
		position: new Point(400, 300),
		anchor: 0.5,
		scale: 0.5,
		zIndex: LAYERS.env,
	});
	Game.viewport.addChild(bin);

	const pickups: Pickup[] = [];
	for (let i = 0; i < 5; i++) {
		const pickup = new Pickup({
			fileName: "apple",
			position: new Point(
				NumberInRange(0, 800),
				NumberInRange(0, 600),
			),
			dropTarget: bin,
		});

		pickups.push(pickup);
		Game.viewport.addChild(pickup);
	}

	let isWon = false;
	const msg = (globalThis as any).msg;

	Game.ticker.add(() => {
		pickups.forEach((p) => {
			if (
				p.alive && p.collide &&
				player.inventory_lock_timeout <= 0 &&
				!player.inventory &&
				collideEntities(player.collider, p.collider)
			) {
				player.inventory = p;
				msg.classList.add("hid");
				return;
			}
		});

		const picked_up = pickups.filter((p) => p.alive).length;
		(globalThis as any).score_pickups.innerHTML = picked_up;

		if (!isWon && picked_up === 0) {
			isWon = true;

			msg.classList.remove("hid");
			msg.innerHTML = "<h1 class='blue'>You Win!</h1>";
		}

		(globalThis as any).dbg_state.innerHTML = `
			<h2> State </h2>
			<div>
				<h3> Player </h3>
				<p>PosX: ${Math.round(player.position.x)}, PosY: ${Math.round(player.position.y)}</p>
				<p>Inventory: [${player.inventory?.fileName ?? ""}]</p>
			</div>
		`
	});

	Game.viewport.follow(player, {
		speed: 0.8,
		acceleration: 0.2,
		radius: 40,
	});

	let resizeDebounce: number;
	window.addEventListener("resize", () => {
		if (resizeDebounce) {
			clearTimeout(resizeDebounce);
		}

		resizeDebounce = setTimeout(() => {
			Game.renderer.resize(window.innerWidth, window.innerHeight);

			Game.viewport.screenWidth = Game.screen.width;
			Game.viewport.screenHeight = Game.screen.height;
			Game.viewport.resize(Game.screen.width, Game.screen.height, Game.screen.width, Game.screen.height);
		}, 300);
	});
})();
