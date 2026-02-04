import { RenderLayer } from "pixi.js";

export const bgLayer = new RenderLayer();
export const envLayer = new RenderLayer();
export const pickupLayer = new RenderLayer();
export const playerLayer = new RenderLayer();

export const LAYERS = {
    bg: 0,
    pickup: 1,
    env: 2,
    player: 3,
}

export const Score = {
    apples: 0,
    eggs: 0,
};;