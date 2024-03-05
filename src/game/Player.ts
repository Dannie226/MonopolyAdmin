import { Mesh, MeshStandardMaterial, BackSide, BufferGeometry, MathUtils } from "three";
import { Property } from "./Tile";
import { Assets } from "./Assets";
import { Tween } from "../libs/tween.js";
import { intObjStart, intObjEnd, boardPath, tilePositions, pathIntVec, controls } from "./Globals";
import { Settings } from "../ui/Settings";

interface Player {
    money: number;
    name: string;
    moveOrder: number;
    properties: Property[];
    position: number;
    mesh: Mesh;

    moveToTile(position: number): Promise<void>;
    moveForward(tiles: number): Promise<void>;
    isDone(): boolean;
    makeMove(): Promise<void>;
}

abstract class PlayerBase implements Player {
    public money: number;
    public name: string;
    public moveOrder: number;
    public properties: Property[];
    public position: number;
    public mesh: Mesh<BufferGeometry, MeshStandardMaterial>;

    constructor(name: string, settings: Settings) {
        this.money = 1500;
        this.name = name;
        this.moveOrder = -1;
        this.properties = [];
        this.position = 0;
        this.mesh = new Mesh(Assets.getPawnGeometry(), new MeshStandardMaterial({ side: BackSide }));

        settings.addFollowPoint(name, this.mesh.position);
    }
    
    moveToTile(tile: number) {
        tile = MathUtils.euclideanModulo(tile, 40);
        return new Promise<void>((res, rej) => {
            const iBoardPos = tilePositions[this.position];
            let eBoardPos = tilePositions[tile];

            if(iBoardPos - eBoardPos < -0.5) {
                eBoardPos -= 1.0;
            } else if(iBoardPos - eBoardPos > 0.5) {
                eBoardPos += 1.0;
            }

            intObjStart.t = iBoardPos;
            intObjEnd.t = eBoardPos;

            const playerMoveTween = new Tween(intObjStart).to(intObjEnd, 1500).onUpdate(({t}) => {
                boardPath.getPointAt(MathUtils.euclideanModulo(t, 1), pathIntVec);

                this.mesh.position.set(pathIntVec.x, 2, pathIntVec.y);
                if(this.mesh.position == controls.target)
                    controls.update();
            });
            
            playerMoveTween.start();

            playerMoveTween.onComplete(() => res());
            this.position = tile;
        });
    }

    moveForward(tiles: number) {
        return this.moveToTile(this.position + tiles);
    }

    abstract isDone(): boolean;
    abstract makeMove(): Promise<void>;
}

class ClientPlayer extends PlayerBase {
    isDone() {
        return true;
    }

    async makeMove() {
        
    }
}

class ServerPlayer extends PlayerBase {
    isDone() {
        return true;
    }

    async makeMove() {

    }
}

export { Player, ClientPlayer, ServerPlayer };