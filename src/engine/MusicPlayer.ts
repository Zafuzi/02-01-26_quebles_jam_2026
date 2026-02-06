import { SoundLibrary, type SoundSourceMap } from "@pixi/sound";
import type { IMediaInstance } from "@pixi/sound";

type TransitionOptions = {
	fadeInMs?: number;
	crossfadeMs?: number;
};

type StopOptions = {
	fadeOutMs?: number;
};

type MusicPlayerOptions = {
	trackOrder?: string[];
	loopPlaylist?: boolean;
	fadeInMs?: number;
	fadeOutMs?: number;
	crossfadeMs?: number;
};

export class MusicPlayer extends SoundLibrary {
	private _trackOrder: string[];
	private _currentIndex = -1;
	private _currentAlias: string | null = null;
	private _currentInstance: IMediaInstance | null = null;
	private _loopPlaylist: boolean;
	private _fadeInMs: number;
	private _fadeOutMs: number;
	private _crossfadeMs: number;
	private _playToken = 0;
	private _fadeHandles = new Map<number, { cancel: () => void }>();
	public maxVolume = 0.1;

	constructor(sounds: SoundSourceMap, options?: MusicPlayerOptions) {
		super();
		this.add(sounds);
		this._trackOrder = Object.keys(sounds);
		this._loopPlaylist = true;
		this._fadeInMs = 800;
		this._fadeOutMs = 800;
		this._crossfadeMs = 1200;
		if (options) {
			this.configure(options);
		}
	}

	public configure(options: MusicPlayerOptions): void {
		if (options.trackOrder) {
			this._trackOrder = options.trackOrder.slice();
		}
		if (typeof options.loopPlaylist === "boolean") {
			this._loopPlaylist = options.loopPlaylist;
		}
		if (typeof options.fadeInMs === "number") {
			this._fadeInMs = options.fadeInMs;
		}
		if (typeof options.fadeOutMs === "number") {
			this._fadeOutMs = options.fadeOutMs;
		}
		if (typeof options.crossfadeMs === "number") {
			this._crossfadeMs = options.crossfadeMs;
		}
	}

	public get trackOrder(): readonly string[] {
		return this._trackOrder;
	}

	public set trackOrder(order: string[]) {
		this._trackOrder = order.slice();
		if (this._trackOrder.length === 0) {
			this._currentIndex = -1;
			this._currentAlias = null;
		} else if (this._currentIndex >= this._trackOrder.length) {
			this._currentIndex = 0;
			this._currentAlias = this._trackOrder[0] ?? null;
		}
	}

	public get currentAlias(): string | null {
		return this._currentAlias;
	}

	public get loopPlaylist(): boolean {
		return this._loopPlaylist;
	}

	public set loopPlaylist(loop: boolean) {
		this._loopPlaylist = loop;
	}

	public start(index = 0, options?: TransitionOptions): IMediaInstance | Promise<IMediaInstance> {
		return this.playIndex(index, options);
	}

	public next(options?: TransitionOptions): IMediaInstance | Promise<IMediaInstance> {
		return this.playIndex(this._currentIndex + 1, options);
	}

	public previous(options?: TransitionOptions): IMediaInstance | Promise<IMediaInstance> {
		return this.playIndex(this._currentIndex - 1, options);
	}

	public stop(options?: StopOptions): void {
		const instance = this._currentInstance;
		if (!instance) {
			return;
		}
		this._playToken += 1;
		this._currentInstance = null;
		this._currentAlias = null;
		this._currentIndex = -1;
		const fadeOutMs = options?.fadeOutMs ?? this._fadeOutMs;
		if (fadeOutMs > 0) {
			void this.fadeTo(instance, 0, fadeOutMs).then(() => {
				instance.stop();
			});
			return;
		}
		instance.stop();
	}

	public play(
		alias: string,
		options?: Parameters<SoundLibrary["play"]>[1],
	): IMediaInstance | Promise<IMediaInstance> {
		const index = this._trackOrder.indexOf(alias);
		if (index !== -1) {
			return this.playIndex(index);
		}
		return super.play(alias, options as any);
	}

	private playIndex(index: number, options?: TransitionOptions): IMediaInstance | Promise<IMediaInstance> {
		if (this._trackOrder.length === 0) {
			throw new Error("MusicPlayer has no tracks to play.");
		}
		const normalized = this.normalizeIndex(index);
		const alias = this._trackOrder[normalized];
		if (!alias) {
			throw new Error("MusicPlayer track alias missing.");
		}
		if (this._currentAlias === alias && this._currentInstance) {
			return this._currentInstance;
		}
		this._currentIndex = normalized;
		return this.playAlias(alias, options);
	}

	private playAlias(alias: string, options?: TransitionOptions): IMediaInstance | Promise<IMediaInstance> {
		const fadeInMs = options?.fadeInMs ?? this._fadeInMs;
		const crossfadeMs = options?.crossfadeMs ?? this._crossfadeMs;
		const previous = this._currentInstance;
		const token = (this._playToken += 1);

		const attach = (instance: IMediaInstance) => {
			this._currentInstance = instance;
			this._currentAlias = alias;
			this.attachAutoAdvance(instance, token);
			if (previous && previous !== instance) {
				if (crossfadeMs > 0) {
					instance.volume = 0;
					void this.fadeTo(instance, this.maxVolume, crossfadeMs);
					void this.fadeOutAndStop(previous, crossfadeMs);
				} else {
					instance.volume = this.maxVolume;
					previous.stop();
				}
				return;
			}
			instance.volume = 0;
			void this.fadeTo(instance, this.maxVolume, fadeInMs);
		};

		const result = super.play(alias, { loop: false });
		if (result instanceof Promise) {
			return result.then((instance) => {
				attach(instance);
				return instance;
			});
		}
		attach(result);
		return result;
	}

	private attachAutoAdvance(instance: IMediaInstance, token: number): void {
		let queuedNext = false;
		const crossfadeMs = this._crossfadeMs;
		if (crossfadeMs > 0) {
			instance.on("progress", (progress, duration) => {
				if (queuedNext) {
					return;
				}
				if (token !== this._playToken || this._currentInstance !== instance) {
					return;
				}
				if (duration <= 0) {
					return;
				}
				const remainingMs = (1 - progress) * duration * 1000;
				if (remainingMs <= crossfadeMs) {
					queuedNext = true;
					if (this._loopPlaylist || this._currentIndex < this._trackOrder.length - 1) {
						this.next({ crossfadeMs });
					}
				}
			});
		}

		instance.once("end", () => {
			if (token !== this._playToken || this._currentInstance !== instance) {
				return;
			}
			if (queuedNext) {
				return;
			}
			if (!this._loopPlaylist && this._currentIndex >= this._trackOrder.length - 1) {
				this._currentInstance = null;
				this._currentAlias = null;
				this._currentIndex = -1;
				return;
			}
			this.next({ fadeInMs: this._fadeInMs });
		});
	}

	private fadeOutAndStop(instance: IMediaInstance, durationMs: number): Promise<void> {
		return this.fadeTo(instance, 0, durationMs).then(() => {
			instance.stop();
		});
	}

	private fadeTo(instance: IMediaInstance, target: number, durationMs: number): Promise<void> {
		const existing = this._fadeHandles.get(instance.id);
		if (existing) {
			existing.cancel();
		}
		if (durationMs <= 0) {
			instance.volume = target;
			return Promise.resolve();
		}
		const startVolume = instance.volume;
		return new Promise((resolve) => {
			let cancelled = false;
			const startTime = performance.now();
			const step = (now: number) => {
				if (cancelled) {
					return;
				}
				const t = Math.min(1, (now - startTime) / durationMs);
				instance.volume = startVolume + (target - startVolume) * t;
				if (t >= 1) {
					this._fadeHandles.delete(instance.id);
					resolve();
					return;
				}
				requestAnimationFrame(step);
			};
			this._fadeHandles.set(instance.id, {
				cancel: () => {
					cancelled = true;
					this._fadeHandles.delete(instance.id);
				},
			});
			requestAnimationFrame(step);
		});
	}

	private normalizeIndex(index: number): number {
		const total = this._trackOrder.length;
		if (total === 0) {
			return 0;
		}
		return ((index % total) + total) % total;
	}
}
