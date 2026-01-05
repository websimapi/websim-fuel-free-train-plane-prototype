import * as THREE from 'three';
import { Train } from './train.js';
import { Plane } from './plane.js';
import { Tether } from './tether.js';

export class Simulation {
    constructor(scene) {
        this.scene = scene;
        
        // Create Entities
        this.train = new Train(scene);
        this.plane = new Plane(scene);
        this.tether = new Tether(scene);

        // State
        this.speed = 0; // Current speed
        this.maxSpeed = 100;
        this.acceleration = 0;
        
        // Audio
        this.audioContext = null;
        this.humOsc = null;
        this.rumbleOsc = null;
        this.humGain = null;
        this.rumbleGain = null;

        // UI References
        this.uiSpeed = document.getElementById('speed-val');
        this.uiAlt = document.getElementById('alt-val');
        this.uiWire = document.getElementById('wire-val');
    }

    initAudio() {
        // Simple WebAudio setup
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // 1. Electric Hum (Energy)
        this.humOsc = this.audioContext.createOscillator();
        this.humOsc.type = 'sawtooth';
        this.humOsc.frequency.value = 110;
        
        this.humGain = this.audioContext.createGain();
        this.humGain.gain.value = 0.05;

        // Filter for sci-fi sound
        const humFilter = this.audioContext.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.value = 800;

        this.humOsc.connect(humFilter);
        humFilter.connect(this.humGain);
        this.humGain.connect(this.audioContext.destination);
        this.humOsc.start();

        // 2. Train Rumble (Low noise)
        // Creating noise buffer
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this.rumbleNode = this.audioContext.createBufferSource();
        this.rumbleNode.buffer = buffer;
        this.rumbleNode.loop = true;
        
        const rumbleFilter = this.audioContext.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 120;

        this.rumbleGain = this.audioContext.createGain();
        this.rumbleGain.gain.value = 0;

        this.rumbleNode.connect(rumbleFilter);
        rumbleFilter.connect(this.rumbleGain);
        this.rumbleGain.connect(this.audioContext.destination);
        this.rumbleNode.start();
    }

    updateAudio() {
        if(!this.audioContext) return;

        // Rumble volume based on speed
        const speedRatio = Math.abs(this.speed) / this.maxSpeed;
        this.rumbleGain.gain.setTargetAtTime(speedRatio * 0.2, this.audioContext.currentTime, 0.1);
        
        // Electric pitch modulation
        this.humOsc.frequency.setTargetAtTime(110 + (speedRatio * 50), this.audioContext.currentTime, 0.1);
        // Electric volume adds a wobble
        const time = Date.now() / 1000;
        this.humGain.gain.value = 0.05 + (Math.sin(time * 10) * 0.01); 
    }

    setAcceleration(val) {
        this.acceleration = val;
    }

    extendTether(amount) {
        this.tether.targetLength += amount;
        // Clamp length
        if (this.tether.targetLength < 10) this.tether.targetLength = 10;
        if (this.tether.targetLength > 100) this.tether.targetLength = 100;
    }

    update(dt) {
        // Physics: Move Train
        // Simple velocity integration with drag
        if (this.acceleration !== 0) {
            this.speed += this.acceleration * dt * 50;
        } else {
            // Friction
            this.speed *= 0.98;
        }

        // Clamp speed
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed) this.speed = -this.maxSpeed;
        
        // Stop completely if slow
        if (Math.abs(this.speed) < 0.1) this.speed = 0;

        // Apply Position
        this.train.mesh.position.z += this.speed * dt;

        // Reset world if gone too far to prevent float errors (Infinite loop effect)
        if (Math.abs(this.train.mesh.position.z) > 1000) {
            const offset = this.train.mesh.position.z;
            this.train.mesh.position.z = 0;
            this.plane.mesh.position.z -= offset;
            // Note: In a real infinite runner, we'd cycle track segments. 
            // Here we just let it run on the long static track setup in SceneManager.
            // For the purpose of this prototype, we will just let it go until bounds.
            // Actually, let's just bounce back or loop visually. 
            // For simplicity in this prototype, we'll let it run. 
        }

        // Physics: Plane follows Train
        // The plane tries to stay directly above the train at height derived from tether length
        // We simulate a bit of drag/lag for the plane
        
        // Tether Physics
        this.tether.updateLength(dt);
        const currentWireLength = this.tether.currentLength;
        
        // Ideally: Plane Z = Train Z - (Drag based on speed)
        // Plane Y = sqrt(WireLength^2 - HorizontalDistance^2)
        // For visual stability:
        const targetZ = this.train.mesh.position.z - (this.speed * 0.1); 
        const targetX = this.train.mesh.position.x; // Stay aligned horizontally
        
        // Calculate Height based on wire length (pythagorean approximation, assume some horizontal drag)
        const dragOffset = Math.abs(this.train.mesh.position.z - targetZ);
        let height = Math.sqrt(Math.max(0, (currentWireLength * currentWireLength) - (dragOffset * dragOffset)));
        if (height < 5) height = 5; // Minimum height ground clearance

        // Apply to Plane with smoothing
        this.plane.mesh.position.x = THREE.MathUtils.lerp(this.plane.mesh.position.x, targetX, dt * 2);
        this.plane.mesh.position.z = THREE.MathUtils.lerp(this.plane.mesh.position.z, targetZ, dt * 5);
        this.plane.mesh.position.y = THREE.MathUtils.lerp(this.plane.mesh.position.y, height, dt * 2);

        // Plane Tilt (Bank) based on sway or movement
        this.plane.updateVisuals(dt, this.speed);

        // Update Tether geometry
        this.tether.updateGeometry(this.train.mesh.position, this.plane.mesh.position);

        // Update UI
        this.uiSpeed.textContent = Math.floor(Math.abs(this.speed));
        this.uiAlt.textContent = Math.floor(this.plane.mesh.position.y);
        this.uiWire.textContent = Math.floor(this.tether.currentLength);

        // Audio
        this.updateAudio();
    }
}