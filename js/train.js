import * as THREE from 'three';

export class Train {
    constructor(scene) {
        this.scene = scene;
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
        
        // Texture loader
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

        // Main Body
        const geometry = new THREE.BoxGeometry(4, 3, 10);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            metalness: 0.9,
            roughness: 0.2
        });
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 2;
        group.add(body);

        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(3.5, 1.5, 3);
        const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 4, 3);
        group.add(cockpit);

        // Connection Point (for wire)
        const connGeo = new THREE.CylinderGeometry(0.5, 0.5, 1);
        const connMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const connector = new THREE.Mesh(connGeo, connMat);
        connector.position.set(0, 3.5, 0);
        group.add(connector);

        // Glow undercarriage
        const light = new THREE.PointLight(0x00aaff, 1, 15);
        light.position.set(0, 1, 0);
        group.add(light);

        return group;
    }
}