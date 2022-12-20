import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three';

export interface ModelLoaderReturn {
    model: THREE.Group;
    mixer: AnimationMixer;
    animations: Map<string, THREE.AnimationAction>;
}

export const loadModel = async (url: string): Promise<ModelLoaderReturn> => {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            const mixer = new THREE.AnimationMixer(gltf.scene);

            const animations: Map<string, THREE.AnimationAction> = new Map();
            gltf.animations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
                animations.set(a.name, mixer.clipAction(a))
            })
            resolve({ model, mixer, animations });
        }, undefined, reject);
    });
}