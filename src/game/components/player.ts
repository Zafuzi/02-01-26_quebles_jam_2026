import { Point, Rectangle, Ticker } from "pixi.js";
import { App, Azimuth, Cartesian, Clamp, Direction, EntitySprite, InputMoveAction, Magnitude } from "../../engine/Engine.ts";
import { type Viewport } from "pixi-viewport";

export class Player extends EntitySprite {
	private boundTo: Rectangle = new Rectangle(0, 0, App.screen.width, App.screen.height);

	constructor(viewport: Viewport) {
		super({
			fileName: "player",
			position: new Point(250, 250),
			acceleration: new Point(0, 0),
			friction: new Point(0.9, 0.9),
			rotation_friction: 0.9,
			scale: new Point(1, 1),
			speed: 1.5,
		});

		this.sprite.anchor.set(0.5);
		this.boundTo.width = viewport.width / viewport.scale.x;
		this.boundTo.height = viewport.height / viewport.scale.y;
	}

	update = (ticker: Ticker) => {
		const [moveX, moveY] = InputMoveAction.value;

		this.acceleration.set(moveX, -moveY)

		this.newtonian(ticker);

		this.x = Clamp(Math.round(this.x), this.boundTo.x + this.width / 2, this.boundTo.width - this.width / 2)
		this.y = Clamp(Math.round(this.y), this.boundTo.y + this.height / 2, this.boundTo.height - this.height / 2)
	};
}
