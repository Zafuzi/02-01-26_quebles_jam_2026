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

const getScaleValue = (scale: number | Point, axis: "x" | "y"): number => {
	if (typeof scale === "number") return scale;
	return axis === "x" ? scale.x : scale.y;
};

const getRectHalfExtents = (collider: CollidableEntity): { halfWidth: number; halfHeight: number } => {
	const body = collider.body as { width: number; height: number };
	const scaleX = getScaleValue(collider.scale, "x");
	const scaleY = getScaleValue(collider.scale, "y");
	return {
		halfWidth: body.width * scaleX * 0.5,
		halfHeight: body.height * scaleY * 0.5,
	};
};

const getCircleRadius = (collider: CollidableEntity): number => {
	const scale = getScaleValue(collider.scale, "x");
	return (collider.body as number) * scale;
};

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
	public previousPosition: Point = new Point(0, 0);
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
			this.renderable = this.alive;
			this.debug = App.DEBUG_COLLIDERS;
			if (this.parent && this.alive && typeof this.update === "function") {
				this.previousPosition.set(this.position.x, this.position.y);
				this.update(time);
				if (this.collide) {
					if (!this.collider.body) {
						this.collider.body = this.getSize();
						this.collider.scale = 1;
					}

					this.collider.position = this.position;
				}
				this.drawColliderDebug();
			}
		};

		App.ticker.add(this.tickerCallback);
	}

	destroy(): void {
		if (this.debugGraphic) {
			this.debugGraphic.destroy();
			this.debugGraphic = undefined;
		}
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
		if (!this.alive) {
			return;
		}

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

	blockAgainst(solid: CollidableEntity): boolean {
		const mover = this.collider;
		if (!mover?.body || !solid?.body) return false;

		if (typeof mover.body !== "number" && typeof solid.body !== "number") {
			return this.blockRectRect(solid);
		}

		if (typeof mover.body === "number" && typeof solid.body === "number") {
			return this.blockCircleCircle(solid);
		}

		if (typeof mover.body === "number") {
			return this.blockCircleRect(solid);
		}

		return this.blockRectCircle(solid);
	}

	private blockRectRect(solid: CollidableEntity): boolean {
		const mover = this.collider;
		const moverExtents = getRectHalfExtents(mover);
		const solidExtents = getRectHalfExtents(solid);

		const dx = this.position.x - solid.position.x;
		const dy = this.position.y - solid.position.y;
		const overlapX = moverExtents.halfWidth + solidExtents.halfWidth - Math.abs(dx);
		const overlapY = moverExtents.halfHeight + solidExtents.halfHeight - Math.abs(dy);

		if (overlapX <= 0 || overlapY <= 0) return false;

		const deltaX = this.position.x - this.previousPosition.x;
		const deltaY = this.position.y - this.previousPosition.y;

		let resolveX = overlapX < overlapY;
		if (overlapX === overlapY) {
			resolveX = Math.abs(deltaX) >= Math.abs(deltaY);
		}

		const prevDx = this.previousPosition.x - solid.position.x;
		const prevDy = this.previousPosition.y - solid.position.y;
		const signX = prevDx === 0 ? (deltaX >= 0 ? 1 : -1) : prevDx > 0 ? 1 : -1;
		const signY = prevDy === 0 ? (deltaY >= 0 ? 1 : -1) : prevDy > 0 ? 1 : -1;

		if (resolveX) {
			this.position.x += overlapX * signX;
			this.velocity.x = 0;
		} else {
			this.position.y += overlapY * signY;
			this.velocity.y = 0;
		}

		mover.position = this.position;
		this.keepInBounds();
		return true;
	}

	private blockCircleCircle(solid: CollidableEntity): boolean {
		const mover = this.collider;
		const radiusA = getCircleRadius(mover);
		const radiusB = getCircleRadius(solid);
		const dx = this.position.x - solid.position.x;
		const dy = this.position.y - solid.position.y;
		const distSq = dx * dx + dy * dy;
		const combined = radiusA + radiusB;
		if (distSq >= combined * combined) return false;

		const dist = Math.sqrt(distSq);
		let nx = 1;
		let ny = 0;
		if (dist > 0) {
			nx = dx / dist;
			ny = dy / dist;
		} else {
			const deltaX = this.position.x - this.previousPosition.x;
			const deltaY = this.position.y - this.previousPosition.y;
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				nx = Math.sign(deltaX) || 1;
				ny = 0;
			} else {
				nx = 0;
				ny = Math.sign(deltaY) || 1;
			}
		}

		const depth = combined - dist;
		this.position.x += nx * depth;
		this.position.y += ny * depth;
		this.velocity.set(0, 0);
		mover.position = this.position;
		this.keepInBounds();
		return true;
	}

	private blockCircleRect(solid: CollidableEntity): boolean {
		const mover = this.collider;
		const radius = getCircleRadius(mover);
		const { halfWidth, halfHeight } = getRectHalfExtents(solid);

		const rectLeft = solid.position.x - halfWidth;
		const rectRight = solid.position.x + halfWidth;
		const rectTop = solid.position.y - halfHeight;
		const rectBottom = solid.position.y + halfHeight;

		const closestX = Clamp(this.position.x, rectLeft, rectRight);
		const closestY = Clamp(this.position.y, rectTop, rectBottom);

		const dx = this.position.x - closestX;
		const dy = this.position.y - closestY;
		const distSq = dx * dx + dy * dy;
		if (distSq >= radius * radius) return false;

		if (distSq > 0) {
			const dist = Math.sqrt(distSq);
			const depth = radius - dist;
			this.position.x += (dx / dist) * depth;
			this.position.y += (dy / dist) * depth;
		} else {
			const left = this.previousPosition.x - rectLeft;
			const right = rectRight - this.previousPosition.x;
			const top = this.previousPosition.y - rectTop;
			const bottom = rectBottom - this.previousPosition.y;
			const min = Math.min(left, right, top, bottom);
			if (min === left) this.position.x = rectLeft - radius;
			else if (min === right) this.position.x = rectRight + radius;
			else if (min === top) this.position.y = rectTop - radius;
			else this.position.y = rectBottom + radius;
		}

		this.velocity.set(0, 0);
		mover.position = this.position;
		this.keepInBounds();
		return true;
	}

	private blockRectCircle(solid: CollidableEntity): boolean {
		const mover = this.collider;
		const radius = getCircleRadius(solid);
		const { halfWidth, halfHeight } = getRectHalfExtents(mover);

		const rectLeft = this.position.x - halfWidth;
		const rectRight = this.position.x + halfWidth;
		const rectTop = this.position.y - halfHeight;
		const rectBottom = this.position.y + halfHeight;

		const closestX = Clamp(solid.position.x, rectLeft, rectRight);
		const closestY = Clamp(solid.position.y, rectTop, rectBottom);

		const dx = solid.position.x - closestX;
		const dy = solid.position.y - closestY;
		const distSq = dx * dx + dy * dy;
		if (distSq >= radius * radius) return false;

		if (distSq > 0) {
			const dist = Math.sqrt(distSq);
			const depth = radius - dist;
			this.position.x -= (dx / dist) * depth;
			this.position.y -= (dy / dist) * depth;
		} else {
			const left = solid.position.x - rectLeft;
			const right = rectRight - solid.position.x;
			const top = solid.position.y - rectTop;
			const bottom = rectBottom - solid.position.y;
			const min = Math.min(left, right, top, bottom);
			if (min === left) this.position.x = rectLeft - radius;
			else if (min === right) this.position.x = rectRight + radius;
			else if (min === top) this.position.y = rectTop - radius;
			else this.position.y = rectBottom + radius;
		}

		this.velocity.set(0, 0);
		mover.position = this.position;
		this.keepInBounds();
		return true;
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
