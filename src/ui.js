import { eventBus } from './event-bus.js';
import { config } from './config.js';

let gui;
const settings = { mazeSize: config.mazeSize };

function destroy() {
    if (gui) {
        gui.destroy();
        gui = null;
    }
}

function init() {
    console.log('Initializing UI...');
    destroy();
    gui = new lil.GUI();

    const mazeFolder = gui.addFolder('Maze Controls');
    mazeFolder.add(settings, 'mazeSize', {
        'Small (5x5)': 5,
        'Medium (7x7)': 7,
        'Large (9x9)': 9,
        'X-Large (10x10)': 10
    }).name('Maze Size').onChange(size => {
        eventBus.emit('MAZE_SIZE_CHANGED', { size });
    });
    mazeFolder.open();

    // Placeholder for manipulation folder
    const manipFolder = gui.addFolder('Manipulate Selected');
    manipFolder.close();
}

export const uiModule = {
    init,
    destroy,
    settings,
};
