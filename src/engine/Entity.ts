import {
	Assets,
	Container,
	type ContainerOptions,
	DEG_TO_RAD,
	Graphics,
	HTMLText,
	type HTMLTextStyleOptions,
	Point,
	Rectangle,
	Sprite,
	Ticker,
	TilingSprite,
} from "pixi.js";
import type { CollidableEntity } from "./Collision.ts";
import { App } from "./Engine.ts";
import { Clamp, Direction, Magnitude } from "./Math.ts";

export type EntityOptions = ContainerOptions & {
	alive?: boolean;

	velocity?: Point;
	acceleration?: Point;
	friction?: Point;
	speed?: number;

	rotation_velocity?: number;
	rotation_friction?: number;

	collider?: CollidableEntity;
	collide?: boolean;
	debug?: boolean;
};

export class Entity extends Container {
	public alive: boolean = true;
	public collide: boolean = false;
	public debug: boolean = false;

	public velocity: Point = new Point(0, 0);
	public acceleration: Point = new Point(0, 0);
	public friction: Point = new Point(1, 1);
	public speed: number = 1;

	public rotation_velocity: number = 0;
	public rotation_friction: number = 1;

	public collider: CollidableEntity;

	public update: null | ((...args: any[]) => void) = null;

	private tickerCallback?: (time: Ticker) => void;

	public debugGraphic?: Graphics;
	public boundTo: Rectangle = new Rectangle(0, 0, App.screen.width, App.screen.height);

	constructor(options: EntityOptions) {
		super({
			...options,
			interactiveChildren: false,
		});

		const { alive, acceleration, friction, rotation_friction, rotation_velocity, speed, collider, collide, debug } =
			options;

		this.alive = alive ?? true;
		this.collide = collide ?? false;
		this.debug = debug ?? false;

		this.acceleration = acceleration ?? new Point(0, 0);
		this.friction = friction ?? new Point(1, 1);

		this.rotation_friction = rotation_friction ?? 1;
		this.rotation_velocity = rotation_velocity ?? 0;

		this.speed = speed ?? 1;

		this.collider = collider ?? {
			body: null,
			position: this.position,
			scale: this.scale,
		};

		this.tickerCallback = (time: Ticker) => {
			if (this.alive && typeof this.update === "function") {
				this.update(time);
				if (this.collide) {
					this.collider.body = this.getSize();
					this.collider.position = this.position;
					this.collider.scale = 1;
				}
				this.drawColliderDebug();
			}
		};

		App.ticker.add(this.tickerCallback);
	}

	destroy(): void {
		if (this.tickerCallback) {
			App.ticker.remove(this.tickerCallback);
			this.tickerCallback = undefined;
		}

		super.destroy({
			children: true,
			texture: false,
			style: true,
			context: true,
			textureSource: false, // keep this in case asset is used elsewhere
		});

		this.alive = false;
		this.collide = false;
		this.debug = false;
	}

	newtonian(ticker: Ticker) {
		const deltaTime = ticker.deltaTime;

		this.acceleration = this.acceleration.normalize().multiplyScalar(this.speed);

		if (!Number.isNaN(this.acceleration.x)) {
			this.velocity.add(this.acceleration, this.velocity);
		}
		// this.velocity.x += this.acceleration.x;
		// this.velocity.y += this.acceleration.y;

		const angle = Direction(this.velocity.y, this.velocity.x);
		const speed = Math.max(0, Magnitude(this.velocity.x, this.velocity.y));

		this.velocity.x = Math.cos(angle) * speed * this.friction.x;
		this.velocity.y = Math.sin(angle) * speed * this.friction.y;

		this.rotation_velocity *= this.rotation_friction;

		this.position.x += this.velocity.x * deltaTime;
		this.position.y += this.velocity.y * deltaTime;

		this.rotation += DEG_TO_RAD * this.rotation_velocity * deltaTime;
	}

	forward(worldVelocity: Point): Point {
		// Transform velocity from world space to local space
		// Rotate the velocity vector by the negative of the entity's rotation
		const cos = Math.cos(-this.rotation);
		const sin = Math.sin(-this.rotation);
		const localVelX = worldVelocity.x * cos - worldVelocity.y * sin;
		const localVelY = worldVelocity.x * sin + worldVelocity.y * cos;

		return new Point(localVelX, localVelY);
	}

	private drawColliderDebug(): void {
		if (!this.debug) {
			if (this.debugGraphic) this.debugGraphic.visible = false;
			return;
		}

		if (!this.debugGraphic) {
			this.debugGraphic = new Graphics();
			this.debugGraphic.zIndex = Number.POSITIVE_INFINITY;
			App.viewport.addChild(this.debugGraphic);
		}

		const body = this.collider?.body;
		if (body === null || body === undefined) {
			this.debugGraphic.visible = false;
			return;
		}

		const gfx = this.debugGraphic;
		this.debugGraphic.position = this.position;
		gfx.visible = true;
		gfx.clear();
		gfx.setStrokeStyle({
			width: 2,
			color: 0xff00ff,
		});

		if (typeof body === "number") {
			const scale = typeof this.collider.scale === "number" ? this.collider.scale : this.collider.scale.x;
			gfx.circle(0, 0, body * scale);
			gfx.stroke();
			return;
		}

		const scale = this.collider.scale;
		const scaleX = typeof scale === "number" ? scale : scale.x;
		const scaleY = typeof scale === "number" ? scale : scale.y;
		const width = body.width * scaleX;
		const height = body.height * scaleY;
		gfx.rect(-width * 0.5, -height * 0.5, width, height);
		gfx.stroke();
	}

	keepInBounds() {
		this.x = Clamp(this.x, this.boundTo.x + this.width / 2, this.boundTo.width - this.width / 2);
		this.y = Clamp(this.y, this.boundTo.y + this.height / 2, this.boundTo.height - this.height / 2);
	}
}

export type EntitySpriteOptions = EntityOptions & {
	fileName: string;
	isTiling?: boolean;
	tileWidth?: number;
	tileHeight?: number;
};

export class EntitySprite extends Entity {
	public sprite: Sprite = new Sprite();
	public tileSprite: TilingSprite = new TilingSprite();
	public isTiling = false;
	public fileName: string;

	constructor(options: EntityOptions & EntitySpriteOptions) {
		super(options);

		this.fileName = options.fileName;
		this.isTiling = options.isTiling ?? false;
		this.tileSprite.width = options.tileWidth || 0;
		this.tileSprite.height = options.tileHeight || 0;

		if (this.isTiling) {
			this.tileSprite.texture = Assets.get(this.fileName);
			this.addChild(this.tileSprite);
		} else {
			this.sprite.texture = Assets.get(this.fileName);
			this.addChild(this.sprite);
		}
	}
}

export type EntityTextOptions = {
	text: string;
	style?: HTMLTextStyleOptions;
};

// TODO: rewrite to use BitMap Text for performance if needed
export class EntityText extends Entity {
	public element: HTMLText;

	constructor(options: EntityOptions & EntityTextOptions) {
		super(options);

		const { text, style } = options;

		this.element = new HTMLText({
			text,
			style: style ?? {
				wordWrap: true,
				fontFamily: "Arial",
				fontSize: 24,
				fill: "#00ff00",
				align: "left",
			},
		});

		this.element.position.set(0, 0);

		this.addChild(this.element);
	}
}

export type EntityGraphicOptions = {};

export class EntityGraphic extends Entity {
	public graphics: Graphics;

	constructor(options: EntityOptions & EntityGraphicOptions = {}) {
		super(options);
		this.graphics = new Graphics();
		this.addChild(this.graphics);
	}
}
