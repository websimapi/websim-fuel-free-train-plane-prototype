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

        // Make zoom smoother and more granular
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.3;

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
        // Grid Floor
        const gridHelper = new THREE.GridHelper(2000, 200, 0x112233, 0x0a1122);
        this.scene.add(gridHelper);

        // Infinite Rail illusion (Visual only, physics is generic)
        const railGeo = new THREE.BoxGeometry(2000, 0.5, 1);
        const railMat = new THREE.MeshStandardMaterial({ 
            color: 0x00aaff, 
            emissive: 0x0044aa,
            roughness: 0.2,
            metalness: 0.8
        });
        
        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.x = -2;
        leftRail.position.y = 0.25;
        this.scene.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.x = 2;
        rightRail.position.y = 0.25;
        this.scene.add(rightRail);

        // Ties
        const tiesGeo = new THREE.BoxGeometry(6, 0.2, 1);
        const tiesMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        // Create instanced mesh for performance
        const tiesCount = 400;
        const tiesMesh = new THREE.InstancedMesh(tiesGeo, tiesMat, tiesCount);
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < tiesCount; i++) {
            dummy.position.set(0, 0.1, (i * 5) - 1000);
            dummy.updateMatrix();
            tiesMesh.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(tiesMesh);
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