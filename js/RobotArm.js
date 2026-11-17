import * as THREE from 'three';

/**
 * RobotArm — Builds a fully articulated 6-segment robotic arm
 * with coloured joint rings matching the reference design.
 */
export class RobotArm {
    constructor() {
        this.group = new THREE.Group();

        /* ---------- materials ---------- */
        this.mats = {
            body:    new THREE.MeshStandardMaterial({ color: 0x78809a, metalness: 0.65, roughness: 0.30 }),
            bodyDk:  new THREE.MeshStandardMaterial({ color: 0x3a3f55, metalness: 0.70, roughness: 0.25 }),
            joint1:  new THREE.MeshStandardMaterial({ color: 0x2ecc71, metalness: 0.35, roughness: 0.40 }),
            joint2:  new THREE.MeshStandardMaterial({ color: 0xe67e22, metalness: 0.35, roughness: 0.40 }),
            ring1:   new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.30, roughness: 0.45 }),
            ring2:   new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.30, roughness: 0.45 }),
            gripper: new THREE.MeshStandardMaterial({ color: 0xe67e22, metalness: 0.40, roughness: 0.35 }),
            gripBase:new THREE.MeshStandardMaterial({ color: 0x555b70, metalness: 0.55, roughness: 0.30 }),
        };

        /* ---------- joint state ---------- */
        this.angles = { base: 0, shoulder: 0, elbow: 0, wrist: 0 };
        this.gripperOpen = 1;          // 0 = closed, 1 = fully open
        this._gripperTarget = 1;

        this._build();
    }

    /* =========================================================
       Build the arm hierarchy
       ========================================================= */
    _build() {
        const M = this.mats;
        const seg = 24; // geometry segments

        // --- base platform (fixed) ---
        const platform = this._mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.35, 32), M.bodyDk);
        platform.position.y = 0.175;
        this.group.add(platform);

        // decorative ring on platform edge
        const platRing = this._mesh(new THREE.TorusGeometry(2.05, 0.06, 8, 48), M.ring1);
        platRing.rotation.x = Math.PI / 2;
        platRing.position.y = 0.35;
        this.group.add(platRing);

        // --- baseRotation group (Joint 1 — Y rotation) ---
        this.basePivot = new THREE.Group();
        this.basePivot.position.y = 0.35;
        this.group.add(this.basePivot);

        // turret
        const turret = this._mesh(new THREE.CylinderGeometry(0.72, 0.85, 1.4, seg), M.body);
        turret.position.y = 0.7;
        this.basePivot.add(turret);

        // base decorative ring
        const baseRing = this._mesh(new THREE.TorusGeometry(0.80, 0.07, 8, 32), M.joint1);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.25;
        this.basePivot.add(baseRing);

        // --- shoulder pivot (Joint 2 — Z rotation) ---
        this.shoulderPivot = new THREE.Group();
        this.shoulderPivot.position.y = 1.4;
        this.basePivot.add(this.shoulderPivot);

        // shoulder sphere
        const shoulderBall = this._mesh(new THREE.SphereGeometry(0.52, seg, seg), M.joint1);
        this.shoulderPivot.add(shoulderBall);

        // shoulder accent rings
        this.shoulderPivot.add(this._jointRing(0.58, M.ring2, 0));
        this.shoulderPivot.add(this._jointRing(0.55, M.ring1, Math.PI / 2));

        // upper arm
        const upperArm = this._mesh(new THREE.BoxGeometry(0.52, 3.4, 0.52, 1, 1, 1), M.body);
        upperArm.position.y = 1.7;
        this.shoulderPivot.add(upperArm);

        // accent bands on upper arm
        this.shoulderPivot.add(this._band(0.54, 0.08, M.ring2, 0.35));
        this.shoulderPivot.add(this._band(0.54, 0.08, M.ring2, 3.05));

        // --- elbow pivot (Joint 3 — Z rotation) ---
        this.elbowPivot = new THREE.Group();
        this.elbowPivot.position.y = 3.4;
        this.shoulderPivot.add(this.elbowPivot);

        // elbow sphere
        const elbowBall = this._mesh(new THREE.SphereGeometry(0.42, seg, seg), M.joint2);
        this.elbowPivot.add(elbowBall);

        // elbow rings
        this.elbowPivot.add(this._jointRing(0.48, M.joint1, 0));
        this.elbowPivot.add(this._jointRing(0.46, M.ring1, Math.PI / 2));

        // forearm
        const forearm = this._mesh(new THREE.BoxGeometry(0.42, 2.8, 0.42), M.body);
        forearm.position.y = 1.4;
        this.elbowPivot.add(forearm);

        this.elbowPivot.add(this._band(0.44, 0.07, M.joint1, 0.30));
        this.elbowPivot.add(this._band(0.44, 0.07, M.joint1, 2.50));

        // --- wrist pivot (Joint 4 — Z rotation) ---
        this.wristPivot = new THREE.Group();
        this.wristPivot.position.y = 2.8;
        this.elbowPivot.add(this.wristPivot);

        // wrist sphere
        const wristBall = this._mesh(new THREE.SphereGeometry(0.32, seg, seg), M.joint1);
        this.wristPivot.add(wristBall);

        this.wristPivot.add(this._jointRing(0.38, M.ring2, 0));

        // wrist segment
        const wristSeg = this._mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.0, seg), M.body);
        wristSeg.position.y = 0.5;
        this.wristPivot.add(wristSeg);

        // --- gripper ---
        this.gripperGroup = new THREE.Group();
        this.gripperGroup.position.y = 1.05;
        this.wristPivot.add(this.gripperGroup);

        // gripper base plate
        const gripBase = this._mesh(new THREE.BoxGeometry(0.75, 0.2, 0.35), M.gripBase);
        this.gripperGroup.add(gripBase);

        // left finger
        this.leftFinger = new THREE.Group();
        this.leftFinger.position.set(-0.22, 0, 0);
        this.gripperGroup.add(this.leftFinger);

        const lf1 = this._mesh(new THREE.BoxGeometry(0.10, 0.65, 0.22), M.gripper);
        lf1.position.y = 0.425;
        this.leftFinger.add(lf1);
        const lf2 = this._mesh(new THREE.BoxGeometry(0.10, 0.30, 0.18), M.ring2);
        lf2.position.set(0.04, 0.85, 0);
        this.leftFinger.add(lf2);

        // right finger
        this.rightFinger = new THREE.Group();
        this.rightFinger.position.set(0.22, 0, 0);
        this.gripperGroup.add(this.rightFinger);

        const rf1 = this._mesh(new THREE.BoxGeometry(0.10, 0.65, 0.22), M.gripper);
        rf1.position.y = 0.425;
        this.rightFinger.add(rf1);
        const rf2 = this._mesh(new THREE.BoxGeometry(0.10, 0.30, 0.18), M.ring2);
        rf2.position.set(-0.04, 0.85, 0);
        this.rightFinger.add(rf2);

        // initial shadow setup
        this.group.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
            }
        });
    }

    /* =========================================================
       Joint setters
       ========================================================= */
    setJoint(name, angleDeg) {
        const rad = THREE.MathUtils.degToRad(angleDeg);
        switch (name) {
            case 'base':
                this.basePivot.rotation.y = rad;
                this.angles.base = angleDeg;
                break;
            case 'shoulder':
                this.shoulderPivot.rotation.z = rad;
                this.angles.shoulder = angleDeg;
                break;
            case 'elbow':
                this.elbowPivot.rotation.z = rad;
                this.angles.elbow = angleDeg;
                break;
            case 'wrist':
                this.wristPivot.rotation.z = rad;
                this.angles.wrist = angleDeg;
                break;
        }
    }

    /** Set gripper target. 0 = closed, 1 = open */
    setGripperTarget(val) {
        this._gripperTarget = THREE.MathUtils.clamp(val, 0, 1);
    }

    /** Call each frame with delta (seconds) to animate gripper smoothly */
    updateGripper(dt) {
        const speed = 2.5; // units per second
        if (Math.abs(this.gripperOpen - this._gripperTarget) > 0.001) {
            this.gripperOpen += Math.sign(this._gripperTarget - this.gripperOpen) * speed * dt;
            this.gripperOpen = THREE.MathUtils.clamp(this.gripperOpen, 0, 1);
        } else {
            this.gripperOpen = this._gripperTarget;
        }
        const spread = 0.08 + this.gripperOpen * 0.28;
        this.leftFinger.position.x  = -spread;
        this.rightFinger.position.x =  spread;
    }

    /* =========================================================
       Helpers
       ========================================================= */
    _mesh(geo, mat) {
        return new THREE.Mesh(geo, mat);
    }

    _jointRing(radius, mat, rotX) {
        const torus = this._mesh(new THREE.TorusGeometry(radius, 0.065, 8, 32), mat);
        torus.rotation.x = rotX;
        return torus;
    }

    _band(size, height, mat, yPos) {
        const band = this._mesh(new THREE.BoxGeometry(size, height, size), mat);
        band.position.y = yPos;
        return band;
    }
}
