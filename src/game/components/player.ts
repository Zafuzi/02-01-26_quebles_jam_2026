import { type Viewport } from "pixi-viewport";
import { Point, Ticker } from "pixi.js";
import { EntitySprite, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine.ts";
import type { Pickup } from "./pickup.ts";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;

	constructor(viewport: Viewport) {
		super({
			fileName: "player",
			position: new Point(250, 250),
			scale: new Point(1, 1),
			speed: 10,
			collide: true,
			zIndex: 5,
		});

		this.sprite.anchor.set(0.5);

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
			this.inventory.position = this.position.add(new Point(this.width, 0));
			this.inventory.keepInBounds();
		}
	};
}
