import { Assets, Point, Ticker } from "pixi.js";
import { EntitySprite, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine.ts";
import { LAYERS } from "../game.ts";
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
		const facing: { [key: string]: string } = {
			// idle
			"0,0": "bot_face_front",

			// cardinal
			"0,1": "bot_face_back", // up
			"0,-1": "bot_face_front", // down
			"-1,0": "bot_face_front_left", // left
			"1,0": "bot_face_front_right", // right

			// diagonals
			"-1,1": "bot_face_back_up_left", // up left
			"1,1": "bot_face_back_up_right", // up right
			"-1,-1": "bot_face_front_down_left", // down left
			"1,-1": "bot_face_front_down_right", // down right
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
			this.inventory.position.y = this.position.y - this.height / 2;
			this.inventory.position.x = this.position.x;

			if (this.inventory.checkIfInDropTarget()) {
				this.inventory.drop();
				this.inventory = null;
				this.inventory_lock_timeout = 50;
			}
		}
	};
}
