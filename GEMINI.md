# GEMINI.md

## Project Overview

This project is a 3D maze generator built with Three.js and cannon-es. It uses an Entity-Component-System (ECS) architecture to manage the different elements of the maze.

The maze is generated using Kruskal's algorithm and is displayed as a floorplan texture on a plane. The walls of the maze are represented by 3D cubes.

Users can interact with the maze by selecting and manipulating the cubes using a GUI.

## Building and Running

This is a single-file project that can be run by opening the `grok_cube_test_gemini.html` file in a web browser.

No build process is required as the dependencies (Three.js, cannon-es, and lil-gui) are loaded from a CDN using import maps.

## Development Conventions

*   **ECS Architecture:** The project follows an Entity-Component-System (ECS) pattern to organize the code.
*   **ES Modules:** The JavaScript code is written using ES modules.
*   **GUI:** The project uses lil-gui for the GUI controls.
*   **Physics:** cannon-es is used for the physics engine.
*   **3D Rendering:** Three.js is used for the 3D rendering.
