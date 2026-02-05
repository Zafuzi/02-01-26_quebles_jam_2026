import { Point, type Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision";
import { Distance, NumberInRange } from "../../engine/Engine";
import type { Entity, EntitySpriteOptions } from "../../engine/Entity";
import { envLayer } from "../GLOBALS";
import { Egg } from "./egg";
import { Pickup } from "./pickup";
import { Spawner } from "./spawner";

export class Clucker extends Pickup {
	private startPos: Point;
	private heading: number;
	private targetHeading: number;
	private turnRate: number;
	private changeTimer: number;
	private pauseTimer: number = 0;
	public eggSpawner: Spawner<Egg>;
	public spawnerDropTarget: Entity | undefined;

	constructor(options?: { dropTarget: Entity; spawnerDropTarget: Entity } & Partial<EntitySpriteOptions>) {
		super({
			...options,
			fileName: "clucker",
			anchor: 0.5,
			collide: true,
		});

		this.startPos = new Point(this.position.x, this.position.y);
		this.heading = NumberInRange(-Math.PI, Math.PI);
		this.targetHeading = this.heading;
		this.speed = NumberInRange(0.25, 0.65);
		this.turnRate = NumberInRange(0.02, 0.05);
		this.changeTimer = NumberInRange(30, 120);
		this.spawnerDropTarget = options?.spawnerDropTarget;

		this.eggSpawner = new Spawner({
			spawn_rate: NumberInRange(100, 5_000),
			max: 10,
			spawnPoint: () => ({
				x: this.x,
				y: this.y,
			}),
			pickupCooldownMs: 500,
			factory: (position, spawner) => {
				spawner.spawn_rate = NumberInRange(100, 5_000);
				return new Egg({
					position,
					layer: envLayer,
					dropTarget: this.spawnerDropTarget,
				});
			},
		});
	}

	update = (ticker: Ticker) => {
		this.updatePickupCooldown(ticker);
		const dt = ticker.deltaTime;

		if (this.pauseTimer > 0) {
			this.pauseTimer -= dt;
			return;
		}

		this.changeTimer -= dt;
		if (this.changeTimer <= 0) {
			this.targetHeading = this.heading + NumberInRange(-0.9, 0.9);
			this.speed = NumberInRange(0.2, 0.7);
			this.turnRate = NumberInRange(0.02, 0.06);
			this.changeTimer = NumberInRange(30, 120);
			if (NumberInRange(0, 1) < 0.2) {
				this.pauseTimer = NumberInRange(15, 60);
			}
		}

		const d = Distance(this.position, this.startPos);
		if (d > 180) {
			const toCenter = Math.atan2(this.startPos.y - this.y, this.startPos.x - this.x);
			this.targetHeading = toCenter + NumberInRange(-0.4, 0.4);
		}

		const angleDiff = Math.atan2(
			Math.sin(this.targetHeading - this.heading),
			Math.cos(this.targetHeading - this.heading),
		);
		const maxTurn = this.turnRate * dt;
		this.heading += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

		this.x += Math.cos(this.heading) * this.speed * dt;
		this.y += Math.sin(this.heading) * this.speed * dt;
	};

	drop = () => {
		if (!this.dropTarget || !collideEntities(this.dropTarget.collider, this.collider)) {
			return;
		}

		this.position.set(this.dropTarget.position.x, this.dropTarget.position.y);
		this.startPos = new Point(this.position.x, this.position.y);

		// Pause wandering at the hen house, then resume after a random delay.
		this.pauseTimer = NumberInRange(180, 600);
	};

	destroy(): void {
		this.eggSpawner.stop();
		super.destroy();
	}
}
