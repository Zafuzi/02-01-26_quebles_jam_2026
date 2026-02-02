import { EntitySprite, type EntitySpriteOptions } from "../../engine/Entity";

export class Bin extends EntitySprite {
    constructor(options: {} & EntitySpriteOptions) {
        super({
            ...options,
            zIndex: 1,
            collide: true,
        });
    }

    update = () => { };
}
