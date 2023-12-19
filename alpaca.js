import * as THREE from "./Three JS/build/three.module.js"
import { GLTFLoader } from "./Three JS/examples/jsm/loaders/GLTFLoader.js";

class alpaca {
  constructor(scene) {
    this._scene = scene
    this._Init()
  }

  _Init() {
    const assetLoader = new GLTFLoader()
    var alpaca
    let mixer
    
    assetLoader.setPath("./Animals/alpaca/")
    assetLoader.load(
      "Alpaca.gltf",
      function (gltf) {
        alpaca = gltf.scene;
        scene.add(alpaca);
        mixer = new THREE.AnimationMixer(alpaca);
        const clips = gltf.animations;

        // Play a certain animation
        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        // // Play all animations at the same time
        // clips.forEach(function(clip) {
        //     const action = mixer.clipAction(clip);
        //     action.play();
        // });
        this._mixer = mixer
      },

    // const renderer = new THREE.WebGLRenderer();

    // renderer.setSize(window.innerWidth, window.innerHeight);

    // document.body.appendChild(renderer.domElement);

    // const scene = new THREE.Scene();

    // const camera = new THREE.PerspectiveCamera(
    //   45,
    //   window.innerWidth / window.innerHeight,
    //   0.1,
    //   1000
    // );

    // renderer.setClearColor(0xa3a3a3);

    // camera.position.set(10, 10, 10);

    // const grid = new THREE.GridHelper(30, 30);
    // scene.add(grid);

      undefined,
      function (error) {
        console.error(error);
      }
    );

    // const clock = new THREE.Clock();
    // function animate() {
    //   if (mixer) mixer.update(clock.getDelta());
    //   renderer.render(scene, camera);
    // }

    // renderer.setAnimationLoop(animate);

    // window.addEventListener("resize", function () {
    //   camera.aspect = window.innerWidth / window.innerHeight;
    //   camera.updateProjectionMatrix();
    //   renderer.setSize(window.innerWidth, window.innerHeight);
    // });
  }
}

export default alpaca