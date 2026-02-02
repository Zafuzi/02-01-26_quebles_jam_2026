import { type Viewport } from "pixi-viewport";
import { Assets, Point, Ticker } from "pixi.js";
import { EntitySprite, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine.ts";
import type { Pickup } from "./pickup.ts";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;

	constructor(viewport: Viewport) {
		super({
			fileName: "bot_face_front",
			position: new Point(250, 250),
			scale: new Point(0.3, 0.3),
			speed: 5,
			collide: true,
		})

		this.sprite.anchor.set(0.5);
		this.sprite.zIndex = 2;

		this.boundTo.width = viewport.width / viewport.scale.x;
		this.boundTo.height = viewport.height / viewport.scale.y;
	}

	update = (ticker: Ticker) => {
		if (PlayerInteract.value) {
			this.inventory?.drop();
			this.inventory = null;
			this.inventory_lock_timeout = 50;
		}

		this.keepInBounds();

		const [moveX, moveY] = InputMoveAction.value;

		const normal = new Point(moveX, moveY);
		normalize(normal);

		this.x += normal.x * this.speed * ticker.deltaTime;
		this.y -= normal.y * this.speed * ticker.deltaTime;

		if (this.inventory_lock_timeout > 0) {
			this.inventory_lock_timeout -= 1;
		}

		if (this.inventory?.position) {
			this.inventory.position = this.position.add(new Point(this.width / 2, 0));
			this.inventory.keepInBounds();
		}

		if (moveY > 0) {
			if (this.fileName !== "bot_face_back") {
				this.fileName = "bot_face_back"
				this.sprite.texture = Assets.get(this.fileName)
			}
		} else {
			if (this.fileName !== "bot_face_front") {
				this.fileName = "bot_face_front"
				this.sprite.texture = Assets.get(this.fileName)
			}
		}
	};
}
