import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
// import { OrbitControls } from "./Three JS/examples/jsm/controls/OrbitControls.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 200.0);
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations)
    );

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath("./Character/");
    loader.load("Aj.fbx", (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);

      // Alpaca mixer
      this._mixer = new THREE.AnimationMixer(this._target);
      this._mixer2 = new THREE.AnimationMixer(this._target);
      this._mixer3 = new THREE.AnimationMixer(this._target);
      this._mixer4 = new THREE.AnimationMixer(this._target);

      // Wolf mixer
      this._mixerFox1 = new THREE.AnimationMixer(this._target);
      this._mixerFox2 = new THREE.AnimationMixer(this._target);
      this._mixerFox3 = new THREE.AnimationMixer(this._target);
      this._mixerFox4 = new THREE.AnimationMixer(this._target);

      // Stag Mixer
      this._mixerStag1 = new THREE.AnimationMixer(this._target);
      this._mixerStag2 = new THREE.AnimationMixer(this._target);
      this._mixerStag3 = new THREE.AnimationMixer(this._target);
      this._mixerStag4 = new THREE.AnimationMixer(this._target);

      // Bull Mixer
      this._mixerBull1 = new THREE.AnimationMixer(this._target);
      this._mixerBull2 = new THREE.AnimationMixer(this._target);
      this._mixerBull3 = new THREE.AnimationMixer(this._target);
      this._mixerBull4 = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState("idle");
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath("./Character/");
      loader.load("walk.fbx", (a) => {
        _OnLoad("walk", a);
      });
      loader.load("run.fbx", (a) => {
        _OnLoad("run", a);
      });
      loader.load("idle.fbx", (a) => {
        _OnLoad("idle", a);
      });
      loader.load("dance.fbx", (a) => {
        _OnLoad("dance", a);
      });
    });
  }

  get Position() {
    return this._position;
  }

  get Rotation() {
    if (!this._target) {
      return new THREE.Quaternion();
    }
    return this._target.quaternion;
  }

  Update(timeInSeconds) {
    if (!this._stateMachine._currentState) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(2.0);
    }

    if (this._stateMachine._currentState.Name == "dance") {
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
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * -Math.PI * timeInSeconds * this._acceleration.y
      );
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

    this._position.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}

class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = true;
        break;
      case 65: // a
        this._keys.left = true;
        break;
      case 83: // s
        this._keys.backward = true;
        break;
      case 68: // d
        this._keys.right = true;
        break;
      case 32: // SPACE
        this._keys.space = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 65: // a
        this._keys.left = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 68: // d
        this._keys.right = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
    }
  }
}

class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
}

class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState("idle", IdleState);
    this._AddState("walk", WalkState);
    this._AddState("run", RunState);
    this._AddState("dance", DanceState);
  }
}

class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
}

class DanceState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    };
  }

  get Name() {
    return "dance";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["dance"].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener("finished", this._FinishedCallback);

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
    this._parent.SetState("idle");
  }

  _Cleanup() {
    const action = this._parent._proxy._animations["dance"].action;

    action.getMixer().removeEventListener("finished", this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {}
}

class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "walk";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["walk"].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == "run") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Exit() {}

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState("run");
      }
      return;
    }

    this._parent.SetState("idle");
  }
}

class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "run";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["run"].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == "walk") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Exit() {}

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState("walk");
      }
      return;
    }

    this._parent.SetState("idle");
  }
}

class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "idle";
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations["idle"].action;
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

  Exit() {}

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState("walk");
    } else if (input._keys.space) {
      this._parent.SetState("dance");
    }
  }
}

class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-15, 20, -30);
    idealOffset.applyQuaternion(this._params.target.Rotation);
    idealOffset.add(this._params.target.Position);
    return idealOffset;
  }

  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 10, 50);
    idealLookat.applyQuaternion(this._params.target.Rotation);
    idealLookat.add(this._params.target.Position);
    return idealLookat;
  }

  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    // const t = 0.05;
    // const t = 4.0 * timeElapsed;
    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}

class goWild {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();

    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 1000;
    light.shadow.camera.right = -1000;
    light.shadow.camera.top = 1000;
    light.shadow.camera.bottom = -1000;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xffffff, 2.0);
    this._scene.add(light);

    const skyLoader = new GLTFLoader();
    var skybox;
    skyLoader.load("./Skybox/scene.gltf", (sky) => {
      skybox = sky.scene;
      this._scene.add(skybox);
    });

    // Ground
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load("./Texture/grass.webp");

    const ground1 = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000, 10, 10),
      new THREE.MeshStandardMaterial({
        map: grassTexture,
      })
    );
    ground1.castShadow = false;
    ground1.receiveShadow = true;
    ground1.rotation.x = -Math.PI / 2;
    this._scene.add(ground1);

    const texture2Loader = new THREE.TextureLoader();
    const tileTexture = textureLoader.load("./Texture/tile.jpg");

    const ground2 = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500, 10, 10),
      new THREE.MeshStandardMaterial({
        map: tileTexture,
      })
    );
    ground2.castShadow = false;
    ground2.receiveShadow = true;
    ground2.rotation.x = -Math.PI / 2;
    ground2.position.set(0, 0.1, 0)
    // this._scene.add(ground2)

    // Alpaca Nest
    const groundTexture = textureLoader.load("./Texture/ground.webp");

    const fenceLoader = new GLTFLoader();
    fenceLoader.setPath("/Nest/");
    fenceLoader.load("zoo-playground-3.gltf", (fen) => {
      const fence = fen.scene;
      fence.position.set(400, 52, 100);
      fence.scale.setScalar(100);
      this._scene.add(fence);
    });

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();

    const loadAndPlayAlpaca1 = () => {
      const alpacaLoader = new GLTFLoader();
      let mixer;

      alpacaLoader.setPath("/Animals/alpaca/");
      alpacaLoader.load("Alpaca.gltf", (alpa) => {
        const alpaca = alpa.scene;
        alpaca.position.set(400, 1.5, 70);
        alpaca.scale.setScalar(3);

        alpaca.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(alpaca);
        mixer = new THREE.AnimationMixer(alpaca);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle_Headlow");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixer = mixer;
      });
    };

    const loadAndPlayAlpaca2 = () => {
      const alpacaLoader = new GLTFLoader();
      let mixer;

      alpacaLoader.setPath("/Animals/alpaca/");
      alpacaLoader.load("Alpaca.gltf", (alpa) => {
        const alpaca = alpa.scene;
        alpaca.position.set(370, 1.5, 110);
        alpaca.rotation.y = 10;
        alpaca.scale.setScalar(3);

        alpaca.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(alpaca);
        mixer = new THREE.AnimationMixer(alpaca);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixer2 = mixer;
      });
    };

    const loadAndPlayAlpaca3 = () => {
      const alpacaLoader = new GLTFLoader();
      let mixer;

      alpacaLoader.setPath("/Animals/alpaca/");
      alpacaLoader.load("Alpaca.gltf", (alpa) => {
        const alpaca = alpa.scene;
        alpaca.position.set(350, 1.5, 50);
        alpaca.rotation.y = 20;
        alpaca.scale.setScalar(3);

        alpaca.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(alpaca);
        mixer = new THREE.AnimationMixer(alpaca);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixer3 = mixer;
      });
    };

    const loadAndPlayAlpaca4 = () => {
      const alpacaLoader = new GLTFLoader();
      let mixer;

      alpacaLoader.setPath("/Animals/alpaca/");
      alpacaLoader.load("Alpaca.gltf", (alpa) => {
        const alpaca = alpa.scene;
        alpaca.position.set(300, 1.5, 70);
        alpaca.rotation.y = 20;
        alpaca.scale.setScalar(2);

        alpaca.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(alpaca);
        mixer = new THREE.AnimationMixer(alpaca);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixer4 = mixer;
      });
    };

    loadAndPlayAlpaca1(this._scene);
    loadAndPlayAlpaca2(this._scene);
    loadAndPlayAlpaca3(this._scene);
    loadAndPlayAlpaca4(this._scene);

    // Fox nest

    const fenceLoaderFox = new GLTFLoader();
    fenceLoaderFox.setPath("/Nest/");
    fenceLoaderFox.load("zoo-playground-3.gltf", (fens) => {
      const fencee = fens.scene;
      fencee.position.set(-30, 52, 250);
      fencee.scale.setScalar(100);

      this._scene.add(fencee);
      // console.log(fencee)
    });

    const loadAndPlayFox1 = () => {
      const foxLoader = new GLTFLoader();
      let mixer;

      foxLoader.setPath("/Animals/wolf/");
      foxLoader.load("Fox.gltf", (alpa) => {
        const fox = alpa.scene;
        fox.position.set(150, 1.5, 200);
        fox.scale.setScalar(3);

        fox.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(fox);
        mixer = new THREE.AnimationMixer(fox);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerFox1 = mixer;
      });
    };

    const loadAndPlayFox2 = () => {
      const foxLoader = new GLTFLoader();
      let mixer;

      foxLoader.setPath("/Animals/wolf/");
      foxLoader.load("Fox.gltf", (alpa) => {
        const fox = alpa.scene;
        fox.position.set(100, 1.5, 200);
        fox.scale.setScalar(3);
        fox.rotation.y = 20;

        fox.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(fox);
        mixer = new THREE.AnimationMixer(fox);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Attack");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerFox2 = mixer;
      });
    };

    const loadAndPlayFox3 = () => {
      const foxLoader = new GLTFLoader();
      let mixer;

      foxLoader.setPath("/Animals/wolf/");
      foxLoader.load("Fox.gltf", (alpa) => {
        const fox = alpa.scene;
        fox.position.set(125, 1.5, 200);
        fox.scale.setScalar(5);
        fox.rotation.y = -20;

        fox.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(fox);
        mixer = new THREE.AnimationMixer(fox);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Attack");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerFox3 = mixer;
      });
    };

    const loadAndPlayFox4 = () => {
      const foxLoader = new GLTFLoader();
      let mixer;

      foxLoader.setPath("/Animals/wolf/");
      foxLoader.load("Fox.gltf", (alpa) => {
        const fox = alpa.scene;
        fox.position.set(125, 1.5, 150);
        fox.scale.setScalar(5);
        fox.rotation.y = -20;

        fox.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(fox);
        mixer = new THREE.AnimationMixer(fox);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixerFox4 = mixer;
      });
    };

    loadAndPlayFox1(this._scene);
    loadAndPlayFox2(this._scene);
    loadAndPlayFox3(this._scene);
    loadAndPlayFox4(this._scene);

    // Stag Nest
    const fenceLoaderStag = new GLTFLoader();
    fenceLoaderStag.setPath("/Nest/");
    fenceLoaderStag.load("zoo-playground-3.gltf", (fens) => {
      const fencee = fens.scene;
      fencee.position.set(200, 52, 200);
      fencee.scale.setScalar(100);
      this._scene.add(fencee);
      // console.log(fencee)
    });

    const loadAndPlayStag1 = () => {
      const stagLoader = new GLTFLoader();
      let mixer;

      stagLoader.setPath("/Animals/stag/");
      stagLoader.load("Stag.gltf", (alpa) => {
        const stag = alpa.scene;
        stag.position.set(-50, 1.5, 200);
        stag.scale.setScalar(5);
        stag.rotation.y = -20;

        stag.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(stag);
        mixer = new THREE.AnimationMixer(stag);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixerStag1 = mixer;
      });
    };

    const loadAndPlayStag2 = () => {
      const stagLoader = new GLTFLoader();
      let mixer;

      stagLoader.setPath("/Animals/stag/");
      stagLoader.load("Stag.gltf", (alpa) => {
        const stag = alpa.scene;
        stag.position.set(-100, 1.5, 200);
        stag.scale.setScalar(5);
        stag.rotation.y = 20;

        stag.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(stag);
        mixer = new THREE.AnimationMixer(stag);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle_Headlow");
        const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixerStag2 = mixer;
      });
    };

    const loadAndPlayStag3 = () => {
      const stagLoader = new GLTFLoader();
      let mixer;

      stagLoader.setPath("/Animals/stag/");
      stagLoader.load("Stag.gltf", (alpa) => {
        const stag = alpa.scene;
        stag.position.set(-150, 1.5, 200);
        stag.scale.setScalar(5);
        stag.rotation.y = 3;

        stag.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(stag);
        mixer = new THREE.AnimationMixer(stag);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Eating");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerStag3 = mixer;
      });
    };

    const loadAndPlayStag4 = () => {
      const stagLoader = new GLTFLoader();
      let mixer;

      stagLoader.setPath("/Animals/stag/");
      stagLoader.load("Stag.gltf", (alpa) => {
        const stag = alpa.scene;
        stag.position.set(-130, 1.5, 250);
        stag.scale.setScalar(5);
        stag.rotation.y = 3;

        stag.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(stag);
        mixer = new THREE.AnimationMixer(stag);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Gallop_Jump");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Idle_2");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerStag4 = mixer;
      });
    };

    loadAndPlayStag1(this._scene);
    loadAndPlayStag2(this._scene);
    loadAndPlayStag3(this._scene);
    loadAndPlayStag4(this._scene);

    // Bull Nest
    const fenceLoaderBull = new GLTFLoader();
    fenceLoaderBull.setPath("/Nest/");
    fenceLoaderBull.load("zoo-playground-3.gltf", (fens) => {
      const fencee = fens.scene;
      fencee.position.set(-250, 52, 200);
      fencee.scale.setScalar(100);
      this._scene.add(fencee);
      // console.log(fencee)
    });

    const loadAndPlayBull1 = () => {
      const bullLoader = new GLTFLoader();
      let mixer;

      bullLoader.setPath("/Animals/bull/");
      bullLoader.load("Bull.gltf", (alpa) => {
        const bull = alpa.scene;
        bull.position.set(-300, 3, 150);
        bull.scale.setScalar(4);
        bull.rotation.y = 3;

        bull.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(bull);
        mixer = new THREE.AnimationMixer(bull);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle");
        const clip2 = THREE.AnimationClip.findByName(clips, "Eating");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixerBull1 = mixer;
      });
    };

    const loadAndPlayBull2 = () => {
      const bullLoader = new GLTFLoader();
      let mixer;

      bullLoader.setPath("/Animals/bull/");
      bullLoader.load("Bull.gltf", (alpa) => {
        const bull = alpa.scene;
        bull.position.set(-305, 2, 203);
        bull.scale.setScalar(4);
        bull.rotation.y = 15;

        bull.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(bull);
        mixer = new THREE.AnimationMixer(bull);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle");
        const clip2 = THREE.AnimationClip.findByName(clips, "Attack_Headbutt");
        const action = mixer.clipAction(clip);
        const action2 = mixer.clipAction(clip2);
        action.play();
        action2.play();

        this._mixerBull2 = mixer;
      });
    };

    const loadAndPlayBull3 = () => {
      const bullLoader = new GLTFLoader();
      let mixer;

      bullLoader.setPath("/Animals/bull/");
      bullLoader.load("Bull.gltf", (alpa) => {
        const bull = alpa.scene;
        bull.position.set(-360, 1.5, 190);
        bull.scale.setScalar(4);
        bull.rotation.y = 20;

        bull.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(bull);
        mixer = new THREE.AnimationMixer(bull);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle_2");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Attack_Headbutt");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerBull3 = mixer;
      });
    };

    const loadAndPlayBull4 = () => {
      const bullLoader = new GLTFLoader();
      let mixer;

      bullLoader.setPath("/Animals/bull/");
      bullLoader.load("Bull.gltf", (alpa) => {
        const bull = alpa.scene;
        bull.position.set(-265, 1.5, 180);
        bull.scale.setScalar(4);
        bull.rotation.y = 20;

        bull.traverse((c) => {
          c.castShadow = true;
        });
        this._scene.add(bull);
        mixer = new THREE.AnimationMixer(bull);
        const clips = alpa.animations;

        const clip = THREE.AnimationClip.findByName(clips, "Idle");
        // const clip2 = THREE.AnimationClip.findByName(clips, "Attack_Headbutt");
        const action = mixer.clipAction(clip);
        // const action2 = mixer.clipAction(clip2);
        action.play();
        // action2.play();

        this._mixerBull4 = mixer;
      });
    };

    loadAndPlayBull1(this._scene);
    loadAndPlayBull2(this._scene);
    loadAndPlayBull3(this._scene);
    loadAndPlayBull4(this._scene);

    const fontLoader = new FontLoader()
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    fontLoader.setPath("/node_modules/three/examples/fonts/");
    fontLoader.load("helvetiker_bold.typeface.json", (font) => {
      const textMaterial = new THREE.MeshPhongMaterial({
        color: 'blue',
        emissive: "0x0000FF"
      })
      const textGeometry1 = new TextGeometry("Alpaca", {
        font: font,
        size: 12,
        height: 5
      });

      const textGeometry2 = new TextGeometry("Fox", {
        font: font,
        size: 12,
        height: 5,
      });

      const textGeometry3 = new TextGeometry("Stag", {
        font: font,
        size: 12,
        height: 5,
      });

      const textGeometry4 = new TextGeometry("Bull", {
        font: font,
        size: 12,
        height: 5,
      });

      const textMesh1 = new THREE.Mesh(textGeometry1, textMaterial);
      const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial);
      const textMesh3 = new THREE.Mesh(textGeometry3, textMaterial);
      const textMesh4 = new THREE.Mesh(textGeometry4, textMaterial);

      textMesh1.position.set(350, 60, 50)
      textMesh1.rotation.y = 11

      textMesh2.position.set(150, 60, 170)
      textMesh2.rotation.y = 10
      
      textMesh3.position.set(-70, 60, 230)
      textMesh3.rotation.y = 15.5

      textMesh4.position.set(-300, 60, 200)
      textMesh4.rotation.y = 14.5

      this._scene.add(textMesh1)
      this._scene.add(textMesh2)
      this._scene.add(textMesh3)
      this._scene.add(textMesh4)

      let isClicked = true
      window.addEventListener("click", (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(pointer, this._camera)

        const intersects = raycaster.intersectObjects([...this._scene.children, textMesh1], true)
  
        for(let i=0; i<intersects.length; i++) {
          const intersectedObject = intersects[i].object
          if(intersectedObject == textMesh1) {
            if(isClicked) {
              const linkUrl = "Animals/alpaca/index.html"
              window.open(linkUrl, "_blank")

              isClicked = true
            } else {
              isClicked = false
            }
          }
        }
        
      })

      window.addEventListener("click", (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(pointer, this._camera)

        const intersects = raycaster.intersectObjects([...this._scene.children, textMesh2], true)
  
        for(let i=0; i<intersects.length; i++) {
          const intersectedObject = intersects[i].object
          if(intersectedObject == textMesh2) {
            if(isClicked) {
              const linkUrl = "Animals/wolf/index.html"
              window.open(linkUrl, "_blank")

              isClicked = true
            } else {
              isClicked = false
            }
          }
        }
        
      })

      window.addEventListener("click", (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(pointer, this._camera)

        const intersects = raycaster.intersectObjects([...this._scene.children, textMesh3], true)
  
        for(let i=0; i<intersects.length; i++) {
          const intersectedObject = intersects[i].object
          if(intersectedObject == textMesh3) {
            if(isClicked) {
              const linkUrl = "Animals/stag/index.html"
              window.open(linkUrl, "_blank")

              isClicked = true
            } else {
              isClicked = false
            }
          }
        }
        
      })

      window.addEventListener("click", (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(pointer, this._camera)

        const intersects = raycaster.intersectObjects([...this._scene.children, textMesh4], true)
  
        for(let i=0; i<intersects.length; i++) {
          const intersectedObject = intersects[i].object
          if(intersectedObject == textMesh4) {
            if(isClicked) {
              const linkUrl = "Animals/bull/index.html"
              window.open(linkUrl, "_blank")

              isClicked = true
            } else {
              isClicked = false
            }
          }
        }
        
      })
    });

    // Avika Cart
    const avikaLoader = new GLTFLoader()
    var avika
    avikaLoader.load("./Resource/avika/scene.gltf", (model) => {
      avika = model.scene
      avika.position.set(340, 0, -200)
      avika.rotation.y = -1
      avika.scale.setScalar(10)
      this._scene.add(avika)
    })

    // Hot Dog Cart
   const foodLoader = new GLTFLoader()
   var hotDog
   foodLoader.load("./Resource/hotDog/scene.gltf", (model) => {
    hotDog = model.scene
    hotDog.position.set(360, 0, -170)
    hotDog.scale.setScalar(12)
    hotDog.rotation.y = 0.5
    this._scene.add(hotDog)
   }) 
   
   // Stall
   const stallLoader = new GLTFLoader()
   var stall
   stallLoader.load("./Resource/stall/scene.gltf", (model) => {
    stall = model.scene
    stall.position.set(-400, 0, 0)
    stall.scale.setScalar(2)
    stall.rotation.y = 20.5
    this._scene.add(stall)
   })

   // Tree
   const treeLoader = new GLTFLoader()
   var tree
   treeLoader.load("./Resource/tree/scene.gltf", (model) => {
    tree = model.scene
    tree.position.set(250, 0, 100)
    tree.scale.setScalar(0.15)
    this._scene.add(tree)
   })
   const treeLoader2 = new GLTFLoader()
   var tree2
   treeLoader2.load("./Resource/tree/scene.gltf", (model) => {
    tree2 = model.scene
    tree2.position.set(25, 0, 200)
    tree2.scale.setScalar(0.15)
    this._scene.add(tree2)
   })
   const treeLoader3 = new GLTFLoader()
   var tree3
   treeLoader3.load("./Resource/tree/scene.gltf", (model) => {
    tree3 = model.scene
    tree3.position.set(200, 0, 100)
    tree3.scale.setScalar(0.15)
    this._scene.add(tree3)
   })
   const treeLoader4 = new GLTFLoader()
   var tree4
   treeLoader4.load("./Resource/tree/scene.gltf", (model) => {
    tree4 = model.scene
    tree4.position.set(400, 0, -40)
    tree4.scale.setScalar(0.15)
    this._scene.add(tree4)
   })
   const treeLoader5 = new GLTFLoader()
   var tree5
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree5 = model.scene
    tree5.position.set(-200, 0, 200)
    tree5.scale.setScalar(0.15)
    this._scene.add(tree5)
   })
   var tree6
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree6 = model.scene
    tree6.position.set(-180, 0, -370)
    tree6.scale.setScalar(0.15)
    this._scene.add(tree6)
   })
   var tree7
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree7 = model.scene
    tree7.position.set(120, 0, -410)
    tree7.scale.setScalar(0.15)
    this._scene.add(tree7)
   })
   var tree8
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree8 = model.scene
    tree8.position.set(-300, 0, -300)
    tree8.scale.setScalar(0.15)
    this._scene.add(tree8)
   })
   var tree9
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree9 = model.scene
    tree9.position.set(-400, 0, -100)
    tree9.scale.setScalar(0.15)
    this._scene.add(tree9)
   })
   var tree10
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree10 = model.scene
    tree10.position.set(300, 0, -230)
    tree10.scale.setScalar(0.15)
    this._scene.add(tree10)
   })
   var tree11
   treeLoader5.load("./Resource/tree/scene.gltf", (model) => {
    tree11 = model.scene
    tree11.position.set(-400, 0, 80)
    tree11.scale.setScalar(0.15)
    this._scene.add(tree11)
   })

   // Bench
   const benchLoader = new GLTFLoader()
   var bench
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench = model.scene
    bench.position.set(400, 0, -80)
    bench.scale.setScalar(2)
    bench.rotation.y = 5
    this._scene.add(bench)
   })
   var bench2
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench2 = model.scene
    bench2.position.set(390, 0, -120)
    bench2.scale.setScalar(2)
    bench2.rotation.y = 5
    this._scene.add(bench2)
   })
   var bench3
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench3 = model.scene
    bench3.position.set(-100, 0, -380)
    bench3.scale.setScalar(2)
    bench3.rotation.y = 6.5
    this._scene.add(bench3)
   })
   var bench4
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench4 = model.scene
    bench4.position.set(-140, 0, -370)
    bench4.scale.setScalar(2)
    bench4.rotation.y = 6.5
    this._scene.add(bench4)
   })
   var bench5
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench5 = model.scene
    bench5.position.set(55, 0, -400)
    bench5.scale.setScalar(2)
    bench5.rotation.y = 6.5
    this._scene.add(bench5)
   })
   var bench6
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench6 = model.scene
    bench6.position.set(100, 0, -410)
    bench6.scale.setScalar(2)
    bench6.rotation.y = 6.5
    this._scene.add(bench6)
   })
   var bench7
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench7 = model.scene
    bench7.position.set(-230, 0, -350)
    bench7.scale.setScalar(2)
    bench7.rotation.y = 0.5
    this._scene.add(bench7)
   })
   var bench8
   benchLoader.load("./Resource/bench/scene.gltf", (model) => {
    bench8 = model.scene
    bench8.position.set(-280, 0, -350)
    bench8.scale.setScalar(2)
    bench8.rotation.y = 0.5
    this._scene.add(bench8)
   })

   // grass
   const grassLoader = new GLTFLoader()
   var grass
   grassLoader.load("./Resource/grass/scene.gltf", (model) => {
    grass = model.scene
    grass.position.set(200, 0, 100)
    this._scene.add(grass)
   })
   const grassLoader2 = new GLTFLoader()
   var grass2
   grassLoader2.load("./Resource/grass/scene.gltf", (model) => {
    grass2 = model.scene
    grass2.position.set(25, 0, 200)
    this._scene.add(grass2)
   })
   const grassLoader3 = new GLTFLoader()
   var grass3
   grassLoader2.load("./Resource/grass/scene.gltf", (model) => {
    grass3 = model.scene
    grass3.position.set(20, 0, 200)
    this._scene.add(grass3)
   })
   const grassLoader4 = new GLTFLoader()
   var grass4
   grassLoader2.load("./Resource/grass/scene.gltf", (model) => {
    grass4 = model.scene
    grass4.position.set(30, 0, 200)
    this._scene.add(grass4)
   })
   const grassLoader5 = new GLTFLoader()
   var grass5
   grassLoader5.load("./Resource/grass/scene.gltf", (model) => {
    grass5 = model.scene
    grass5.position.set(210, 0, 100)
    this._scene.add(grass5)
   })
   const grassLoader6 = new GLTFLoader()
   var grass6
   grassLoader6.load("./Resource/grass/scene.gltf", (model) => {
    grass6 = model.scene
    grass6.position.set(250, 0, 100)
    this._scene.add(grass6)
   })
   const grassLoader7 = new GLTFLoader()
   var grass7
   grassLoader7.load("./Resource/grass/scene.gltf", (model) => {
    grass7 = model.scene
    grass7.position.set(400, 0, -40)
    this._scene.add(grass7)
   })
   const grassLoader8 = new GLTFLoader()
   var grass8
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass8 = model.scene
    grass8.position.set(-200, 0, 200)
    this._scene.add(grass8)
   })
   var grass9
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass9 = model.scene
    grass9.position.set(-180, 0, -365)
    this._scene.add(grass9)
   })
   var grass10
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass10 = model.scene
    grass10.position.set(120, 0, -400)
    this._scene.add(grass10)
   })
   var grass11
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass11 = model.scene
    grass11.position.set(300, 0, -230)
    this._scene.add(grass11)
   })
   var grass12
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass12 = model.scene
    grass12.position.set(-400, 0, 80)
    this._scene.add(grass12)
   })
   var grass12
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass12 = model.scene
    grass12.position.set(-400, 0, -100)
    this._scene.add(grass12)
   })
   var grass13
   grassLoader8.load("./Resource/grass/scene.gltf", (model) => {
    grass13 = model.scene
    grass13.position.set(-300, 0, -300)
    this._scene.add(grass13)
   })

   // Playground
   const playLoader = new GLTFLoader()
   var playground
   playLoader.load("./Resource/playground/scene.gltf", (model) => {
    playground = model.scene
    playground.position.set(0, 2, -400)
    playground.scale.setScalar(15)
    this._scene.add(playground)
   })
   
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };
    this._controls = new BasicCharacterController(params);

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map((m) => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }

    this._thirdPersonCamera.Update(timeElapsedS);

    if (this._mixer) {
      this._mixer.update(timeElapsedS);
    }
    if (this._mixer2) {
      this._mixer2.update(timeElapsedS);
    }
    if (this._mixer3) {
      this._mixer3.update(timeElapsedS);
    }
    if (this._mixer4) {
      this._mixer4.update(timeElapsedS);
    }
    if (this._mixerFox1) {
      this._mixerFox1.update(timeElapsedS);
    }
    if (this._mixerFox2) {
      this._mixerFox2.update(timeElapsedS);
    }
    if (this._mixerFox3) {
      this._mixerFox3.update(timeElapsedS);
    }
    if (this._mixerFox4) {
      this._mixerFox4.update(timeElapsedS);
    }
    if (this._mixerStag1) {
      this._mixerStag1.update(timeElapsedS);
    }
    if (this._mixerStag2) {
      this._mixerStag2.update(timeElapsedS);
    }
    if (this._mixerStag3) {
      this._mixerStag3.update(timeElapsedS);
    }
    if (this._mixerStag4) {
      this._mixerStag4.update(timeElapsedS);
    }
    if (this._mixerBull1) {
      this._mixerBull1.update(timeElapsedS);
    }
    if (this._mixerBull2) {
      this._mixerBull2.update(timeElapsedS);
    }
    if (this._mixerBull3) {
      this._mixerBull3.update(timeElapsedS);
    }
    if (this._mixerBull4) {
      this._mixerBull4.update(timeElapsedS);
    }
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new goWild();
});

function _LerpOverFrames(frames, t) {
  const s = new THREE.Vector3(0, 0, 0);
  const e = new THREE.Vector3(100, 0, 0);
  const c = s.clone();

  for (let i = 0; i < frames; i++) {
    c.lerp(e, t);
  }
  return c;
}

function _TestLerp(t1, t2) {
  const v1 = _LerpOverFrames(100, t1);
  const v2 = _LerpOverFrames(50, t2);
  console.log(v1.x + " | " + v2.x);
}

_TestLerp(0.01, 0.01);
_TestLerp(1.0 / 100.0, 1.0 / 50.0);
_TestLerp(1.0 - Math.pow(0.3, 1.0 / 100.0), 1.0 - Math.pow(0.3, 1.0 / 50.0));
