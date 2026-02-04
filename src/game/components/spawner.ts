import { Point, type PointData } from "pixi.js";
import type { Pickup } from "./pickup";
import { Entity, EntitySprite, Game } from "../../engine/Engine";

type SpawnPoint = PointData | (() => PointData);

export type SpawnerOptions<T extends EntitySprite | Pickup> = {
	spawnPoint: SpawnPoint;
	factory: (position: Point, spawner: Spawner<T>) => T;
	pickupCooldownMs?: number;
	spawn_rate?: number;
	max?: number;
};

export class Spawner<T extends EntitySprite | Pickup> {
	private spawnPoint: SpawnPoint;
	private factory: (position: Point, spawner: Spawner<T>) => T;
	public spawns: Entity[] = [];
	private pickupCooldownMs: number;
	public spawn_rate: number = 10;
	public max: number = 0;
	private spawn_timer: number = 0;

	static gridPoints(options: {
		origin: PointData;
		cols: number;
		rows: number;
		spacingX: number;
		spacingY: number;
		jitterX?: number;
		jitterY?: number;
		dirX?: 1 | -1;
		dirY?: 1 | -1;
	}): Point[] {
		const points: Point[] = [];
		const jitterX = options.jitterX ?? 0;
		const jitterY = options.jitterY ?? 0;
		const dirX = options.dirX ?? 1;
		const dirY = options.dirY ?? 1;

		for (let row = 0; row < options.rows; row++) {
			for (let col = 0; col < options.cols; col++) {
				const x =
					options.origin.x +
					col * options.spacingX * dirX +
					(Math.random() * 2 - 1) * jitterX;
				const y =
					options.origin.y +
					row * options.spacingY * dirY +
					(Math.random() * 2 - 1) * jitterY;
				points.push(new Point(x, y));
			}
		}

		return points;
	}

	constructor(options: SpawnerOptions<T>) {
		this.spawnPoint = options.spawnPoint;
		this.factory = options.factory;
		this.pickupCooldownMs = options.pickupCooldownMs ?? 0;
		this.spawn_rate = options.spawn_rate ?? 0;
		this.max = options.max ?? 0;

		Game.ticker.add(this.update);
	}

	update = () => {
		if (this.spawn_timer > this.spawn_rate) {
			if (this.spawns.length < this.max) {
				this.spawn();
			}
			this.spawn_timer = 0;
		}

		this.spawn_timer++;
	};

	spawn(): T {
		return this.spawnAt(this.resolvePoint());
	}

	spawnAt(point: Point): T {
		const item = this.factory(point, this);

		if (this.pickupCooldownMs > 0) {
			(item as Pickup).pickupCooldownMs = this.pickupCooldownMs;
		}
		this.spawns.push(item);

		Game.viewport.addChild(item);

		item.on("destroyed", (destroyed) => {
			const index = this.spawns.findIndex((s) => s.uid === destroyed.uid);

			if (index >= 0) {
				this.spawns.splice(index, 1);
			}
		});
		return item;
	}

	spawnMany(count: number): T[] {
		const items: T[] = [];
		for (let i = 0; i < count; i++) {
			items.push(this.spawn());
		}
		return items;
	}

	spawnManyAt(points: Point[]): T[] {
		const items: T[] = [];
		for (const point of points) {
			items.push(this.spawnAt(point));
		}
		return items;
	}

	private resolvePoint(): Point {
		const p = typeof this.spawnPoint === "function" ? this.spawnPoint() : this.spawnPoint;
		return new Point(p.x, p.y);
	}
}
