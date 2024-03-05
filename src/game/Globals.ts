import { Path, Vector2, PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const intObjStart = {t: 0};
export const intObjEnd = {t: 1};
export const pathIntVec = new Vector2();

export const tilePositions = [
    0.0012, 0.0252, 0.0492, 0.0732, 0.0972, 0.1212, 0.1452, 0.1692, 0.1932, 0.2212,
    0.2512, 0.2752, 0.2992, 0.3232, 0.3472, 0.3712, 0.3952, 0.4192, 0.4432, 0.4712,
    0.5012, 0.5252, 0.5492, 0.5732, 0.5972, 0.6212, 0.6452, 0.6692, 0.6932, 0.7212,
    0.7512, 0.7752, 0.7992, 0.8232, 0.8472, 0.8712, 0.8952, 0.9192, 0.9432, 0.9712
];
export const boardPath = new Path().moveTo(15, 20).lineTo(-15, 20).bezierCurveTo(-20, 20, -20, 20, -20, 15).lineTo(-20,-15).bezierCurveTo(-20, -20, -20, -20, -15, -20).lineTo(15, -20).bezierCurveTo(20, -20, 20, -20, 20, -15).lineTo(20, 15).bezierCurveTo(20, 20, 20, 20, 15, 20);

export const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
export const controls = new OrbitControls(camera, canvas);