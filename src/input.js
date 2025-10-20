import { world } from './world.js';
import * as THREE from 'three';
import { eventBus } from './event-bus.js';
import { rendererModule } from './renderer.js';

const keyboard = { w: false, a: false, s: false, d: false };

function init(ecs) {
    console.log('Initializing input...');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onDblClick(event) {
        if (world.viewMode !== 'standard') return;

        console.log('Double-click detected');
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, rendererModule.camera);

        const groundEntity = ecs.query(['Ground'])[0];
        if (groundEntity !== undefined) {
            const groundMesh = ecs.getComponent(groundEntity, 'Render').mesh;
            const intersects = raycaster.intersectObject(groundMesh);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                console.log('Emitting ENTER_FIRST_PERSON_VIEW event');
                eventBus.emit('ENTER_FIRST_PERSON_VIEW', { position: intersect.point });
            }
        }
    }

    rendererModule.renderer.domElement.addEventListener('dblclick', onDblClick);

    rendererModule.renderer.domElement.addEventListener('mousemove', (event) => {
        if (world.viewMode !== 'standard') return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, rendererModule.camera);

        const groundEntity = ecs.query(['Ground'])[0];
        if (groundEntity !== undefined) {
            const groundMesh = ecs.getComponent(groundEntity, 'Render').mesh;
            const intersects = raycaster.intersectObject(groundMesh);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const cellX = Math.round(intersect.point.x);
                const cellZ = Math.round(intersect.point.z);
                eventBus.emit('CELL_HOVERED', { x: cellX, z: cellZ });
            } else {
                eventBus.emit('CELL_UNHOVERED');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            eventBus.emit('REGENERATE_MAZE_REQUESTED');
            e.preventDefault();
        } else if (e.code === 'Escape') {
            eventBus.emit('EXIT_FIRST_PERSON_VIEW');
        }

        switch (e.code) {
            case 'KeyW': keyboard.w = true; break;
            case 'KeyA': keyboard.a = true; break;
            case 'KeyS': keyboard.s = true; break;
            case 'KeyD': keyboard.d = true; break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': keyboard.w = false; break;
            case 'KeyA': keyboard.a = false; break;
            case 'KeyS': keyboard.s = false; break;
            case 'KeyD': keyboard.d = false; break;
        }
    });
}

export const inputModule = {
    init,
    get keyboard() { return keyboard; },
};