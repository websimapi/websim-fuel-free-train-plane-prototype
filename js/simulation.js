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
        
        // Physics Settings
        this.gravity = 1.62; // Default to Moon (fun default)
        this.planeVelocity = new THREE.Vector3();
        
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

    setGravity(g) {
        this.gravity = parseFloat(g);
    }

    update(dt) {
        // --- TRAIN PHYSICS ---
        if (this.acceleration !== 0) {
            this.speed += this.acceleration * dt * 50;
        } else {
            // Friction
            this.speed *= 0.98;
        }

        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed) this.speed = -this.maxSpeed;
        if (Math.abs(this.speed) < 0.1) this.speed = 0;

        // Apply Position
        this.train.mesh.position.z += this.speed * dt;

        // Update Infinite World
        this.scene.sceneManagerRef?.updateChunks(this.train.mesh.position.z);


        // --- PLANE PHYSICS (GRAVITY BASED) ---
        // Basic Force Simulation
        // Forces: Gravity (Down), Lift (Up), Tension (Towards Train), Drag (Opposite Velocity)
        
        this.tether.updateLength(dt);
        const currentWireLength = this.tether.currentLength;

        // 1. Gravity Force
        // F = m*a. Let's work directly with accelerations for simplicity.
        const gravityAccel = new THREE.Vector3(0, -this.gravity, 0);

        // 2. Lift Force
        // Simplified: Lift is proportional to speed squared
        // Lift is perpendicular to velocity, but for this glider, let's assume it's mostly Up.
        // We need enough speed to counteract gravity.
        // At 100km/h (27 m/s), we should fly easily on Earth.
        // Lift = Coeff * Speed^2
        const liftCoeff = 0.05; 
        const speedSq = this.speed * this.speed;
        const liftMag = liftCoeff * speedSq;
        const liftAccel = new THREE.Vector3(0, liftMag, 0);

        // 3. Apply Forces to Velocity
        // Damping/Drag on plane itself
        this.planeVelocity.multiplyScalar(0.99); // Air resistance
        
        // Add accelerations
        this.planeVelocity.add(gravityAccel.multiplyScalar(dt));
        this.planeVelocity.add(liftAccel.multiplyScalar(dt));

        // Horizontal Drag (Lag behind train)
        // The plane naturally wants to slow down due to air resistance
        // We simulate this by pushing Z velocity towards 0 relative to world, 
        // effectively making it lag if not pulled.
        this.planeVelocity.z -= (this.planeVelocity.z - 0) * dt * 0.5;


        // 4. Apply Velocity to Position
        const nextPos = this.plane.mesh.position.clone().add(this.planeVelocity.clone().multiplyScalar(dt));

        // 5. Constraints

        // Ground Constraint
        if (nextPos.y < 5) {
            nextPos.y = 5;
            this.planeVelocity.y = Math.max(0, this.planeVelocity.y); // Cancel downward velocity
            // Add friction on ground
            this.planeVelocity.x *= 0.9;
            this.planeVelocity.z *= 0.9;
        }

        // Tether Constraint
        // The plane cannot exceed wire length distance from train
        // Note: Train has moved this frame already.
        const trainPos = this.train.mesh.position.clone();
        // Tether attach point on train is slightly higher
        const trainAttach = trainPos.clone().add(new THREE.Vector3(0, 3.5, 0));
        
        const dist = nextPos.distanceTo(trainAttach);
        
        if (dist > currentWireLength) {
            // Constraint violation: Pull plane back towards tether radius
            const direction = nextPos.clone().sub(trainAttach).normalize();
            nextPos.copy(trainAttach).add(direction.multiplyScalar(currentWireLength));

            // Impulse transfer (Tension)
            // If the plane hits the end of the rope, it gets pulled along by the train
            // And also bounces/slides along the imaginary sphere of the tether
            
            // Simple approach: Project velocity onto the tangent plane of the sphere
            // The component of velocity parallel to the rope is killed (inelastic) or reflected (elastic)
            // Here we assume inelastic rope (it just pulls).
            
            // Getting pulled by train Z motion:
            // If the train is moving, it drags the plane. 
            // We approximate this by nudging the plane Z towards train Z if it's lagging
            
            // Reset velocity components that fight the constraint?
            // Project velocity to be tangent to the sphere surface
            const normal = direction.clone(); // Normal of the sphere at collision point
            const velDotNorm = this.planeVelocity.dot(normal);
            if (velDotNorm > 0) {
                // Remove outward velocity
                this.planeVelocity.sub(normal.multiplyScalar(velDotNorm));
            }
            
            // Pull effect from train speed
            // If the tether is taut and train is moving forward, plane gains Z velocity
            if (this.speed > 0 && nextPos.z < trainAttach.z) {
                 this.planeVelocity.z += (this.speed - this.planeVelocity.z) * dt * 2.0;
            }
        }

        // Apply constrained position
        this.plane.mesh.position.copy(nextPos);


        // Plane Tilt (Visuals)
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