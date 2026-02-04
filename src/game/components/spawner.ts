import { Point, type PointData } from "pixi.js";
import type { Pickup } from "./pickup";
import { Entity, EntitySprite, Game } from "../../engine/Engine";
import { pickupLayer } from "../GLOBALS";

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
			this.spawn_timer = 0
		}

		this.spawn_timer++;
	}

	spawn(): T {
		const pos = this.resolvePoint();
		const item = this.factory(pos, this);

		if (this.pickupCooldownMs > 0) {
			(item as Pickup).pickupCooldownMs = this.pickupCooldownMs;
		}
		this.spawns.push(item);

		Game.viewport.addChild(item);
		pickupLayer.attach(item);
		item.on("destroyed", (destroyed) => {
			const index = this.spawns.findIndex((s) => s.uid === destroyed.uid);

			if (index >= 0) {
				this.spawns.splice(index, 1);
			}
		})
		return item;
	}

	spawnMany(count: number): T[] {
		const items: T[] = [];
		for (let i = 0; i < count; i++) {
			items.push(this.spawn());
		}
		return items;
	}

	private resolvePoint(): Point {
		const p = typeof this.spawnPoint === "function" ? this.spawnPoint() : this.spawnPoint;
		return new Point(p.x, p.y);
	}
}
