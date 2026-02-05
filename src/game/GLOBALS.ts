import { RenderLayer } from "pixi.js";

export const bgLayer = new RenderLayer();
export const envLayer = new RenderLayer();
envLayer.sortableChildren = true;

export const Score = {
	apples: 0,
	eggs: 0,
	cluckers: 0,
};
