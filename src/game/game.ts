import { initDevtools } from "@pixi/devtools";
import { AdjustmentFilter } from "pixi-filters";
import { Viewport } from "pixi-viewport";
import { Assets, Point, type ApplicationOptions } from "pixi.js";
import { Game, InputMoveAction, LocationAround, PlayerInteract } from "../engine/Engine.ts";
import { bgLayer, envLayer, Score } from "./GLOBALS.ts";
import { Background } from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Clucker } from "./components/clucker";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";
import { Spawner } from "./components/spawner";
import { Tree } from "./components/tree.ts";

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

	console.debug("LOADING ASSETS...");
	await Assets.init({ manifest: "./manifest.json" });
	await Assets.loadBundle("environment");
	await Assets.loadBundle("pickups");
	await Assets.loadBundle("bot");
	console.debug("ASSETS LOADED");

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
	Game.viewport.setZoom(0.4);
	Game.viewport
		.clampZoom({
			minScale: 0.4,
			maxScale: 2,
		})
		.wheel({
			smooth: 100,
			interrupt: true,
			reverse: false,
			lineHeight: 0.1,
			axis: "all",
			trackpadPinch: true,
			wheelZoom: true,
		})
		.pinch()
		.decelerate();

	Game.viewport.addChild(bgLayer, envLayer);

	const background = new Background({
		fileName: "grass",
		tileScale: 2,
		width: Game.viewport.screenWidth,
		height: Game.viewport.screenHeight,
		layer: bgLayer,
	});

	background.onViewportMoved(Game.viewport);
	Game.viewport.addChild(background);

	Game.viewport.on("moved", () => {
		background.onViewportMoved(Game.viewport);
	});

	const player = new Player();
	Game.viewport.addChild(player);

	const appleBin = new Bin({
		fileName: "barrel_apples",
		position: new Point(800, 0),
		anchor: 0.5,
		collide: true,
		layer: envLayer,
	});

	const henHouse = new Bin({
		fileName: "hen_house",
		position: new Point(-200, -200),
		anchor: 0.5,
		layer: envLayer,
	});

	const eggBin = new Bin({
		fileName: "barrel_eggs",
		position: new Point(600, 0),
		anchor: 0.5,
		layer: envLayer,
	});

	eggBin.collider = {
		body: {
			width: eggBin.width - 100,
			height: eggBin.height - 100,
		},
		position: eggBin.position,
		scale: 1,
	};

	const treeSpawner = new Spawner<Tree>({
		spawnPoint: () => ({
			x: 0,
			y: -200,
		}),
		factory: (position) =>
			new Tree({
				position,
				layer: envLayer,
				dropTarget: appleBin,
			}),
	});

	const cluckerSpawner = new Spawner<Clucker>({
		pickupCooldownMs: 500,
		spawn_rate: 2_000,
		max: 2,
		spawnPoint: () => LocationAround(henHouse.position, 100, 800),
		factory: (position) => {
			const clucker = new Clucker({
				position,
				layer: envLayer,
				dropTarget: henHouse,
				spawnerDropTarget: eggBin,
			});
			player.registerPickup(clucker);

			return clucker;
		},
	});

	player.setDropTarget("clucker", henHouse, (count) => {
		Score.cluckers += count;
		cluckerSpawner.enqueueRespawn(count, 3_000, 9_000);
	});
	player.setDropTarget("apple", appleBin, (count) => {
		Score.apples += count;
	});
	player.setDropTarget("egg", eggBin, (count) => {
		Score.eggs += count;
	});

	Game.viewport.addChild(henHouse, appleBin, eggBin);

	let isWon = false;
	const msg = (globalThis as any).msg;
	const dbgState = (globalThis as any).dbg_state;
	const scoreApples = (globalThis as any).score_apples;
	const scoreEggs = (globalThis as any).score_eggs;

	const trees = treeSpawner.spawns;
	const cluckers = cluckerSpawner.spawns;

	const registerAppleSpawner = (tree: Tree) => {
		tree.appleSpawner.onSpawn = (item) => player.registerPickup(item as Pickup);
		tree.appleSpawner.spawns.forEach((p) => player.registerPickup(p as Pickup));
	};

	const registerEggSpawner = (clucker: Clucker) => {
		clucker.eggSpawner.onSpawn = (item) => player.registerPickup(item as Pickup);
		clucker.eggSpawner.spawns.forEach((p) => player.registerPickup(p as Pickup));
	};

	treeSpawner.onSpawn = (tree) => registerAppleSpawner(tree as Tree);
	cluckerSpawner.onSpawn = (clucker) => registerEggSpawner(clucker as Clucker);

	trees.forEach((tree) => registerAppleSpawner(tree as Tree));
	cluckers.forEach((clucker) => registerEggSpawner(clucker as Clucker));

	// -- KEEP HERE --
	cluckerSpawner.spawnMany(2);
	treeSpawner.spawnManyAt(
		Spawner.gridPoints({
			origin: new Point(-300, 900),
			cols: 20,
			rows: 20,
			spacingX: 600,
			spacingY: 600,
			jitterX: 400,
			jitterY: 400,
			dirX: 1,
			dirY: 1,
		}),
	);
	// -- KEEP HERE --

	Game.ticker.add(() => {
		if (!isWon && Score.apples >= 10 && Score.eggs >= 10) {
			isWon = true;

			msg.classList.remove("hid");
			msg.innerHTML = "<h1 class='blue'>You Win!</h1>";
		}

		const apples = player.inventoryCounts.get("apple") ?? 0;
		const eggs = player.inventoryCounts.get("egg") ?? 0;
		const maxApples = player.inventoryMax.get("apple") ?? 0;
		const maxEggs = player.inventoryMax.get("egg") ?? 0;
		const inventorySummary = player.getInventorySummary() || "empty";

		dbgState.innerHTML = `
			<h2> State </h2>
			<div>
				<h3> Player </h3>
				<p>PosX: ${Math.round(player.position.x)}, PosY: ${Math.round(player.position.y)}</p>
				<p>Inventory: ${inventorySummary}</p>
				<p>Apples: ${apples} / ${maxApples}</p>
				<p>Eggs: ${eggs} / ${maxEggs}</p>
			</div>
		`;

		scoreApples.innerHTML = Score.apples;
		scoreEggs.innerHTML = Score.eggs;

		InputMoveAction.update();
		PlayerInteract.update();
		envLayer.sortChildren();
	});

	Game.viewport.follow(player, {
		speed: 1,
		acceleration: 0.5,
		radius: 10,
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
			});
		}, 300);
	});
})();
