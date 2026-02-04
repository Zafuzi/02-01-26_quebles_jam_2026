import { Assets, Point, Sprite, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision.ts";
import { Clamp, EntitySprite, Game, InputMoveAction, normalize } from "../../engine/Engine.ts";
import { envLayer } from "../GLOBALS.ts";
import type { Entity } from "../../engine/Entity";
import type { Pickup } from "./pickup.ts";

export type PlayerInventoryTypes = "apple" | "egg";
export class Player extends EntitySprite {
	public inventoryCounts: Map<PlayerInventoryTypes, number> = new Map();
	public inventoryLockTimeout: number = 0;
	private pickupCandidates: Set<Pickup> = new Set();
	private dropTargets: Map<string, { target: Entity; onDrop?: (count: number) => void }> = new Map();
	private inventoryIcons: Map<PlayerInventoryTypes, EntitySprite> = new Map();

	constructor() {
		super({
			fileName: "b_s",
			position: new Point(250, 250),
			speed: 8,
			collide: true,
			anchor: 0.5,
			layer: envLayer,
		});
	}

	setMovementDirection = (xy: string) => {
		const holding = this.getTotalInventoryCount() > 0 ? "_hold" : "";
		const facing: { [key: string]: string } = {
			// idle
			"0,0": "s",

			// cardinal
			"0,1": "n", // up
			"0,-1": "s", // down
			"-1,0": "w", // left
			"1,0": "e", // right

			// diagonals
			"-1,1": "nw", // up left
			"1,1": "ne", // up right
			"-1,-1": "sw", // down left
			"1,-1": "se", // down right
		};

		const fileName = `b_${facing[xy]}${holding}`;
		if (this.fileName !== fileName) {
			this.fileName = fileName;
			this.sprite.texture = Assets.get(fileName);
		}
	};

	update = (ticker: Ticker) => {
		const [moveX, moveY] = InputMoveAction.value;
		const normal = { x: moveX, y: moveY } as Point;
		normalize(normal);

		this.setMovementDirection(`${Math.round(moveX)},${Math.round(moveY)}`);
		this.rotation = Clamp(moveX, -0.1, 0.1);
		this.position.x += normal.x * this.speed * ticker.deltaTime;
		this.position.y -= normal.y * this.speed * ticker.deltaTime;

		if (this.inventoryLockTimeout > 0) this.inventoryLockTimeout -= 1;

		this.tryPickup();
		this.handleDropTargets();
		this.updateInventoryIcons();
	};

	addToInventory = (item: Pickup): void => {
		const current = this.inventoryCounts.get(item.fileName as PlayerInventoryTypes) ?? 0;
		this.inventoryCounts.set(item.fileName as PlayerInventoryTypes, current + 1);
	};

	registerPickup = (item: Pickup) => {
		if (this.pickupCandidates.has(item)) return;
		this.pickupCandidates.add(item);
		item.on("destroyed", () => {
			this.unregisterPickup(item);
		});
	};

	unregisterPickup = (item: Pickup) => {
		this.pickupCandidates.delete(item);
	};

	setDropTarget = (fileName: string, target: Entity, onDrop?: (count: number) => void) => {
		this.dropTargets.set(fileName, { target, onDrop });
	};

	private tryPickup() {
		if (this.inventoryLockTimeout > 0) return;

		for (const item of this.pickupCandidates) {
			if (!this.isPickupAvailable(item)) continue;
			this.collect(item);
			break;
		}
	}

	private handleDropTargets() {
		if (this.inventoryLockTimeout > 0) return;
		for (const [fileName, config] of this.dropTargets.entries()) {
			const count = this.inventoryCounts.get(fileName as PlayerInventoryTypes) ?? 0;
			if (count <= 0) continue;
			if (collideEntities(this.collider, config.target.collider)) {
				this.inventoryCounts.set(fileName as PlayerInventoryTypes, 0);
				this.inventoryLockTimeout = 50;
				config.onDrop?.(count);
				break;
			}
		}
	}

	getTotalInventoryCount(): number {
		let total = 0;
		for (const count of this.inventoryCounts.values()) total += count;
		return total;
	}

	private isPickupAvailable(item: Pickup): boolean {
		return (
			item.alive &&
			item.collide &&
			item.pickupCooldownMs <= 0 &&
			!item.isBeingHeld &&
			collideEntities(this.collider, item.collider)
		);
	}

	private collect(item: Pickup) {
		this.inventoryLockTimeout = 50;
		this.addToInventory(item);
		this.unregisterPickup(item);
		item.destroy();
	}

	private updateInventoryIcons() {
		const self = this;
		const activeTypes = Array.from(this.inventoryCounts.entries())
			.filter(([, count]) => count > 0)
			.map(([name]) => name);

		for (const [name, icon] of this.inventoryIcons.entries()) {
			icon.visible = activeTypes.includes(name);
		}

		let cursorX = 0;
		for (const name of activeTypes) {
			const icon = this.ensureInventoryIcon(name);
			icon.position.x = cursorX
			icon.position.y = -self.height / 2;
			cursorX += icon.width;
		}
	}

	private ensureInventoryIcon(name: PlayerInventoryTypes): EntitySprite {
		const existing = this.inventoryIcons.get(name);
		if (existing) return existing;

		const icon = new EntitySprite({
			fileName: name,
			position: new Point(0, 0),
			anchor: 0.5,
			visible: true,
		});

		this.addChild(icon);
		this.inventoryIcons.set(name, icon);

		return icon;
	}

	getInventorySummary(): string {
		return Array.from(this.inventoryCounts.entries())
			.map(([name, count]) => `${name}:${count}`)
			.join(", ");
	}

}
