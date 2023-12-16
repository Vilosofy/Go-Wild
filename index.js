import * as THREE from "./Three JS/build/three.module.js"
import { GLTFLoader } from "./Three JS/examples/jsm/loaders/GLTFLoader.js"
import { FBXLoader } from "./Three JS/examples/jsm/loaders/FBXLoader.js"
import { OrbitControls } from "./Three JS/examples/jsm/controls/OrbitControls.js"

const width = window.innerWidth
const height = window.innerHeight

// Renderer
const renderer = new THREE.WebGL1Renderer()
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setSize(width, height)

document.body.appendChild(renderer.domElement)

// Camera
const camera_1 = new THREE.PerspectiveCamera(
    60,
    width / height,
    0.1,
    1000
)
camera_1.position.set(75, 20, 0)
const control = new OrbitControls(camera_1, renderer.domElement)

// Scene
const scene = new THREE.Scene()

// light
const directLight = new THREE.DirectionalLight(0xFFFFFF)
directLight.position.set(100, 100, 100)
directLight.target.position.set(0, 0, 0)
directLight.castShadow = true
directLight.shadow.bias = 0.01
scene.add(directLight)

const ambientLight = new THREE.AmbientLight(0x404040)
scene.add(ambientLight)

// Skybox
const background = new GLTFLoader()
var skybox
background.load('./Skybox/scene.gltf', (gltf) => {
    skybox = gltf.scene
    scene.add(skybox)
})

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 1, 1),
    new THREE.MeshStandardMaterial({
        color: 0xFFFFFF
    })
)
ground.castShadow = false
ground.receiveShadow = true
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// Character
let mixer

const character = new FBXLoader()
character.load('./Character/Aj.fbx', (fbx) => {
    fbx.scale.setScalar(0.1)
    fbx.traverse(c => {
        c.castShadow = true
    })

    const animate = new FBXLoader()
    animate.load('./Character/Idle.fbx', (anim) => {
        if (anim.animations && anim.animations.length > 0) {
            mixer = new THREE.AnimationMixer(fbx)
            const idle = mixer.clipAction(anim.animations[0])
            idle.play()
        } else {
            console.error('No animations found in the loaded file.')
        }
    })
    scene.add(fbx)
})

// Function Animate
function animate() {
    requestAnimationFrame(animate)
    control.update()
    renderer.render(scene, camera_1)
}

animate()