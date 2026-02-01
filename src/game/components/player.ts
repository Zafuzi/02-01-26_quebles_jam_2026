import { Point, Rectangle, Ticker } from "pixi.js";
import { App, EntitySprite, InputMoveAction } from "../../engine/Engine.ts";
import type { Viewport } from "pixi-viewport";

export class Player extends EntitySprite {
	private boundTo: Rectangle = new Rectangle(0, 0, App.screen.width, App.screen.height);

	constructor(viewport: Viewport) {
		super({
			fileName: "player",
			position: new Point(100, 100),
			friction: new Point(0.9, 0.9),
			rotation_friction: 0.9,
			scale: new Point(1, 1)
		});

		this.sprite.anchor.set(0.5);
		this.boundTo.width = viewport.width;
		this.boundTo.height = viewport.height;
	}

	update = (ticker: Ticker) => {
		const [moveX, moveY] = InputMoveAction.value;

		this.acceleration = new Point(moveX, -moveY).multiplyScalar(2)

		this.newtonian(ticker);

		if (this.x - this.width / 2 < this.boundTo.x) {
			this.x = this.boundTo.x + this.width / 2
		}

		if (this.x + this.width / 2 > this.boundTo.width) {
			this.x = this.boundTo.width - this.width / 2
		}

		if (this.y - this.height / 2 < this.boundTo.y) {
			this.y = this.boundTo.y + this.height / 2
		}

		if (this.y + this.height / 2 > this.boundTo.height) {
			this.y = this.boundTo.height - this.height / 2
		}
	};
}
