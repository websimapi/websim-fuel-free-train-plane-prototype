import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050a15);
        this.scene.fog = new THREE.FogExp2(0x050a15, 0.002);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.cameraOffset = new THREE.Vector3(30, 15, 30); // Offset relative to train

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
        // Camera follows train but looks somewhat towards the midpoint of train and plane
        const targetPos = trainPos.clone().add(this.cameraOffset);
        
        // Smooth follow
        this.camera.position.lerp(targetPos, 0.1);
        
        // Look at a point ahead of the train, slightly up
        const lookAtTarget = trainPos.clone().add(new THREE.Vector3(0, 5, 20));
        
        // Add a bit of influence from plane height so we don't lose it if it goes high
        const heightInfluence = Math.min((planePos.y - trainPos.y) * 0.5, 20);
        lookAtTarget.y += heightInfluence;

        this.camera.lookAt(lookAtTarget);
    }

    onResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}