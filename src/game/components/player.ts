import { Assets, Point, Ticker } from "pixi.js";
import { EntitySprite, InputMoveAction, normalize } from "../../engine/Engine.ts";
import { LAYERS } from "../GLOBALS.ts";
import type { Pickup } from "./pickup.ts";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;

	constructor() {
		super({
			fileName: "bot_face_front",
			position: new Point(250, 250),
			scale: 0.5,
			speed: 5,
			collide: true,
			anchor: 0.5,
			zIndex: LAYERS.player,
		})
	}

	setMovementDirection = (xy: string) => {
		const holding = this.inventory ? "_hold" : "";
		const facing: { [key: string]: string } = {
			// idle
			"0,0": `b_s${holding}_idle_00`,

			// cardinal
			"0,1": `b_n${holding}_idle_00`, // up
			"0,-1": `b_s${holding}_idle_00`, // down
			"-1,0": `b_s${holding}_idle_00`, // left
			"1,0": `b_s${holding}_idle_00`, // right

			// diagonals
			"-1,1": "b_nw", // up left
			"1,1": "b_ne", // up right
			"-1,-1": "b_nw", // down left
			"1,-1": "b_ne", // down right
		}

		const fileName = facing[xy];
		if (this.fileName !== fileName) {
			this.fileName = fileName;
			this.sprite.texture = Assets.get(fileName);
		}
	}

	update = (ticker: Ticker) => {
		const [moveX, moveY] = InputMoveAction.value;
		const normal = { x: moveX, y: moveY } as Point;
		normalize(normal);

		const movementDirection = `${moveX},${moveY}`;

		this.setMovementDirection(movementDirection);

		this.position.x += normal.x * this.speed * ticker.deltaTime;
		this.position.y -= normal.y * this.speed * ticker.deltaTime;

		if (this.inventory_lock_timeout > 0) {
			this.inventory_lock_timeout -= 1;
		}

		if (this.inventory) {
			this.inventory.position.x = this.position.x;
			this.inventory.position.y = this.position.y - this.height / 2 - this.inventory.height / 2;


			if (this.inventory.checkIfInDropTarget()) {
				this.inventory.drop();
				this.inventory = null;
				this.inventory_lock_timeout = 50;
			}
		}
	};
}
