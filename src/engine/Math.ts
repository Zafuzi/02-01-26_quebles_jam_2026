import { Point, type PointData } from "pixi.js";
import type { CollidableEntity } from "./Collision.ts";

export function NumberInRange(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function CoinFlip(): boolean {
	return NumberInRange(0, 1) > 0.5;
}

// converts a heading/angle to cartesian coords for a Distance of 1.0
// passing in a vec as 'v' makes it write into that vec rather than
// creating a new one.
export const Cartesian = function (az: number, v?: Point) {
	az = az - Math.PI;
	if (!v) return new Point(Math.sin(az), -Math.cos(az));
	v.x = Math.sin(az);
	v.y = -Math.cos(az);
	return v;
};

// takes a source position and a target position and
// returns a number from 0.0 through PI * 2 that represents the angle
// between the two, or the "heading" from source to target
export const Azimuth = function (s_pos: Point, t_pos: Point) {
	return Math.atan2(t_pos.y - s_pos.y, t_pos.x - s_pos.x) + Math.PI / 2;
};

export const Clamp = (d: number, min: number, max: number) => {
	const t: number = d < min ? min : d;
	return t > max ? max : t;
};

export const ClampPoint = function (p: PointData, min: number, max: number, writeP?: PointData): PointData {
	if (writeP) {
		writeP.x = Clamp(p.x, min, max);
		writeP.y = Clamp(p.y, min, max);
		return writeP;
	} else {
		p.x = Clamp(p.x, min, max);
		p.y = Clamp(p.y, min, max);
		return p;
	}
};

export const Magnitude = (x: number, y: number) => Math.sqrt(x * x + y * y);
export const Direction = (y: number, x: number) => Math.atan2(y, x);
export const Distance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

export const normalize = (point: PointData): void => {
	const mag = Math.hypot(point.x, point.y);
	if (mag === 0) return;
	point.x /= mag;
	point.y /= mag;
};

export const LocationAround = (position: PointData, minDistance: number, maxDistance: number): PointData => {
	// Uniform random point in an annulus (torus in 2D)
	const u = Math.random();
	const v = Math.random();
	const min2 = minDistance * minDistance;
	const max2 = maxDistance * maxDistance;
	const r = Math.sqrt(u * (max2 - min2) + min2);
	const angle = v * 2 * Math.PI;

	return {
		x: position.x + Math.cos(angle) * r,
		y: position.y + Math.sin(angle) * r,
	};
};

export const Roll = (amount: number): number => {
	return Math.round(NumberInRange(0, amount - 1));
};

export type CollisionResolution = {
	// Unit vector pointing from entity1 toward entity2 along the collision axis.
	direction: Point;
	// Minimum translation vector to apply to entity1 to resolve the overlap.
	reverse: Point;
	// Penetration depth along the collision axis.
	overlap: number;
};

const getScaleX = (scale: number | PointData): number => (typeof scale === "number" ? scale : scale.x);
const getScaleY = (scale: number | PointData): number => (typeof scale === "number" ? scale : scale.y);

const resolveRectRect = (entity1: CollidableEntity, entity2: CollidableEntity): CollisionResolution | null => {
	const rect1 = entity1.body as { width: number; height: number };
	const rect2 = entity2.body as { width: number; height: number };
	const scale1X = getScaleX(entity1.scale);
	const scale1Y = getScaleY(entity1.scale);
	const scale2X = getScaleX(entity2.scale);
	const scale2Y = getScaleY(entity2.scale);
	const half1X = rect1.width * scale1X * 0.5;
	const half1Y = rect1.height * scale1Y * 0.5;
	const half2X = rect2.width * scale2X * 0.5;
	const half2Y = rect2.height * scale2Y * 0.5;

	const deltaX = entity2.position.x - entity1.position.x;
	const deltaY = entity2.position.y - entity1.position.y;
	const overlapX = half1X + half2X - Math.abs(deltaX);
	const overlapY = half1Y + half2Y - Math.abs(deltaY);
	if (overlapX <= 0 || overlapY <= 0) return null;

	if (overlapX < overlapY) {
		const dirX = deltaX === 0 ? 1 : Math.sign(deltaX);
		const direction = new Point(dirX, 0);
		return {
			direction,
			overlap: overlapX,
			reverse: new Point(-direction.x * overlapX, 0),
		};
	}

	const dirY = deltaY === 0 ? 1 : Math.sign(deltaY);
	const direction = new Point(0, dirY);
	return {
		direction,
		overlap: overlapY,
		reverse: new Point(0, -direction.y * overlapY),
	};
};

const resolveCircleCircle = (entity1: CollidableEntity, entity2: CollidableEntity): CollisionResolution | null => {
	const radius1 = (entity1.body as number) * getScaleX(entity1.scale);
	const radius2 = (entity2.body as number) * getScaleX(entity2.scale);
	const deltaX = entity2.position.x - entity1.position.x;
	const deltaY = entity2.position.y - entity1.position.y;
	const dist = Math.hypot(deltaX, deltaY);
	const overlap = radius1 + radius2 - dist;
	if (overlap <= 0) return null;

	let direction: Point;
	if (dist === 0) {
		direction = new Point(1, 0);
	} else {
		direction = new Point(deltaX / dist, deltaY / dist);
	}

	return {
		direction,
		overlap,
		reverse: new Point(-direction.x * overlap, -direction.y * overlap),
	};
};

const resolveCircleRect = (
	circleEntity: CollidableEntity,
	rectEntity: CollidableEntity,
): { normal: Point; overlap: number } | null => {
	const radius = (circleEntity.body as number) * getScaleX(circleEntity.scale);
	const rect = rectEntity.body as { width: number; height: number };
	const rectHalfX = rect.width * getScaleX(rectEntity.scale) * 0.5;
	const rectHalfY = rect.height * getScaleY(rectEntity.scale) * 0.5;

	const rectCenterX = rectEntity.position.x;
	const rectCenterY = rectEntity.position.y;
	const circleX = circleEntity.position.x;
	const circleY = circleEntity.position.y;

	const closestX = Clamp(circleX, rectCenterX - rectHalfX, rectCenterX + rectHalfX);
	const closestY = Clamp(circleY, rectCenterY - rectHalfY, rectCenterY + rectHalfY);
	const deltaX = circleX - closestX;
	const deltaY = circleY - closestY;
	const distSq = deltaX * deltaX + deltaY * deltaY;

	if (distSq > radius * radius) return null;

	// If the circle center is inside the rect, push out along the shortest axis.
	if (distSq === 0) {
		const toLeft = circleX - (rectCenterX - rectHalfX);
		const toRight = rectCenterX + rectHalfX - circleX;
		const toTop = circleY - (rectCenterY - rectHalfY);
		const toBottom = rectCenterY + rectHalfY - circleY;

		let min = toLeft;
		let normal = new Point(-1, 0);

		if (toRight < min) {
			min = toRight;
			normal = new Point(1, 0);
		}
		if (toTop < min) {
			min = toTop;
			normal = new Point(0, -1);
		}
		if (toBottom < min) {
			min = toBottom;
			normal = new Point(0, 1);
		}

		return {
			normal,
			overlap: radius + min,
		};
	}

	const dist = Math.sqrt(distSq);
	const normal = new Point(deltaX / dist, deltaY / dist);
	return {
		normal,
		overlap: radius - dist,
	};
};

export const CollisionDirection = (
	entity1: CollidableEntity,
	entity2: CollidableEntity,
): CollisionResolution | null => {
	if (entity1.body === null || entity1.body === undefined) return null;
	if (entity2.body === null || entity2.body === undefined) return null;

	if (typeof entity1.body === "number") {
		if (typeof entity2.body === "number") {
			return resolveCircleCircle(entity1, entity2);
		}

		const res = resolveCircleRect(entity1, entity2);
		if (!res) return null;
		const direction = new Point(-res.normal.x, -res.normal.y);
		return {
			direction,
			overlap: res.overlap,
			reverse: new Point(res.normal.x * res.overlap, res.normal.y * res.overlap),
		};
	}

	if (typeof entity2.body === "number") {
		const res = resolveCircleRect(entity2, entity1);
		if (!res) return null;
		const direction = new Point(res.normal.x, res.normal.y);
		return {
			direction,
			overlap: res.overlap,
			reverse: new Point(-direction.x * res.overlap, -direction.y * res.overlap),
		};
	}

	return resolveRectRect(entity1, entity2);
};
