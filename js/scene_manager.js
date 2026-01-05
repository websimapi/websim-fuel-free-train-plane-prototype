import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';

export class SceneManager {
    constructor(renderer) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050a15);
        this.scene.fog = new THREE.FogExp2(0x050a15, 0.002);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
        this.camera.position.set(30, 40, -50);

        // Controls
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI - 0.1; // Allow looking up from below plane

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        this.scene.add(dirLight);

        // Environment
        this.createEnvironment();
    }

    createEnvironment() {
        // Shared Geometries and Materials for Chunks
        this.chunkSize = 200;
        this.chunks = new Map(); // Store active chunks by index

        // Rail Asset
        this.railGeometry = new THREE.BoxGeometry(this.chunkSize, 0.5, 1);
        this.railMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00aaff, 
            emissive: 0x0044aa,
            roughness: 0.2,
            metalness: 0.8
        });

        // Ties Asset
        this.tieGeometry = new THREE.BoxGeometry(6, 0.2, 1);
        this.tieMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        
        // Grid Floor (We will move this with the player)
        this.gridHelper = new THREE.GridHelper(2000, 200, 0x112233, 0x0a1122);
        this.scene.add(this.gridHelper);

        // Initial chunks
        this.updateChunks(0);
    }

    updateChunks(trainZ) {
        // Calculate current chunk index
        const currentIndex = Math.floor(trainZ / this.chunkSize);
        
        // Define active range (keep e.g., 2 behind and 3 ahead)
        const renderDistance = 3;
        const minIndex = currentIndex - 2;
        const maxIndex = currentIndex + renderDistance;

        // Identify keys to keep
        const validKeys = new Set();
        for(let i = minIndex; i <= maxIndex; i++) {
            validKeys.add(i);
        }

        // Remove old chunks
        for (const [key, chunk] of this.chunks) {
            if (!validKeys.has(key)) {
                this.scene.remove(chunk);
                // Dispose logic if needed, but since we reuse geometry, just removing from scene is enough for JS/Three
                // The geometry is shared, so don't dispose that!
                this.chunks.delete(key);
            }
        }

        // Add new chunks
        for (let i = minIndex; i <= maxIndex; i++) {
            if (!this.chunks.has(i)) {
                const chunk = this.createChunk(i);
                this.chunks.set(i, chunk);
                this.scene.add(chunk);
            }
        }

        // Move Grid Helper to center on train Z for infinite illusion
        // Snap to grid spacing (10 units) to avoid flickering
        const snapZ = Math.floor(trainZ / 10) * 10;
        this.gridHelper.position.z = snapZ;
    }

    createChunk(index) {
        const group = new THREE.Group();
        const zPos = index * this.chunkSize;
        group.position.z = zPos;

        // Rails
        const leftRail = new THREE.Mesh(this.railGeometry, this.railMaterial);
        leftRail.position.set(-2, 0.25, 0); // Local to chunk center
        group.add(leftRail);

        const rightRail = new THREE.Mesh(this.railGeometry, this.railMaterial);
        rightRail.position.set(2, 0.25, 0);
        group.add(rightRail);

        // Ties (Instanced Mesh for this chunk)
        const tiesCount = Math.floor(this.chunkSize / 5); // One tie every 5 units
        const tiesMesh = new THREE.InstancedMesh(this.tieGeometry, this.tieMaterial, tiesCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < tiesCount; i++) {
            // Local Z inside the chunk (chunk ranges from -size/2 to size/2)
            const localZ = (i * 5) - (this.chunkSize / 2) + 2.5;
            dummy.position.set(0, 0.1, localZ);
            dummy.updateMatrix();
            tiesMesh.setMatrixAt(i, dummy.matrix);
        }
        group.add(tiesMesh);

        return group;
    }

    updateCamera(trainPos, planePos) {
        // Shift camera focus to the plane
        // Smoothly move the control target to the plane's position
        this.controls.target.lerp(planePos, 0.1);
        
        // Update the orbit controls
        this.controls.update();
    }

    onResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}