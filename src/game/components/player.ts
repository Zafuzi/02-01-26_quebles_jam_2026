import { Assets, Point, Ticker } from "pixi.js";
import { Clamp, EntitySprite, InputMoveAction, normalize } from "../../engine/Engine.ts";
import { LAYERS } from "../GLOBALS.ts";
import type { Pickup } from "./pickup.ts";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;
	public idle_timeout: number = 0;

	constructor() {
		super({
			fileName: "b_s",
			position: new Point(250, 250),
			speed: 8,
			collide: true,
			anchor: 0.5,
			zIndex: LAYERS.player,
		})
	}

	setMovementDirection = (xy: string) => {
		if (xy == "0,0") {
			this.idle_timeout++;
		}

		const holding = this.inventory ? "_hold" : "";
		const facing: { [key: string]: string } = {
			// idle
			"0,0": "s",

			// cardinal
			"0,1": "n", // up
			"0,-1": "s", // down
			"-1,0": "w", // left
			"1,0": "e", // right

			// diagonals
			"-1,1": "nw", // up left
			"1,1": "ne", // up right
			"-1,-1": "sw", // down left
			"1,-1": "se", // down right
		}

		const fileName = `b_${facing[xy]}${holding}`;
		if (this.fileName !== fileName) {
			this.fileName = fileName;
			this.sprite.texture = Assets.get(fileName);
		}
	}

	update = (ticker: Ticker) => {
		const [moveX, moveY] = InputMoveAction.value;
		const normal = { x: moveX, y: moveY } as Point;
		normalize(normal);

		const movementDirection = `${Math.round(moveX)},${Math.round(moveY)}`;

		this.setMovementDirection(movementDirection);

		this.rotation = Clamp(moveX, -0.1, 0.1);

		this.position.x += normal.x * this.speed * ticker.deltaTime;
		this.position.y -= normal.y * this.speed * ticker.deltaTime;

		if (this.inventory_lock_timeout > 0) {
			this.inventory_lock_timeout -= 1;
		}

		if (this.inventory) {
			this.inventory.position.x = this.position.x;
			this.inventory.position.y = this.position.y - this.height / 2 - this.inventory.height / 2;


			if (this.inventory_lock_timeout <= 0 && this.inventory.checkIfInDropTarget()) {
				this.inventory.drop();
				this.inventory = null;
				this.inventory_lock_timeout = 50;
			}
		}
	};
}
