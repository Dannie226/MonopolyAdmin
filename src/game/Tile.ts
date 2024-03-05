import { Player } from "./Player";

interface Tile {
    onLand(player: Player): void;
}

class Property implements Tile {
    private owner: Player;

    public constructor() {
        this.owner = null;
    }

    onLand(player: Player) {

    }
}

export { Tile, Property };