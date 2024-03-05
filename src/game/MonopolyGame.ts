import { WebGLRenderer, Scene, Camera, PerspectiveCamera, Path, Mesh, MeshStandardMaterial, BackSide, Vector3, BufferGeometry, Line, LineBasicMaterial } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import { Assets } from "./Assets";
import * as TWEEN from "../libs/tween";
import { ClientPlayer } from "./Player";
import { canvas, controls, camera } from "./Globals";
import { Settings } from "../ui/Settings";

class MonopolyGame {
    private renderer: WebGLRenderer;

    private scene: Scene;

    constructor() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.renderer = new WebGLRenderer({ canvas, antialias: true });
        this.scene = new Scene();
        camera.position.set(-1, 1.75, 1.5).multiplyScalar(50);
    }

    async init(settings: Settings) {
        controls.enablePan = false;
        this.renderer.setClearColor(0xBFD1E5);
        this.renderer.clearColor();

        const scope = this;

        await Assets.finishLoad();

        const table = Assets.getTableModel() as Mesh;
        const board = Assets.getBoardModel() as Mesh;

        table.geometry.translate(0, -1.003702998161316, 0);
        table.scale.set(50, 50, 50);

        board.geometry.rotateX(-Math.PI / 2);
        board.geometry.translate(0, -4.95, 0);
        board.geometry.scale(1 / 32, 1, 1 / 32);

        this.scene.background = this.scene.environment = Assets.getBackground();

        this.scene.add(table, board);

        const pawn = new ClientPlayer("Dannie", settings);
        const gui = new GUI();

        const pawnFolder = gui.addFolder("Pawn");
        pawnFolder.add(pawn.mesh.material, "roughness", 0, 1);
        pawnFolder.add(pawn.mesh.material, "metalness", 0, 1);
        pawnFolder.addColor(pawn.mesh.material, "color");
        
        this.scene.add(pawn.mesh);

        const moveFolder = gui.addFolder("Movement");
        const movePars = {
            position: 0,
            move() {
                pawn.moveForward(this.position);
            }
        };

        moveFolder.add(movePars, "position", -20, 20, 1);
        moveFolder.add(movePars, "move");

        this.renderer.setAnimationLoop(function() {
            TWEEN.update();
            scope.renderer.render(scope.scene, camera);
        });
    }
}

export { MonopolyGame };