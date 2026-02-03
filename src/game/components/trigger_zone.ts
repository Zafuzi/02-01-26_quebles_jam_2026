import { Point, type PointData } from "pixi.js";
import { type CollidableEntity, type CollisionBody, collideEntities } from "../../engine/Collision";
import { Entity, type EntityOptions } from "../../engine/Engine";

export type TriggerZoneOptions = EntityOptions & {
	body?: CollisionBody;
	scale?: number | Point;
	offset?: PointData;
};

export class TriggerZone extends Entity {
	public readonly owner: Entity;
	public readonly collider: CollidableEntity;
	public readonly offset: Point;

	constructor(owner: Entity, options: TriggerZoneOptions = {}) {
		super({
			...options,
			position: owner.position ?? new Point(0, 0)
		});

		this.owner = owner;
		this.offset = new Point(options.offset?.x ?? 0, options.offset?.y ?? 0);

		const body = options.body ?? owner.collider?.body ?? null;
		const scale = owner.collider?.scale ?? owner.scale;

		this.collider = {
			body,
			position: new Point(owner.position.x + this.offset.x, owner.position.y + this.offset.y),
			scale,
		};
	}

	update = () => {
		this.collider.position.x = this.owner.position.x + this.offset.x;
		this.collider.position.y = this.owner.position.y + this.offset.y;
	}

	contains(target: CollidableEntity): boolean {
		if (!this.alive) return false;
		if (!this.collider.body || !target.body) return false;
		return collideEntities(this.collider, target);
	}

	acceptDrop<T extends Entity>(item: T): T | null {
		if (!this.alive) return null;
		if (!item?.collider?.body) return null;
		return this.contains(item.collider) ? item : null;
	}
}
