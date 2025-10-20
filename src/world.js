import { ECS } from './ecs.js';
import { eventBus } from './event-bus.js';
import { config } from './config.js';
import { rendererModule } from './renderer.js';
import { physicsModule } from './physics.js';
import { mazeModule } from './maze.js';
import { uiModule } from './ui.js';
import { inputModule } from './input.js';

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class World {
    constructor() {
        this.ecs = new ECS();
        this.lastFrameTime = 0;
        this.isRunning = false;
        this.mazeSize = config.mazeSize;
        this.viewMode = 'standard';
        this.player = { entityId: null, body: null, velocity: new CANNON.Vec3() };
    }

    init() {
        console.log('Initializing world...');
        rendererModule.init();
        physicsModule.init();
        uiModule.init();
        inputModule.init(this.ecs);

        eventBus.on('MAZE_SIZE_CHANGED', ({ size }) => {
            this.mazeSize = size;
            uiModule.settings.mazeSize = size;
            mazeModule.generateMazeAndSpawn(this.ecs, this.mazeSize);
            setTimeout(() => {
                uiModule.destroy();
                uiModule.init();
            }, 0);
        });

        eventBus.on('REGENERATE_MAZE_REQUESTED', () => {
            mazeModule.generateMazeAndSpawn(this.ecs, this.mazeSize);
            setTimeout(() => {
                uiModule.destroy();
                uiModule.init();
            }, 0);
        });

        eventBus.on('ENTER_FIRST_PERSON_VIEW', ({ position }) => {
            console.log('Entering first-person view at', position);
            if (this.viewMode === 'standard') {
                this.viewMode = 'first-person';
                rendererModule.camera.position.set(0, 1, 0);
                rendererModule.camera.rotation.set(0, 0, 0);
                this.createPlayer(position);
                rendererModule.switchControls('first-person');
            }
        });

        eventBus.on('EXIT_FIRST_PERSON_VIEW', () => {
            console.log('Exiting first-person view');
            try {
                if (this.viewMode === 'first-person') {
                    this.viewMode = 'standard';
                    this.removePlayer();
                    rendererModule.switchControls('standard');
                }
            } catch (error) {
                console.error('Error exiting first-person view:', error);
            }
        });

        eventBus.on('CELL_HOVERED', ({ x, z }) => {
            rendererModule.updateHighlight({ x, z });
        });

        eventBus.on('CELL_UNHOVERED', () => {
            rendererModule.updateHighlight(null);
        });

        mazeModule.generateMazeAndSpawn(this.ecs, this.mazeSize);
    }

    start() {
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
    }

    createPlayer(position) {
        const playerEntityId = this.ecs.createEntity();
        this.player.entityId = playerEntityId;

        const playerBody = new CANNON.Body({
            mass: 5,
            shape: new CANNON.Sphere(0.5),
            position: new CANNON.Vec3(position.x, 1, position.z),
            material: new CANNON.Material('player'),
        });
        this.player.body = playerBody;
        this.ecs.addComponent(playerEntityId, 'Physics', { body: playerBody });
        eventBus.emit('ENTITY_CREATED', { entityId: playerEntityId, components: { Physics: { body: playerBody } } });

        const playerContactMaterial = new CANNON.ContactMaterial(
            physicsModule.world.defaultMaterial,
            playerBody.material,
            { friction: 0.1, restitution: 0.1 }
        );
        physicsModule.world.addContactMaterial(playerContactMaterial);
    }

    removePlayer() {
        if (this.player.entityId !== null) {
            const components = { Physics: this.ecs.getComponent(this.player.entityId, 'Physics') };
            eventBus.emit('ENTITY_REMOVED', { entityId: this.player.entityId, components });
            this.ecs.removeEntity(this.player.entityId);
            this.player.entityId = null;
            this.player.body = null;
        }
    }

    updatePlayer(deltaTime) {
        if (this.viewMode !== 'first-person' || !this.player.body) return;

        const { w, a, s, d } = inputModule.keyboard;
        const speed = 10;
        const maxSpeed = 5;

        const direction = new THREE.Vector3();
        rendererModule.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(direction, rendererModule.camera.up);

        const moveDirection = new THREE.Vector3();
        if (w) moveDirection.add(direction);
        if (s) moveDirection.sub(direction);
        if (a) moveDirection.add(right);
        if (d) moveDirection.sub(right);

        moveDirection.normalize().multiplyScalar(speed * deltaTime);

        const force = new CANNON.Vec3(moveDirection.x, 0, moveDirection.z);
        this.player.body.applyForce(force, this.player.body.position);

        // Clamp velocity
        const velocity = this.player.body.velocity;
        const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (velocityMagnitude > maxSpeed) {
            const factor = maxSpeed / velocityMagnitude;
            velocity.x *= factor;
            velocity.z *= factor;
        }

        rendererModule.camera.position.copy(this.player.body.position);
        rendererModule.camera.position.y += 0.5; // Eye height
    }

    gameLoop() {
        console.log('Game loop running...');
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= config.worldClockTick) {
            this.lastFrameTime = currentTime - (deltaTime % config.worldClockTick);

            this.updatePlayer(deltaTime);
            physicsModule.update();
            this.ecs.update(deltaTime);
            rendererModule.update(this.ecs, this.viewMode);
        }

        requestAnimationFrame(() => this.gameLoop());
    }
}

export const world = new World();
