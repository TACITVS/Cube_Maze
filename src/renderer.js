import { eventBus } from './event-bus.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

let scene, camera, renderer, orbitControls, pointerLockControls, highlightMesh;

function init() {
    console.log('Initializing renderer...');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.minPolarAngle = Math.PI / 4;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.01;

    pointerLockControls = new PointerLockControls(camera, renderer.domElement);

    const highlightGeometry = new THREE.PlaneGeometry(1, 1);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
    highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.rotation.x = -Math.PI / 2;
    highlightMesh.position.y = 0.01;
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemisphereLight);

    eventBus.on('ENTITY_CREATED', ({ entityId, components }) => {
        if (components.Render) {
            scene.add(components.Render.mesh);
        }
    });

    eventBus.on('ENTITY_REMOVED', ({ entityId, components }) => {
        if (components && components.Render) {
            scene.remove(components.Render.mesh);
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateHighlight(position) {
    if (position) {
        highlightMesh.position.set(position.x, 0.01, position.z);
        highlightMesh.visible = true;
    } else {
        highlightMesh.visible = false;
    }
}

function switchControls(viewMode) {
    if (viewMode === 'first-person') {
        if (orbitControls) {
            orbitControls.dispose();
            orbitControls = null;
        }
        pointerLockControls.lock();
    } else {
        pointerLockControls.unlock();
        orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.minPolarAngle = Math.PI / 4;
        orbitControls.maxPolarAngle = Math.PI / 2 - 0.01;
    }
}

function update(ecs, viewMode) {
    const physicsEntities = ecs.query(['Physics', 'Render']);
    physicsEntities.forEach(id => {
        const phys = ecs.getComponent(id, 'Physics');
        const rend = ecs.getComponent(id, 'Render');
        if (phys.body && rend.mesh) {
            rend.mesh.position.copy(phys.body.position);
            rend.mesh.quaternion.copy(phys.body.quaternion);
        }
    });

    if (viewMode === 'standard') {
        orbitControls.update();
    }
    renderer.render(scene, camera);
}

export const rendererModule = {
    init,
    update,
    switchControls,
    updateHighlight,
    get camera() { return camera; },
    get renderer() { return renderer; },
};
