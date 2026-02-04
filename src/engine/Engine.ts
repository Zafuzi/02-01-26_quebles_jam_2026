// Engine exports - import everything you need from here
import { Viewport } from "pixi-viewport";
import { Application } from "pixi.js";

// Game container instance - initialized via init()
export class Engine extends Application {
	public tick: number = 0;
	//@ts-ignore
	public viewport: Viewport;

	constructor() {
		super();
	}
}

export * from "./Entity";
export * from "./Input";
export * from "./Math";

export const Game = new Engine();
