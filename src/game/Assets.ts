import { Object3D, LoadingManager, Texture, Path, BufferGeometry, LatheGeometry, Vector3, EquirectangularReflectionMapping } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

class Assets {
    private static manager: LoadingManager;
    private static gltfLoader: GLTFLoader;
    private static hdrLoader: RGBELoader;
    
    private static table: Object3D;
    private static board: Object3D;
    private static die: Object3D;
    private static pawnGeo: BufferGeometry;
    private static background: Texture;

    private static initPromise: Promise<void>;
    
    private constructor() {

    }

    public static async init() {
        let resolve = null;
        Assets.initPromise = new Promise((res, rej) => {
            resolve = res;
        });

        Assets.manager = new LoadingManager();
        Assets.gltfLoader = new GLTFLoader(Assets.manager);
        Assets.hdrLoader = new RGBELoader(Assets.manager);

        Assets.table = (await Assets.gltfLoader.loadAsync("/resources/models/table.glb")).scene.children[0];
        Assets.background = await Assets.hdrLoader.loadAsync("/resources/hdr/soliltude_2k.hdr");
        Assets.board = (await Assets.gltfLoader.loadAsync("/resources/models/board.glb")).scene.children[0].children[0].children[0].children[0].children[1];
        Assets.die = (await Assets.gltfLoader.loadAsync("/resources/models/die.glb")).scene;

        const path = new Path();

        path.absarc(0, 0.5, 0.5, Math.PI / 2, 19 / 12 * Math.PI, true);
        path.quadraticCurveTo(0.5, 0, 0.75, -2);

        Assets.pawnGeo = new LatheGeometry(path.getPoints(10), 40);

        const normAttr = Assets.pawnGeo.getAttribute("normal");
        const v = new Vector3();

        for(let i = 0; i < normAttr.count; i++) {
            v.fromBufferAttribute(normAttr, i);
            v.negate();

            normAttr.setXYZ(v.x, v.y, v.z, i);
        }

        Assets.background.mapping = EquirectangularReflectionMapping;

        resolve();
    }

    public static async finishLoad() {
        await Assets.initPromise;
    }

    public static getTableModel(): Object3D {
        return Assets.table;
    }

    public static getBoardModel(): Object3D {
        return Assets.board;
    }

    public static getDieModel(): Object3D {
        return Assets.die;
    }

    public static getPawnGeometry(): BufferGeometry {
        return Assets.pawnGeo;
    }

    public static getBackground(): Texture {
        return Assets.background;
    }
}

export { Assets };