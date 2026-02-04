import { initDevtools } from "@pixi/devtools";
import { AdjustmentFilter } from "pixi-filters";
import { Viewport } from "pixi-viewport";
import { Assets, Point, RenderLayer, type ApplicationOptions } from "pixi.js";
import { collideEntities } from "../engine/Collision.ts";
import { Game, InputMoveAction, NumberInRange, PlayerInteract } from "../engine/Engine.ts";
import { bgLayer, envLayer, LAYERS, pickupLayer, playerLayer, Score } from "./GLOBALS.ts";
import { Apple } from "./components/apple";
import { Background } from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Clucker } from "./components/clucker";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";
import { Spawner } from "./components/spawner";

const config: Partial<ApplicationOptions> = {
	roundPixels: false,
	antialias: true,
	useBackBuffer: false,
	resolution: window.devicePixelRatio,
	autoDensity: true,
	resizeTo: window, // Automatically resize to fit window
	clearBeforeRender: true,
	backgroundColor: "#1a1a1a",
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
	await Assets.loadBundle("environment");
	await Assets.loadBundle("pickups");
	await Assets.loadBundle("bot");
	console.debug("ASSETS LOADED")

	Game.viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: Game.screen.width,
		worldHeight: Game.screen.height,
		events: Game.renderer.events,
		ticker: Game.ticker,
	});

	Game.viewport.sortableChildren = true;

	Game.stage.addChild(Game.viewport);

	// Warm/cozy full-viewport grade
	const worldColor = new AdjustmentFilter({
		gamma: 1.5,
		saturation: 1,
		brightness: 0.9,
		contrast: 1.3,
	});
	Game.viewport.filters = [worldColor];
	Game.viewport.setZoom(0.8);

	Game.viewport.addChild(bgLayer, pickupLayer, envLayer, playerLayer);

	const background = new Background({
		fileName: "grass",
		tileScale: 2,
		width: Game.viewport.screenWidth,
		height: Game.viewport.screenHeight,
	})
	background.onViewportMoved(Game.viewport);
	Game.viewport.addChild(background);
	bgLayer.attach(background);

	Game.viewport.on("moved", () => {
		background.onViewportMoved(Game.viewport);
	})

	const player = new Player();
	Game.viewport.addChild(player);
	playerLayer.attach(player);

	const bin = new Bin({
		fileName: "barrel",
		position: new Point(800, 0),
		anchor: 0.5,
		zIndex: LAYERS.env,
		collide: true,
	});

	const henHouse = new Bin({
		fileName: "hen_house",
		position: new Point(0, 0),
		anchor: 0.5,
		zIndex: LAYERS.env,
	});

	henHouse.collider = {
		body: {
			width: henHouse.width - 100,
			height: henHouse.height - 100,
		},
		position: henHouse.position,
		scale: 1,
	}

	Game.viewport.addChild(henHouse, bin);
	envLayer.attach(henHouse, bin);

	const appleSpawner = new Spawner<Apple>({
		spawn_rate: 2_000,
		max: 10,
		spawnPoint: () => ({
			x: bin.x + bin.width / 2 + NumberInRange(-800, 500),
			y: bin.y + bin.height + NumberInRange(0, 500),
		}),
		factory: (position) => new Apple({
			position,
			dropTarget: bin,
		}),
	});

	const cluckerSpawner = new Spawner<Clucker>({
		spawnPoint: () => ({
			x: henHouse.x + henHouse.width / 2 + NumberInRange(0, 500),
			y: henHouse.y + henHouse.height + NumberInRange(-500, 500),
		}),
		factory: (position) => new Clucker({
			position,
			dropTarget: henHouse
		}),
	});

	appleSpawner.spawnMany(5);
	cluckerSpawner.spawnMany(5);

	let isWon = false;
	const msg = (globalThis as any).msg;

	const apples = appleSpawner.spawns;
	const cluckers = cluckerSpawner.spawns;

	Game.ticker.add(() => {
		apples.forEach((p) => {
			if (
				p.alive && p.collide &&
				(p as Pickup).pickupCooldownMs <= 0 &&
				player.inventory_lock_timeout <= 0 &&
				!player.inventory &&
				collideEntities(player.collider, p.collider)
			) {
				pickupLayer.detach(p);
				player.inventory_lock_timeout = 50;
				player.inventory = p as Pickup;

				msg.classList.add("hid");
				return;
			}
		});

		let eggs = 0;
		cluckers.forEach((clucker) => {
			(clucker as Clucker).eggSpawner.spawns.forEach(p => {
				if (p.alive && p.collide) {
					eggs++;
				}

				if (
					p.alive && p.collide &&
					(p as Pickup).pickupCooldownMs <= 0 &&
					player.inventory_lock_timeout <= 0 &&
					!player.inventory &&
					collideEntities(player.collider, p.collider)
				) {
					pickupLayer.detach(p);
					player.inventory_lock_timeout = 50;
					player.inventory = p as Pickup;
					msg.classList.add("hid");
					return;
				}
			})
		});

		(globalThis as any).score_pickups_apples.innerHTML = Score.apples;
		(globalThis as any).score_pickups_cluckers.innerHTML = Score.eggs;

		if (!isWon && Score.apples >= 10 && Score.eggs >= 10) {
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

		InputMoveAction.update();
		PlayerInteract.update();
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
			background.resize({
				width: Game.screen.width,
				height: Game.screen.height,
			})
		}, 300);
	});
})();
