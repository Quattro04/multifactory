import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three'
import { CameraHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bullet } from './bullet';
import {onlinePlayers, room, Animation} from './socketServer';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
// const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1000);
const ratio = window.innerHeight / window.innerWidth
const width = 40
const height = width * ratio
const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );

camera.position.set(0, 10, 0);
camera.lookAt(0, 0, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// LIGHTS
light()

// FLOOR
generateFloor()

// MODEL WITH ANIMATIONS
let models: Map<string, THREE.Group> = new Map()
let model: THREE.Group;
var characterControls: CharacterControls
new GLTFLoader().load('models/Soldier.glb', function (gltf) {
    model = gltf.scene;
    model.traverse(function (object: any) {
        if (object.isMesh) object.castShadow = true;
    });
    scene.add(model);

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;

    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map()
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
        animationsMap.set(a.name, mixer.clipAction(a))
    })

    characterControls = new CharacterControls(model, mixer, animationsMap,  camera,  'Idle')
});

// CONTROL KEYS
const keysPressed = {}
// const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    // keyDisplayQueue.down(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = true
}, false);
document.addEventListener('keyup', (event) => {
    // keyDisplayQueue.up(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = false
}, false);

const isMoving = () => {
    return Object.values(keysPressed).find(v => v)
}

// SHOOTING
const bullets: Array<Bullet> = []
let bulletId = 0

let isShooting: boolean = false
let isShootingTimeout: boolean = true
let mouseX: number
let mouseZ: number
let angle: number
const bulletSpeed: number = 0.1
document.addEventListener('mousemove', (event) => {
    mouseX = event.x - window.innerWidth / 2
    mouseZ = event.y - window.innerHeight / 2
    angle = Math.atan2(-mouseX, -mouseZ)
}, false);

document.addEventListener('mousedown', (event) => {
    isShooting = true
}, false);
document.addEventListener('mouseup', (event) => {
    isShooting = false
}, false);

// AXES HELPER
// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

const clock = new THREE.Clock();
let socketKey = true
// ANIMATE
function animate() {
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }

    // Update animations of online players
    Object.values(onlinePlayers).map(p => {
        p.mixer.update(mixerUpdateDelta)
    })

    if (isShooting && isShootingTimeout) {
        isShootingTimeout = false
        const bullet = new Bullet(model.position.x, model.position.z, angle, bulletSpeed)
        scene.add(bullet.getObject())
        bullets.push(bullet)

        // Send bullet to server
        room.then((room) => room.send({
            event: "BULLET_ADD",
            bullet
        }));

        setTimeout(() => {
            isShootingTimeout = true
        }, 300)
    }

    Object.values(bullets).forEach(bullet => {
        bullet.updatePosition()
    })

    // if (model && angle) {
    //     model.rotation.set(0, angle, 0)
    // }

    // Send position to server if moving
    if (socketKey && model) {
        room.then((room) => room.send({
            event: "PLAYER_POSITION_UPDATE",
            x: model.position.x,
            z: model.position.z,
            keysPressed
        }));
        socketKey = false
    }

    // orbitControls.update()
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

setInterval(() => {
    socketKey = true
}, 10)

// RESIZE HANDLER
function onWindowResize() {
    // camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // keyDisplayQueue.updatePosition()
}
window.addEventListener('resize', onWindowResize);

function generateFloor() {
    // TEXTURES
    const textureLoader = new THREE.TextureLoader();
    const placeholder = textureLoader.load("./textures/placeholder/placeholder.png");
    const sandBaseColor = textureLoader.load("./textures/sand/Sand 002_COLOR.jpg");
    const sandNormalMap = textureLoader.load("./textures/sand/Sand 002_NRM.jpg");
    const sandHeightMap = textureLoader.load("./textures/sand/Sand 002_DISP.jpg");
    const sandAmbientOcclusion = textureLoader.load("./textures/sand/Sand 002_OCC.jpg");

    const WIDTH = 80
    const LENGTH = 80

    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 1024, 1024);
    const material = new THREE.MeshStandardMaterial(
        {
            map: sandBaseColor, normalMap: sandNormalMap,
            displacementMap: sandHeightMap, displacementScale: 0.1,
            aoMap: sandAmbientOcclusion
        })
    wrapAndRepeatTexture(material.map)
    wrapAndRepeatTexture(material.normalMap)
    wrapAndRepeatTexture(material.displacementMap)
    wrapAndRepeatTexture(material.aoMap)
    // const material = new THREE.MeshPhongMaterial({ map: placeholder})

    const floor = new THREE.Mesh(geometry, material)
    floor.receiveShadow = true
    floor.rotation.x = - Math.PI / 2
    scene.add(floor)
}

function wrapAndRepeatTexture (map: THREE.Texture) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.x = map.repeat.y = 10
}

function light() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(- 60, 100, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 50;
    dirLight.shadow.camera.left = - 50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
    // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

const changeAnimation = (from: THREE.AnimationAction, to: THREE.AnimationAction) => {
    from.fadeOut(0.2)
    to.reset().fadeIn(0.2).play()
}

const addPlayer = (x: number, z: number, playerSession: string) => {
    new GLTFLoader().load('models/Soldier.glb', function (gltf) {
        const model: THREE.Group = gltf.scene;
        model.traverse(function (object: any) {
            if (object.isMesh) object.castShadow = true;
        });
        scene.add(model);

        // Make animationsMap for this model
        const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap: Map<string, THREE.AnimationAction> = new Map()
        gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
            animationsMap.set(a.name, mixer.clipAction(a))
        })

        animationsMap.get('Idle').play();

        // Add coordinates, model and animations to onlinePlayers
        const player = {
            sessionId: playerSession,
            x: x,
            z: z,
            model,
            animations: animationsMap,
            mixer,
            currentAnimation: Animation.IDLE
        }
        onlinePlayers[player.sessionId] = player
    })
}

interface Data {
    event: string;
    x?: number;
    z?: number;
    sessionId?: string;
    keysPressed?: Record<string, any>;
    bullet?: any;
    players: Array<any>
}

room.then(room => {
    room.onMessage((data: Data) => {

        console.log(data.event)

        if (data.event === 'CURRENT_PLAYERS') {
            console.log(data.players)
            Object.values(data.players).map(p => {
                addPlayer(p.x, p.z, p.sessionId)
            })
        }
        if (data.event === 'PLAYER_JOINED') {
            if (!model || !scene) return
            addPlayer(data.x, data.z, data.sessionId)
        }
        if (data.event === 'PLAYER_LEFT') {
        }
        if (data.event === 'PLAYER_POSITION_UPDATE') {
            const onlinePlayer = onlinePlayers[data.sessionId]
            if (!onlinePlayer) return
            onlinePlayer.x = data.x
            onlinePlayer.z = data.z
            onlinePlayer.model.position.set(data.x, 0, data.z)
            if (data.keysPressed) {
                const playerIsMoving = Object.values(data.keysPressed).find(v => v)

                if (playerIsMoving) {
                    // Rotate model
                    const rotation = characterControls.directionOffset(data.keysPressed)
                    onlinePlayer.model.rotation.set(0, rotation, 0)
                    // Animation should be Run
                    // Check if current animation is Run. If not, change to it
                    if (onlinePlayer.currentAnimation !== Animation.RUN) {
                        changeAnimation(onlinePlayer.animations.get(onlinePlayer.currentAnimation), onlinePlayer.animations.get(Animation.RUN))
                        onlinePlayer.currentAnimation = Animation.RUN
                    }
                } else {
                    // Animation should be Idle
                    if (onlinePlayer.currentAnimation !== Animation.IDLE) {
                        changeAnimation(onlinePlayer.animations.get(onlinePlayer.currentAnimation), onlinePlayer.animations.get(Animation.IDLE))
                        onlinePlayer.currentAnimation = Animation.IDLE
                    }
                }
            }
        }
        if (data.event === 'BULLET_ADD') {
            console.log(data.bullet)
            const bullet = new Bullet(data.bullet.x, data.bullet.z, data.bullet.angle, data.bullet.speed)
            scene.add(bullet.getObject())
            bullets.push(bullet)
        }
    })
})