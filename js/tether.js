import * as THREE from 'three';

export class Tether {
    constructor(scene) {
        this.scene = scene;
        this.targetLength = 30; // Desired length
        this.currentLength = 30; // Actual length (animates)
        
        // Using a Line for the core, and a ShaderMaterial for the glow effect
        // A TubeGeometry is better for visibility
        this.curve = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,10,0));
        this.geometry = new THREE.TubeGeometry(this.curve, 4, 0.2, 8, false);
        
        // Shader to animate electricity flow
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x00ffff) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec2 vUv;
                void main() {
                    // Moving pulse pattern
                    float pulse = sin((vUv.x * 20.0) - (time * 10.0)); // vUv.x is along the tube length
                    float glow = smoothstep(0.0, 0.8, pulse);
                    
                    // Core brightness
                    vec3 finalColor = color + (vec3(1.0) * glow);
                    
                    // Transparency at edges (optional, but keep opaque for now)
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    updateLength(dt) {
        // Smoothly interpolate current length to target length
        const diff = this.targetLength - this.currentLength;
        this.currentLength += diff * dt * 2.0;
    }

    updateGeometry(trainPos, planePos) {
        // Calculate start and end points
        // Train connector offset
        const start = trainPos.clone().add(new THREE.Vector3(0, 3.5, 0));
        // Plane connector offset
        const end = planePos.clone().add(new THREE.Vector3(0, -1, 1));

        // Update Curve
        this.curve.v1.copy(start);
        this.curve.v2.copy(end);

        // Update Geometry
        // Note: Rebuilding TubeGeometry every frame can be expensive, 
        // but for a single simple tube it's acceptable in a prototype.
        // Optimization: manipulate position attribute directly if needed, 
        // but TubeGeometry relies on Frenet frames which change with direction.
        this.geometry.dispose(); // Clean up old memory
        this.geometry = new THREE.TubeGeometry(this.curve, 4, 0.15, 6, false);
        this.mesh.geometry = this.geometry;

        // Update Shader Time
        this.material.uniforms.time.value = Date.now() / 1000;
    }
}