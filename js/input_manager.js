import nipplejs from 'nipplejs';

export class InputManager {
    constructor(simulation) {
        this.sim = simulation;
        
        // Key State
        this.keys = {
            w: false,
            s: false,
            up: false,
            down: false
        };

        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = true; break;
                case 's': this.keys.s = true; break;
                case 'arrowup': this.keys.up = true; break;
                case 'arrowdown': this.keys.down = true; break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = false; break;
                case 's': this.keys.s = false; break;
                case 'arrowup': this.keys.up = false; break;
                case 'arrowdown': this.keys.down = false; break;
            }
        });
    }

    setupTouch() {
        // Nipple JS for Train Movement
        const zone = document.getElementById('joystick-zone');
        this.manager = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#00ffff'
        });

        this.joystickData = { y: 0 };

        this.manager.on('move', (evt, data) => {
            if (data && data.vector) {
                this.joystickData.y = data.vector.y;
            }
        });

        this.manager.on('end', () => {
            this.joystickData.y = 0;
        });

        // Buttons for Wire
        const btnExtend = document.getElementById('btn-extend');
        const btnRetract = document.getElementById('btn-retract');

        // Touch events for continuous press
        this.wireAction = 0; // -1 retract, 0 none, 1 extend

        const startExtend = (e) => { e.preventDefault(); this.wireAction = 1; };
        const startRetract = (e) => { e.preventDefault(); this.wireAction = -1; };
        const stopWire = (e) => { e.preventDefault(); this.wireAction = 0; };

        btnExtend.addEventListener('mousedown', startExtend);
        btnExtend.addEventListener('touchstart', startExtend);
        
        btnRetract.addEventListener('mousedown', startRetract);
        btnRetract.addEventListener('touchstart', startRetract);

        window.addEventListener('mouseup', stopWire);
        window.addEventListener('touchend', stopWire);
    }

    update() {
        // Calculate Acceleration request
        let accel = 0;

        // Keyboard
        if (this.keys.w) accel += 1;
        if (this.keys.s) accel -= 1;

        // Joystick Override
        if (Math.abs(this.joystickData.y) > 0.1) {
            accel = this.joystickData.y;
        }

        this.sim.setAcceleration(accel);

        // Handle Wire Adjustment
        let wireChange = 0;
        if (this.keys.up || this.wireAction === 1) wireChange = 0.5;
        if (this.keys.down || this.wireAction === -1) wireChange = -0.5;

        if (wireChange !== 0) {
            this.sim.extendTether(wireChange);
        }
    }
}