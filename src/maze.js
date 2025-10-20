import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { UnionFind } from './ecs.js';
import { config } from './config.js';
import { eventBus } from './event-bus.js';

function createMazeTexture(mazeSize) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = '#000000'; // Walls
    context.fillRect(0, 0, 512, 512);
    context.fillStyle = '#ffffff'; // Paths

    const numCells = mazeSize * mazeSize;
    const uf = new UnionFind(numCells);
    const hWalls = Array.from({ length: mazeSize }, () => Array(mazeSize).fill(true));
    const vWalls = Array.from({ length: mazeSize }, () => Array(mazeSize - 1).fill(true));
    const edges = [];

    for (let r = 0; r < mazeSize; r++) {
        for (let c = 0; c < mazeSize - 1; c++) {
            edges.push({ u: r * mazeSize + c, v: r * mazeSize + (c + 1), weight: Math.random(), isHorizontal: true, r, c });
        }
    }

    for (let r = 0; r < mazeSize - 1; r++) {
        for (let c = 0; c < mazeSize; c++) {
            edges.push({ u: r * mazeSize + c, v: (r + 1) * mazeSize + c, weight: Math.random(), isHorizontal: false, r, c });
        }
    }

    edges.sort((a, b) => a.weight - b.weight);

    for (const edge of edges) {
        if (uf.union(edge.u, edge.v)) {
            if (edge.isHorizontal) {
                vWalls[edge.r][edge.c] = false;
            } else {
                hWalls[edge.r][edge.c] = false;
            }
        }
    }

    const cellPx = 512 / (2 * mazeSize + 1);
    for (let r = 0; r < mazeSize; r++) {
        for (let c = 0; c < mazeSize; c++) {
            const pxR = (2 * r + 1) * cellPx;
            const pxC = (2 * c + 1) * cellPx;
            context.fillRect(pxC, pxR, cellPx, cellPx);
        }
    }

    for (let r = 0; r < mazeSize; r++) {
        for (let c = 0; c < mazeSize - 1; c++) {
            if (!vWalls[r][c]) {
                const pxR = (2 * r + 1) * cellPx;
                const pxC = (2 * c + 2) * cellPx;
                context.fillRect(pxC, pxR, cellPx, cellPx);
            }
        }
    }

    for (let r = 0; r < mazeSize - 1; r++) {
        for (let c = 0; c < mazeSize; c++) {
            if (!hWalls[r][c]) {
                const pxR = (2 * r + 2) * cellPx;
                const pxC = (2 * c + 1) * cellPx;
                context.fillRect(pxC, pxR, cellPx, cellPx);
            }
        }
    }

    return new THREE.CanvasTexture(canvas);
}

function createGround(ecs, mazeSize, mazeTexture) {
    const groundId = ecs.createEntity();
    
    const groundGeometry = new THREE.PlaneGeometry(2 * mazeSize + 1, 2 * mazeSize + 1);
    const groundMaterial = new THREE.MeshLambertMaterial({ map: mazeTexture, side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;

    ecs.addComponent(groundId, 'Render', { mesh: groundMesh });
    ecs.addComponent(groundId, 'Ground', {});

    const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: new CANNON.Material('default') });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    ecs.addComponent(groundId, 'Physics', { body: groundBody });

    eventBus.emit('ENTITY_CREATED', { entityId: groundId, components: { Render: { mesh: groundMesh }, Physics: { body: groundBody } } });
}

function tileWithCubes(ecs, mazeSize, canvas) {
    
    const context = canvas.getContext('2d');
    const cellPx = 512 / (2 * mazeSize + 1);
    const imageData = context.getImageData(0, 0, 512, 512).data;

    for (let r = 0; r < 2 * mazeSize + 1; r++) {
        for (let c = 0; c < 2 * mazeSize + 1; c++) {
            const px = Math.floor(c * cellPx + cellPx / 2);
            const py = Math.floor(r * cellPx + cellPx / 2);
            const i = (py * 512 + px) * 4;
            if (imageData[i] === 0) { // Black pixel = wall
                const pos = new THREE.Vector3(c - mazeSize, 0.5, r - mazeSize);
                createBlock(ecs, pos, true);
            }
        }
    }
}

function createBlock(ecs, initPos, isStatic = false) {
    const id = ecs.createEntity();

    const colors = [];
    for (let i = 0; i < 6; i++) {
        const hue = Math.floor(Math.random() * 256);
        colors.push(new THREE.Color().setHSL(hue / 256, 0.7, 0.5));
    }

    const materials = colors.map(color => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(config.cubeSize, config.cubeSize, config.cubeSize), materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    mesh.add(line);
    ecs.addComponent(id, 'Render', { mesh });
    ecs.addComponent(id, 'Clickable', {});

    const body = new CANNON.Body({ mass: isStatic ? 0 : 1, type: isStatic ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC, shape: new CANNON.Box(new CANNON.Vec3(config.cubeSize / 2, config.cubeSize / 2, config.cubeSize / 2)), material: new CANNON.Material('default') });
    body.position.copy(initPos);
    ecs.addComponent(id, 'Physics', { body });

    eventBus.emit('ENTITY_CREATED', { entityId: id, components: { Render: { mesh }, Physics: { body } } });
}

function generateMazeAndSpawn(ecs, mazeSize) {
        const entitiesToRemove = ecs.query(['Physics']);
    entitiesToRemove.forEach(id => {
        const renderComponent = ecs.getComponent(id, 'Render');
        if (renderComponent) {
            const mesh = renderComponent.mesh;
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => {
                        if (material.map && typeof material.map.dispose === 'function') {
                            material.map.dispose();
                        }
                        material.dispose();
                    });
                } else {
                    if (mesh.material.map && typeof mesh.material.map.dispose === 'function') {
                        mesh.material.map.dispose();
                    }
                    mesh.material.dispose();
                }
            }
        }

        const components = { Render: ecs.getComponent(id, 'Render'), Physics: ecs.getComponent(id, 'Physics') };
        eventBus.emit('ENTITY_REMOVED', { entityId: id, components });
        ecs.removeEntity(id);
    });

    const mazeTexture = createMazeTexture(mazeSize);
    createGround(ecs, mazeSize, mazeTexture);
    tileWithCubes(ecs, mazeSize, mazeTexture.image);
}

export const mazeModule = {
    createGround,
    tileWithCubes,
    generateMazeAndSpawn,
};
