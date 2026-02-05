import { Assets, Point, Sprite, Ticker } from "pixi.js";
import { collideEntities } from "../../engine/Collision.ts";
import { Clamp, EntitySprite, InputMoveAction, normalize } from "../../engine/Engine.ts";
import { envLayer } from "../GLOBALS.ts";
import type { Entity } from "../../engine/Entity";
import type { Pickup } from "./pickup.ts";

export type PlayerInventoryTypes = "apple" | "egg" | "clucker";
export class Player extends EntitySprite {
	public inventoryCounts: Map<PlayerInventoryTypes, number> = new Map();
	public inventoryMax: Map<PlayerInventoryTypes, number> = new Map();

	public inventoryLockTimeout: number = 0;
	private pickupCandidates: Set<Pickup> = new Set();
	private dropTargets: Map<string, { target: Entity; onDrop?: (count: number) => void }> = new Map();
	private inventoryIcons: Map<PlayerInventoryTypes, Sprite[]> = new Map();

	constructor() {
		super({
			fileName: "b_s",
			position: new Point(250, 250),
			speed: 12,
			collide: true,
			anchor: 0.5,
			layer: envLayer,
		});
		this.inventoryMax.set("apple", 4);
		this.inventoryMax.set("egg", 3);
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

	addToInventory = (item: Pickup): boolean => {
		const current = this.inventoryCounts.get(item.fileName as PlayerInventoryTypes) ?? 0;
		const max = this.inventoryMax.get(item.fileName as PlayerInventoryTypes) ?? Number.POSITIVE_INFINITY;

		if (current >= max) return false;

		this.inventoryCounts.set(item.fileName as PlayerInventoryTypes, current + 1);
		return true;
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
		if (this.addToInventory(item)) {
			this.unregisterPickup(item);
			item.destroy();
		}
	}

	private updateInventoryIcons() {
		const instance = this;
		const activeTypes = Array.from(this.inventoryCounts.entries())
			.filter(([, count]) => count > 0)
			.map(([name]) => name);

		const iconGap = 6;
		const stackGap = 4;
		const baseY = -instance.sprite.height / 2 - 6;

		const totalWidth =
			activeTypes.reduce((sum, name) => {
				const tex = Assets.get(name);
				return sum + (tex?.width ?? 0);
			}, 0) +
			Math.max(0, activeTypes.length - 1) * iconGap;

		let cursorX = -totalWidth / 2;

		for (const [name, icons] of this.inventoryIcons.entries()) {
			const count = this.inventoryCounts.get(name) ?? 0;
			if (count > 0) continue;
			for (const icon of icons) {
				this.removeChild(icon);
				icon.destroy();
			}
			this.inventoryIcons.delete(name);
		}

		for (const name of activeTypes) {
			const tex = Assets.get(name);
			if (!tex) continue;

			const count = this.inventoryCounts.get(name) ?? 0;
			const icons = this.ensureInventoryIcons(name, count);

			while (icons.length > count) {
				const icon = icons.pop();
				if (!icon) break;
				this.removeChild(icon);
				icon.destroy();
			}

			for (let i = 0; i < icons.length; i++) {
				const icon = icons[i];
				icon.visible = true;
				icon.position.x = cursorX + tex.width / 2;
				icon.position.y = baseY - i * (tex.height + stackGap);
			}

			cursorX += tex.width + iconGap;
		}
	}

	private ensureInventoryIcons(name: PlayerInventoryTypes, count: number): Sprite[] {
		let icons = this.inventoryIcons.get(name);
		if (!icons) {
			icons = [];
			this.inventoryIcons.set(name, icons);
		}

		while (icons.length < count) {
			const icon = new Sprite(Assets.get(name));
			icon.anchor.set(0.5, 1);
			icon.visible = false;
			this.addChild(icon);
			icons.push(icon);
		}

		return icons;
	}

	getInventorySummary(): string {
		return Array.from(this.inventoryCounts.entries())
			.map(([name, count]) => `${name}:${count}`)
			.join(", ");
	}
}
