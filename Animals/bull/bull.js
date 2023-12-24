import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const monkeyUrl = new URL("Bull.gltf", import.meta.url);

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);

document.getElementById("container3D").appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);


const orbit = new OrbitControls(camera, renderer.domElement);

camera.position.set(10, 10, 10);
orbit.update();

// Grass
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load("../../Texture/grass.webp");

let plane = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({
    map: grassTexture,
  })
);
plane.castShadow = true;
plane.receiveShadow = true;
plane.rotation.x = -Math.PI / 2;
// plane.position.set(0, 0, -15);
scene.add(plane);


const assetLoader = new GLTFLoader();

let mixer;
assetLoader.load(
  monkeyUrl.href,
  function (gltf) {
    const model = gltf.scene;
    // model.position.set(10, 0, 10); // Set the position of the alpaca
    scene.add(model);
    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;

    // Play a certain animation
    const clip = THREE.AnimationClip.findByName(clips, "Walk");
    const clip2 = THREE.AnimationClip.findByName(clips, "Attack_Headbutt");
    const action = mixer.clipAction(clip);
    const action2 = mixer.clipAction(clip2);
    action.play();
    action2.play();

    // Add a point light
    const light = new THREE.SpotLight(0xffffff, 1000);
    light.position.set(10, 20, 10);
    light.helper = new THREE.SpotLightHelper(light);
    scene.add(light);

  },
  undefined,
  function (error) {
    console.error(error);
  }
);

const skyLoader = new GLTFLoader();
var skybox;
skyLoader.load("../../Skybox/scene.gltf", (sky) => {
  skybox = sky.scene;
  scene.add(skybox);
});

const clock = new THREE.Clock();
function animate() {
  if (mixer) mixer.update(clock.getDelta());
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
