import { SoundLibrary, type SoundSourceMap } from "@pixi/sound";

export class MusicPlayer extends SoundLibrary {
	constructor(sounds: SoundSourceMap) {
		super();
		this.add(sounds);
	}
}
