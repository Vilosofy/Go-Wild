import * as THREE from "three";
import { OrbitControls } from "./Three JS/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "./Three JS/examples/jsm/loaders/GLTFLoader";

export class Alpaca {
  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.mixer = null; // Initialize mixer as null

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.renderer.setClearColor(0xa3a3a3);

    const orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(10, 10, 10);
    orbit.update();

    const grid = new THREE.GridHelper(30, 30);
    this.scene.add(grid);

    const assetLoader = new GLTFLoader();

    assetLoader.load(
      "../assets/Alpaca.gltf",
      (gltf) => {
        const model = gltf.scene;
        this.scene.add(model);
        this.mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = this.mixer.clipAction(clip);
        const action2 = this.mixer.clipAction(clip2);
        action.play();
        action2.play();
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );

    const clock = new THREE.Clock();
    const animate = () => {
      if (this.mixer) this.mixer.update(clock.getDelta());
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(animate);
    };

    this.renderer.setAnimationLoop(animate);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}