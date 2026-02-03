import { Assets, Point, RAD_TO_DEG, Ticker } from "pixi.js";
import { Direction, EntitySprite, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine.ts";
import type { Pickup } from "./pickup.ts";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;

	constructor() {
		super({
			fileName: "bot_face_front",
			position: new Point(250, 250),
			scale: new Point(0.3, 0.3),
			speed: 5,
			collide: true,
			zIndex: 5,
		})

		this.sprite.anchor.set(0.5);
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
		if (PlayerInteract.value) {
			this.inventory?.drop();
			this.inventory = null;
			this.inventory_lock_timeout = 50;
		}

		const [moveX, moveY] = InputMoveAction.value;
		const normal = { x: moveX, y: moveY } as Point;
		normalize(normal);

		this.setMovementDirection(`${moveX},${moveY}`);

		this.x += normal.x * this.speed * ticker.deltaTime;
		this.y -= normal.y * this.speed * ticker.deltaTime;

		if (this.inventory_lock_timeout > 0) {
			this.inventory_lock_timeout -= 1;
		}

		if (this.inventory?.position) {
			this.inventory.position = this.position.add(new Point(this.width / 2, 0));
		}
	};
}
