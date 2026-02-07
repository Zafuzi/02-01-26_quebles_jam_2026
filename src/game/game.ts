import { initDevtools } from "@pixi/devtools";
import { AdjustmentFilter } from "pixi-filters";
import { Viewport } from "pixi-viewport";
import { Assets, DEG_TO_RAD, Point, type ApplicationOptions } from "pixi.js";
import { Game, InputMoveAction, LocationAround, PlayerInteract } from "../engine/Engine.ts";
import { MusicPlayer } from "../engine/MusicPlayer.ts";
import { bgLayer, envLayer, Score } from "./GLOBALS.ts";
import { Background } from "./components/background.ts";
import { Bin } from "./components/bin.ts";
import { Clucker } from "./components/clucker";
import { Pickup } from "./components/pickup.ts";
import { Player } from "./components/player.ts";
import { Spawner } from "./components/spawner";
import { Tree } from "./components/tree.ts";
import { Sound } from "@pixi/sound";
import { Wall } from "./components/wall.ts";

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
	await Assets.loadBundle("sounds");
	const music = new MusicPlayer(await Assets.loadBundle("music"), {
		trackOrder: ["music_003", "music_001", "music_002", "music_000", "music_004"],
		fadeInMs: 1000,
		fadeOutMs: 800,
		crossfadeMs: 1200,
		loopPlaylist: true,
	});
	console.debug("ASSETS LOADED");

	setTimeout(async () => {
		(globalThis as any).loading.classList.add("hid");
		(globalThis as any).content.classList.remove("hid");

		setTimeout(() => {
			(globalThis as any).loading.style.display = "none";
		}, 400);

		setTimeout(() => {
			(globalThis as any).msg.classList.add("hid");
		}, 10_000);

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

		const cluckerSpawnSound = Sound.from(Assets.get("cluck"));
		const cluckerPickupSound = Sound.from(Assets.get("squawk"));

		const cluckerSpawner = new Spawner<Clucker>({
			pickupCooldownMs: 500,
			spawn_rate: 500,
			max: 8,
			spawnPoint: () => LocationAround(henHouse.position, 20, 100),
			factory: (position) => {
				const clucker = new Clucker({
					position,
					layer: envLayer,
					dropTarget: henHouse,
					spawnerDropTarget: eggBin,
				});

				clucker.spawnSound = cluckerSpawnSound;
				clucker.pickupSound = cluckerPickupSound;
				player.registerPickup(clucker);

				return clucker;
			},
		});

		const thump: Sound = Sound.from(Assets.get("apple_drop"));
		player.setDropTarget("clucker", henHouse, (count) => {
			Score.cluckers += count;
			thump.play();
		});
		player.setDropTarget("apple", appleBin, (count) => {
			Score.apples += count;
			thump.play();
		});
		player.setDropTarget("egg", eggBin, (count) => {
			Score.eggs += count;
			thump.play();
		});

		Game.viewport.addChild(henHouse, appleBin, eggBin);

		let isWon = false;
		const msg = (globalThis as any).msg;
		const dbgState = (globalThis as any).dbg_state;
		const scoreApples = (globalThis as any).score_apples;
		const scoreEggs = (globalThis as any).score_eggs;

		const trees = treeSpawner.spawns;
		const cluckers = cluckerSpawner.spawns;

		// --- WALLS ---
		const hWalls = new Wall({
			fileName: "fence_horizontal",
			position: new Point(-100, 0),
			collide: true,
			layer: envLayer,
			tileWidth: 64,
			tileHeight: 64,
			anchor: new Point(0.5, 0.5),
		});

		hWalls.sprite.width = 640;
		hWalls.registerCollider(player);

		const hWalls2 = new Wall({
			fileName: "fence_horizontal",
			position: new Point(-100, -640),
			collide: true,
			layer: envLayer,
			tileWidth: 64,
			tileHeight: 64,
			anchor: new Point(0.5, 0.5),
		});

		hWalls2.sprite.width = 640;
		hWalls2.registerCollider(player);

		const vWalls = new Wall({
			fileName: "fence_vertical",
			position: new Point(-400, -320),
			collide: true,
			layer: envLayer,
			tileWidth: 64,
			tileHeight: 64,
			anchor: new Point(0.5, 0.5),
		});

		vWalls.sprite.height = 640;
		vWalls.registerCollider(player);

		const vWalls2 = new Wall({
			fileName: "fence_vertical",
			position: new Point(220, -600),
			collide: true,
			layer: envLayer,
			tileWidth: 64,
			tileHeight: 64,
			anchor: new Point(0.5, 0.5),
		});

		vWalls2.sprite.height = 300;
		vWalls2.registerCollider(player);

		Game.viewport.addChild(hWalls, hWalls2, vWalls, vWalls2);
		// --- END WALLS ---

		const registerAppleSpawner = (tree: Tree) => {
			tree.appleSpawner.onSpawn = (item) => player.registerPickup(item as Pickup);
			tree.appleSpawner.spawns.forEach((p) => {
				player.registerPickup(p as Pickup);
			});
		};

		const registerEggSpawner = (clucker: Clucker) => {
			[hWalls, hWalls2, vWalls, vWalls2].forEach((wall) => wall.registerCollider(clucker));
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
				origin: new Point(-400, 600),
				cols: 3,
				rows: 3,
				spacingX: 600,
				spacingY: 600,
				jitterX: 200,
				jitterY: 200,
				dirX: 1,
				dirY: 1,
			}),
		);
		// -- KEEP HERE --

		Game.ticker.add(() => {
			Game.tick++;
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

		window.addEventListener(
			"click",
			() => {
				music.next({ crossfadeMs: 2_000 });
			},
			{ once: true },
		);

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
	}, 300);
})();
