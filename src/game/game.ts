import { AdjustmentFilter } from "pixi-filters";
import { Assets, Point, type ApplicationOptions } from "pixi.js";
import { collideEntities } from "../engine/Collision.ts";
import { Engine, NumberInRange } from "../engine/Engine.ts";
import { Bin } from "./components/bin.ts";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";
import { initDevtools } from "@pixi/devtools";
import { Viewport } from "pixi-viewport";

const config: Partial<ApplicationOptions> = {
	roundPixels: false,
	antialias: true,
	useBackBuffer: false,
	resolution: window.devicePixelRatio,
	autoDensity: true,
	resizeTo: window, // Automatically resize to fit window
	width: 800,
	height: 600,
	clearBeforeRender: true,
	backgroundColor: "#1b8738",
	sharedTicker: true,
	powerPreference: "high-performance",
	canvas: document.querySelector("#game_canvas") as HTMLCanvasElement,
};

export const LAYERS = {
	bg: 0,
	env: 1,
	pickup: 2,
	player: 2,
};

export const App = new Engine();

(async () => {
	console.debug("STARTING GAME");

	await initDevtools({ app: App });
	await App.init(config);
	App.ticker.add(() => {
		App.tick++;
	});

	console.debug("LOADING ASSETS...")
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("game-essential");
	console.debug("ASSETS LOADED")

	App.viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: App.screen.width,
		worldHeight: App.screen.height,
		events: App.renderer.events,
		ticker: App.ticker,
	});

	App.stage.addChild(App.viewport);

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
	viewport.setSize(App.WORLD_WIDTH, App.WORLD_HEIGHT);
	viewport.setZoom(1);

	viewport.filters = [worldColor];

	const player = new Player();
	viewport.addChild(player)

	const bin = new Bin({
		fileName: "apple_bin",
		position: new Point(500, 500),
		anchor: 0.5,
		zIndex: LAYERS.env,
	});
	viewport.addChild(bin);

	const pickups: Pickup[] = [];
	for (let i = 0; i < 5; i++) {
		const pickup = new Pickup({
			fileName: "apple",
			position: new Point(
				NumberInRange(20, App.screen.width),
				NumberInRange(20, App.screen.height),
			),
			dropTarget: bin,
		})
		pickups.push(pickup);
		viewport.addChild(pickup);
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
				player.inventory = p;
				console.debug("picked up", p.position)
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

		(globalThis as any).dbg_state.innerHTML = `
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

	let resizeDebounce: number;
	window.addEventListener("resize", () => {
		if (resizeDebounce) {
			clearTimeout(resizeDebounce);
		}

		resizeDebounce = setTimeout(() => {
			App.renderer.resize(window.innerWidth, window.innerHeight);

			App.viewport!.screenWidth = App.screen.width;
			App.viewport!.screenHeight = App.screen.height;
			App.viewport!.resize(App.screen.width, App.screen.height, App.WORLD_WIDTH, App.WORLD_HEIGHT);
		}, 300);
	});
})();
