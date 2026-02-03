import { type Viewport } from "pixi-viewport";
import { Assets, Point, Ticker } from "pixi.js";
import { Entity, EntitySprite, InputMoveAction, normalize, PlayerInteract } from "../../engine/Engine.ts";
import type { Pickup } from "./pickup.ts";
import { TriggerZone } from "./trigger_zone";

export class Player extends EntitySprite {
	public inventory: Pickup | null = null;
	public inventory_lock_timeout: number = 0;
	private moveDir: Point = new Point(0, 0);
	private inventoryOffset: Point = new Point(0, 0);
	private interactQueued: boolean = false;
	public readonly triggerZone: TriggerZone;

	constructor(viewport: Viewport) {
		super({
			fileName: "bot_face_front",
			position: new Point(250, 250),
			scale: new Point(0.3, 0.3),
			speed: 5,
			collide: true,
		});

		this.sprite.anchor.set(0.5);
		this.sprite.zIndex = 2;

		this.boundTo.width = viewport.width / viewport.scale.x;
		this.boundTo.height = viewport.height / viewport.scale.y;

		this.inventoryOffset.set(0, 10);

		this.triggerZone = new TriggerZone(this, {
			alive: true,
			body: {
				width: this.sprite.width + 100,
				height: this.sprite.height + 100,
			},
			scale: this.scale,
		});

		this.addChild(this.triggerZone);
	}

	update = (ticker: Ticker) => {
		this.interactQueued = !!PlayerInteract.value;

		this.keepInBounds();

		const [moveX, moveY] = InputMoveAction.value;
		this.moveDir.set(moveX, moveY);
		normalize(this.moveDir);

		this.x += this.moveDir.x * this.speed * ticker.deltaTime;
		this.y -= this.moveDir.y * this.speed * ticker.deltaTime;

		if (this.inventory_lock_timeout > 0) {
			this.inventory_lock_timeout -= 1;
		}

		if (this.inventory?.position) {
			this.inventory.position.set(
				this.position.x + this.inventoryOffset.x,
				this.position.y + this.inventoryOffset.y,
			);
			this.inventory.keepInBounds();
		}

		if (moveY > 0) {
			if (this.fileName !== "bot_face_back") {
				this.fileName = "bot_face_back";
				this.sprite.texture = Assets.get(this.fileName);
			}
		} else {
			if (this.fileName !== "bot_face_front") {
				this.fileName = "bot_face_front";
				this.sprite.texture = Assets.get(this.fileName);
			}
		}

		this.triggerZone.position = this.position;
	};

	handleTriggers(pickups: Pickup[], dropZones: Entity[]): void {
		let justPickedUp = false;
		if (!this.inventory && this.inventory_lock_timeout <= 0) {
			for (let i = 0; i < pickups.length; i++) {
				const pickup = pickups[i];
				if (!pickup.alive || !pickup.collide) continue;
				if (this.triggerZone.contains(pickup.collider)) {
					console.log(pickup.uid);
					this.inventory = pickup;
					justPickedUp = true;
					return;
				}
			}
		}

		if (this.inventory && !justPickedUp && this.interactQueued) {
			for (let i = 0; i < dropZones.length; i++) {
				if (this.triggerZone.contains(dropZones[i].collider)) {
					this.inventory?.drop();
					break;
				}
			}

			this.inventory = null;
			this.inventory_lock_timeout = 50;
		}
	}
}
