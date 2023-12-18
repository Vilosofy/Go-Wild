import * as THREE from "./Three JS/build/three.module.js"

import { GLTFLoader } from "./Three JS/examples/jsm/loaders/GLTFLoader.js"
import { FBXLoader } from "./Three JS/examples/jsm/loaders/FBXLoader.js"

import { OrbitControls } from "./Three JS/examples/jsm/controls/OrbitControls.js"

class CharacterControllerProxy {
    constructor(animations) {
        this._animations = animations
    }

    get animations() {
        return this._animations
    }
}

// Function buat animated character yang terlihat
class CharacterController {
    constructor(params) {
        this._Init(params)        
    }
    
    _Init(params) {
        this._params = params
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations));

        this._LoadModels();
    }

    _LoadModels() {
        const characterLoader = new FBXLoader()
        characterLoader.setPath("./Character/")
        characterLoader.load("Aj.fbx", (char) => {
            fbx.scale.setScalar(0.1)
            fbx.traverse(c => {
                c.castShadow = true
            })

            this._target = char
            this._params.scene.add(this._target)
            this._mixer = new THREE.AnimationMixer(this._target)

            this._manager = new THREE.LoadingManager()
            this._manager.onLoad = () => {
                this._stateMachine.SetState("idle")
            }

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0]
                const action = this._mixer.clipAction(clip)

                this._animations[animName] = {
                    clip: clip,
                    action: action
                }
            }

            const loader = new FBXLoader(this._manager)
            loader.load("Idle.fbx", (a) => { _OnLoad("idle", a)} )
            loader.load("Walking.fbx", (a) => { _OnLoad("walk", a)} )
            loader.load("Run.fbx", (a) => { _OnLoad("run", a)} )
            loader.load("Dancing.fbx", (a) => { _OnLoad("dance", a)} )
        })
    }

    update(timeInSeconds) {
        if(this._target) {
            return
        }

        this._stateMachine.update(timeInSeconds, this._input)

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );

        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

        velocity.add(frameDecceleration)

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();

        if (this._input._keys.shift) {
            acc.multiplyScalar(2.0);
        }
        if (this._stateMachine._currentState.Name == 'dance') {
            acc.multiplyScalar(0.0);
        }
        if (this._input._keys.forward) {
            velocity.z += acc.z * timeInSeconds;
        }  
        if (this._input._keys.backward) {
            velocity.z -= acc.z * timeInSeconds;
        }
        if (this._input._keys.left) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }
        if (this._input._keys.right) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        oldPosition.copy(controlObject.position);

        if(this._mixer) {
            this._mixer.update(timeInSeconds)
        }

    }
    
}

// Function yang merespon ke keyboard input
class CharacterControllerInput {
    constructor() {
        this._Initialize()
    }
    
    _Initialize() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        }

        document.addEventListener("keydown", (e) => this._onKeyDown(e), false)
        document.addEventListener("keyup", (e) => this._onKeyUp(e), false)
    }

    _onKeyDown(event) {
        switch(event.keyCode) {
            case 1:
                // W
                this._keys.forward = true
                break
            case 2:
                // A
                this._keys.left = true
                break
            case 3:
                // S
                this._keys.backward = true
                break
            case 4:
                // D
                this._keys.right = true
                break
            case 5:
                // Space
                this._keys.space = true
                break
            case 6:
                this._keys.shift = true
                break
        }
    }

    _onKeyUp(event) {
        switch(event.keyCode) {
            case 1:
                // W
                this._keys.forward = false
                break
            case 2:
                // A
                this._keys.left = false
                break
            case 3:
                // S
                this._keys.backward = false
                break
            case 4:
                // D
                this._keys.right = false
                break
            case 5:
                // Space
                this._keys.space = false
                break
            case 6:
                this._keys.shift = false
                break
        }
    }
}

class FiniteStateMachine {
    constructor() {
        this._states = {}
        this._currentState = null
    }

    _AddState(name , type) {
        this._states[name] = type
    }

    SetState(name) {
        const prevState = this._currentState

        if(prevState) {
            if (prevState.name == name) {
                return
            }
            prevState.Exit()
        }

        const state = new this._states[name](this)

        this._currentState = state
        state.Enter(prevState)
    }

    Update(timeElapsed, input) {
        if(this._currentState) {
            this._currentState.update(timeElapsed, input)
        }
    }
}

class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super()
        this._proxy = proxy
        this._Init()
    }

    _Init() {
        this._AddState("idle", IdleState)
        this._AddState("walk", WalkState)
        this._AddState("run", RunState)
        this._AddState("dance", DanceState)
    }
}

class State {
    constructor(parent) {
        this._parent = parent
    }

    Enter() {}
    Exit() {}
    Update() {}
}

class DanceState extends State {
    constructor(parent) {
        super(parent)

        this._FinishedCallback = () => {
            this._Finished()
        }
    }

    get Name() {
        return "dance"
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['dance'].action;
        const mixer = curAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);
    
        if (prevState) {
          const prevAction = this._parent._proxy._animations[prevState.Name].action;
    
          curAction.reset();  
          curAction.setLoop(THREE.LoopOnce, 1);
          curAction.clampWhenFinished = true;
          curAction.crossFadeFrom(prevAction, 0.2, true);
          curAction.play();
        } else {
          curAction.play();
        }
      }

      _Finished() {
        this._Cleanup();
        this._parent.SetState('idle');
      }
    
      _Cleanup() {
        const action = this._parent._proxy._animations['dance'].action;
        
        action.getMixer().removeEventListener('finished', this._CleanupCallback);
      }
    
      Exit() {
        this._Cleanup();
      }
    
      Update(_) {
      }
}

class WalkState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'walk';
    }
  
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['walk'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
  
        curAction.enabled = true;
  
        if (prevState.Name == 'run') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }
  
        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }
  
    Exit() {
    }
  
    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (input._keys.shift) {
          this._parent.SetState('run');
        }
        return;
      }
  
      this._parent.SetState('idle');
    }
}

class RunState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'run';
    }
  
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['run'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
  
        curAction.enabled = true;
  
        if (prevState.Name == 'walk') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }
  
        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }
  
    Exit() {
    }
  
    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (!input._keys.shift) {
          this._parent.SetState('walk');
        }
        return;
      }
  
      this._parent.SetState('idle');
    }
}

class IdleState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'idle';
    }
  
    Enter(prevState) {
      const idleAction = this._parent._proxy._animations['idle'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        idleAction.time = 0.0;
        idleAction.enabled = true;
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.setEffectiveWeight(1.0);
        idleAction.crossFadeFrom(prevAction, 0.5, true);
        idleAction.play();
      } else {
        idleAction.play();
      }
    }
  
    Exit() {
    }
  
    Update(_, input) {
      if (input._keys.forward || input._keys.backward) {
        this._parent.SetState('walk');
      } else if (input._keys.space) {
        this._parent.SetState('dance');
      }
    }
}

class goWild {
    constructor() {
        this._Initialize()
    }

    _Initialize() {
        // Width & Height
        const width = window.innerWidth
        const height = window.innerHeight


        // Renderer
        this._renderer = new THREE.WebGLRenderer({antialias: true})
        this._renderer.setSize(width, height)
        this._renderer.shadowMap.enabled = true
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this._renderer.setPixelRatio(window.devicePixelRatio)

        document.body.appendChild(this._renderer.domElement)

        // Scene
        this._scene = new THREE.Scene()

        // Camera
        const camera_1 = new THREE.PerspectiveCamera(
            60,
            width / height,
            0.1,
            1000
        )
        camera_1.position.set(75, 20, 0)
        camera_1.lookAt(0, 0, 0)

        const control = new OrbitControls(camera_1, this._renderer.domElement)

        let activeCamera = camera_1

        // Light
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF)
        directionalLight.position.set(50, 50, 50)
        directionalLight.target.position.set(0, 0, 0)
        directionalLight.castShadow = true
        directionalLight.shadow.bias = 0.01
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048
        directionalLight.shadow.camera.near = 1
        directionalLight.shadow.camera.far = 500
        directionalLight.shadow.camera.left = 200
        directionalLight.shadow.camera.right = -200
        directionalLight.shadow.camera.top = 200
        directionalLight.shadow.camera.bottom = -200

        this._scene.add(directionalLight)

        const ambientLight = new THREE.AmbientLight(0x404040)
        this._scene.add(ambientLight)

        // Ground
        const groundGeo = new THREE.PlaneGeometry(500, 500)
        const groundMat = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF
        })
        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.castShadow = false
        ground.receiveShadow = true
        ground.rotation.x = -Math.PI / 2
        this._scene.add(ground)

        // Character
        let mixer

        const characterLoader = new FBXLoader
        characterLoader.setPath("./Character/")
        characterLoader.load("Aj.fbx", (char) => {
            char.scale.setScalar(0.1)
            char.traverse(c => {
                c.castShadow = true
            })

            this._scene.add(char)
            
            const animationLoader = new FBXLoader()
            animationLoader.setPath("./Character/")
            animationLoader.load("Dancing.fbx", (anim) => {
                this._mixer = new THREE.AnimationMixer(char)
                const dance = this._mixer.clipAction(anim.animations[0])
                dance.play()
            })
        })


        // Skybox
        const skyLoader = new GLTFLoader()
        var skybox

        skyLoader.load("./Skybox/scene.gltf", (sky) => {
            skybox = sky.scene
            this._scene.add(skybox)
        })


        // // Animate Function
        // let clock = new THREE.Clock()
        // function animate() {
        //     requestAnimationFrame(animate)

        //     const delta = clock.getDelta()

        //     if(mixer) {
        //         mixer.update(delta)
        //     }

        //     this._renderer.render(this._scene, activeCamera)
        // }

        // animate()
    }

    _LoadAnimatedModel() {
        const params = {
            camera: this._camera,
            scene: this._scene
        }

        this._controls = new CharacterController(params)
    }

    _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
        const loader = new FBXLoader()
        loader.setPath(path)
        loader.load(modelFile, (char) => {
            char.scale.setScalar(0.1)
            char.traverse(c => {
                c.castShadow = true
            })
            char.position.copy(offset)

            const anim = new FBXLoader()
            anim.setPath(path)
            anim.load(animFile, (anim) => {
                const mix = new THREE.AnimationMixer(char)
                this._mixer.push(mix)
                const idle = mix.clipAction(anim.animations[0])
                idle.play()
            })
            this._scene.add(char)
        })
    }

    _LoadModel() {
        const loader = new GLTFLoader()
        loader.load("./Resource/thing.glb", (gltf) => {
            gltf.scene.traverse(c => {
                c.castShadow = true
            })
            this._scene.add(gltf.scene)
        })
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
              this._previousRAF = t;
            }
      
            this._RAF();
      
            this._threejs.render(this._scene, activeCamera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
          })
    }

    _Step() {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new goWild();
});