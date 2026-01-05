import * as THREE from 'three';
import { SceneManager } from './scene_manager.js';
import { InputManager } from './input_manager.js';
import { Simulation } from './simulation.js';

// Entry point
class App {
    constructor() {
        this.container = document.getElementById('game-container');
        
        // Setup Three.js
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.sceneManager = new SceneManager(this.renderer);
        this.simulation = new Simulation(this.sceneManager.scene);
        
        // Link SceneManager back to Simulation for infinite world updates
        this.simulation.scene.sceneManagerRef = this.sceneManager;
        
        this.inputManager = new InputManager(this.simulation);

        // Setup UI Controls
        this.setupUI();

        // Resize handler
        window.addEventListener('resize', () => this.onResize());

        // Audio Context (Resume on interaction)
        this.audioStarted = false;
        document.addEventListener('click', () => this.initAudio(), { once: true });
        document.addEventListener('touchstart', () => this.initAudio(), { once: true });

        // Animation Loop
        this.clock = new THREE.Clock();
        this.animate();
    }

    setupUI() {
        const btns = document.querySelectorAll('.grav-btn');
        const display = document.getElementById('g-val');
        
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Visual update
                btns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Logic update
                const g = e.target.getAttribute('data-g');
                this.simulation.setGravity(g);
                display.textContent = g;
            });
            
            // Touch support
            btn.addEventListener('touchstart', (e) => {
                 e.preventDefault(); // Prevent double fire
                 // Visual update
                btns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Logic update
                const g = e.target.getAttribute('data-g');
                this.simulation.setGravity(g);
                display.textContent = g;
            });
        });
    }

    initAudio() {
        if (!this.audioStarted) {
            this.simulation.initAudio();
            this.audioStarted = true;
        }
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        this.sceneManager.onResize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const dt = this.clock.getDelta();
        
        // Update Logic
        this.inputManager.update();
        this.simulation.update(dt);
        
        // Update Camera to follow train
        this.sceneManager.updateCamera(this.simulation.train.mesh.position, this.simulation.plane.mesh.position);

        // Render
        this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});