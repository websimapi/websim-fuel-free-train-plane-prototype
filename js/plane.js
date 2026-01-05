import * as THREE from 'three';

export class Plane {
    constructor(scene) {
        this.scene = scene;
        this.mesh = this.createMesh();
        this.mesh.position.set(0, 20, 0);
        this.scene.add(this.mesh);
        
        new THREE.TextureLoader().load('metal_texture.png', (tex) => {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            m.map = tex;
                            m.needsUpdate = true;
                        });
                    } else {
                        child.material.map = tex;
                        child.material.needsUpdate = true;
                    }
                }
            });
        });
    }

    get position() {
        return this.mesh.position;
    }

    createMesh() {
        const group = new THREE.Group();

        // Fuselage
        const bodyGeo = new THREE.ConeGeometry(1.5, 10, 8);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0xdddddd, 
            metalness: 0.5, 
            roughness: 0.4 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Wings
        const wingGeo = new THREE.BoxGeometry(12, 0.2, 4);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0, 0);
        group.add(wings);

        // Stabilizers
        const stabGeo = new THREE.BoxGeometry(4, 0.2, 2);
        const stab = new THREE.Mesh(stabGeo, wingMat);
        stab.position.set(0, 0, -4);
        group.add(stab);

        // Vertical Stab
        const vStabGeo = new THREE.BoxGeometry(0.2, 3, 2);
        const vStab = new THREE.Mesh(vStabGeo, wingMat);
        vStab.position.set(0, 1.5, -4);
        group.add(vStab);

        // Connection Point underneath
        const connGeo = new THREE.SphereGeometry(0.5);
        const connMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const conn = new THREE.Mesh(connGeo, connMat);
        conn.position.set(0, -1, 1); // slightly forward center of gravity
        group.add(conn);

        return group;
    }

    updateVisuals(dt, speed) {
        // Subtle hover wobble
        const time = Date.now() / 1000;
        this.mesh.rotation.z = Math.sin(time) * 0.05; // Roll
        
        // Pitch based on speed change (simple effect)
        // If speed is high, nose down slightly to cut air? Or up to climb?
        // Let's just have it pitch up slightly if climbing
        
        // Propellers? No, it's glider/electric.
        // Maybe glow intensity based on energy transfer
    }
}