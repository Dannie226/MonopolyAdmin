import { Player } from "./Player";
import { SocketCommunicator, DataType } from "../server/SocketCommunicator";
import { Tile } from "./Tile";

class Board {
    private players: Player[];
    private currentPlayer: number;
    private tiles: Tile[];

    private communicator: SocketCommunicator;

    constructor(communicator: SocketCommunicator) {
        this.players = [];
        this.communicator = communicator;

        this.communicator.addListener(DataType.START_GAME, data => {
            this.startGame(data.order);
        });
    }

    public addPlayer(player: Player) {
        this.players.push(player);
    }

    public startGame(order: string[]) {
        let tmp: Player[] = [];
        tmp.length = this.players.length;
        for(let i = 0; i < order.length; i++) {
            for(const player of this.players) {
                if(player.name == order[i]) {
                    player.moveOrder = i;
                    tmp[i] = player;
                    break;
                }
            }
        }

        this.players = tmp;
    }
}

export { Board };