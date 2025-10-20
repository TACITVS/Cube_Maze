import * as CANNON from 'cannon-es';
import { eventBus } from './event-bus.js';
import { config } from './config.js';

let world;

function init() {
    console.log('Initializing physics...');
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 10;
    world.allowSleep = true;

    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        { friction: 0.5, restitution: 0.2 }
    );
    world.addContactMaterial(defaultContactMaterial);

    eventBus.on('ENTITY_CREATED', ({ entityId, components }) => {
        if (components.Physics) {
            world.addBody(components.Physics.body);
        }
    });

    eventBus.on('ENTITY_REMOVED', ({ entityId, components }) => {
        if (components.Physics) {
            world.removeBody(components.Physics.body);
        }
    });
}



function update() {
    world.step(config.worldClockTick / 1000);
}

export const physicsModule = {
    init,
    update,
    get world() { return world; },
};
