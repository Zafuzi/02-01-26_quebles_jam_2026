import { Viewport } from "pixi-viewport";
import { Point, Ticker } from "pixi.js";
import "pixi.js/math-extras";
import { App } from "./engine/Engine.ts";
import Game from "./game/game.ts";
import { initDevtools } from "@pixi/devtools";

// World container - scales to fit window while maintaining aspect ratio
export let ViewportContainer: Viewport;

(async () => {
	await initDevtools({ app: App });

	await App.init({
		roundPixels: false,
		antialias: true,
		useBackBuffer: false,
		resolution: window.devicePixelRatio,
		autoDensity: true,
		resizeTo: window, // Automatically resize to fit window
		width: App.WORLD_WIDTH,
		height: App.WORLD_HEIGHT,
		clearBeforeRender: true,
		backgroundColor: "#94BBE9",
		sharedTicker: true,
		powerPreference: "high-performance",
		canvas: document.querySelector("#game_canvas") as HTMLCanvasElement,
	});

	App.viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: App.WORLD_WIDTH,
		worldHeight: App.WORLD_HEIGHT,
		events: App.renderer.events,
		ticker: App.ticker,
	});

	App.stage.addChild(App.viewport);
	App.ticker.add(() => {
		App.tick++;
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

	await Game();
})();
