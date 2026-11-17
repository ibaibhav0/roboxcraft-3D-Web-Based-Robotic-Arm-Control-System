/* =================================================================
   RoboXcraft — main.js
   Entry point: sets up the Three.js scene, robot arm, controls,
   joystick, and the animation loop.
   ================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RobotArm } from './RobotArm.js';
import { VirtualJoystick } from './VirtualJoystick.js';

/* ---------------------------------------------------------------
   App state
   --------------------------------------------------------------- */
const state = {
    emergencyStop: false,
    speed: 50,                          // 1 – 100
    joints: { base: 0, shoulder: 30, elbow: -60, wrist: 0 },
    gripperTarget: 1,                   // 1 = open, 0 = closed
    movementStatus: 'Idle',
    systemStatus: 'Online',
};

const JOINT_LIMITS = {
    base:     { min: -180, max: 180 },
    shoulder: { min:  -90, max:  90 },
    elbow:    { min: -135, max: 135 },
    wrist:    { min:  -90, max:  90 },
};

const DEFAULT_JOINTS = { base: 0, shoulder: 30, elbow: -60, wrist: 0 };

/* ---------------------------------------------------------------
   Three.js scene
   --------------------------------------------------------------- */
const canvas   = document.getElementById('viewport-canvas');
const viewport = document.getElementById('viewport');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f1e);
scene.fog = new THREE.FogExp2(0x0d0f1e, 0.018);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(10, 8, 12);

const orbitCtrl = new OrbitControls(camera, renderer.domElement);
orbitCtrl.enableDamping = true;
orbitCtrl.dampingFactor  = 0.08;
orbitCtrl.target.set(0, 3.5, 0);
orbitCtrl.minDistance = 5;
orbitCtrl.maxDistance = 35;
orbitCtrl.maxPolarAngle = Math.PI * 0.48;

/* ---- lights ---- */
scene.add(new THREE.AmbientLight(0x334466, 0.65));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 14, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far  = 40;
dirLight.shadow.camera.left = dirLight.shadow.camera.bottom = -12;
dirLight.shadow.camera.right = dirLight.shadow.camera.top   =  12;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x5588cc, 0.4);
fillLight.position.set(-6, 8, -4);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0x0066ff, 0.6, 30);
rimLight.position.set(-8, 10, -6);
scene.add(rimLight);

/* ---- ground & grid ---- */
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x12142a, roughness: 0.9, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(30, 30, 0x222850, 0x1a1d40);
scene.add(grid);

/* ---- axes helper ---- */
const axes = new THREE.AxesHelper(2.5);
axes.position.y = 0.01;
scene.add(axes);

/* ---------------------------------------------------------------
   Robot Arm
   --------------------------------------------------------------- */
const robot = new RobotArm();
scene.add(robot.group);

// Apply initial pose
for (const [j, v] of Object.entries(state.joints)) {
    robot.setJoint(j, v);
}
robot.setGripperTarget(state.gripperTarget);
robot.updateGripper(10); // snap gripper instantly

/* ---------------------------------------------------------------
   Virtual Joystick
   --------------------------------------------------------------- */
const joystick = new VirtualJoystick(document.getElementById('joystick-container'));

/* ---------------------------------------------------------------
   UI references
   --------------------------------------------------------------- */
const ui = {
    sliders: {
        base:     document.getElementById('joint-base'),
        shoulder: document.getElementById('joint-shoulder'),
        elbow:    document.getElementById('joint-elbow'),
        wrist:    document.getElementById('joint-wrist'),
    },
    vals: {
        base:     document.getElementById('base-val'),
        shoulder: document.getElementById('shoulder-val'),
        elbow:    document.getElementById('elbow-val'),
        wrist:    document.getElementById('wrist-val'),
    },
    joyX:         document.getElementById('joy-x'),
    joyY:         document.getElementById('joy-y'),
    speedSlider:  document.getElementById('speed-slider'),
    speedVal:     document.getElementById('speed-val'),
    gripOpen:     document.getElementById('gripper-open'),
    gripClose:    document.getElementById('gripper-close'),
    gripFill:     document.getElementById('gripper-fill'),
    gripPercent:  document.getElementById('gripper-percent'),
    estopBtn:     document.getElementById('emergency-stop'),
    estopOverlay: document.getElementById('estop-overlay'),
    resetBtn:     document.getElementById('reset-joints'),
    fps:          document.getElementById('fps-counter'),
    // status
    sysDot:       document.getElementById('sys-dot'),
    sysStatus:    document.getElementById('sys-status'),
    moveDot:      document.getElementById('move-dot'),
    moveStatus:   document.getElementById('move-status'),
    gripDot:      document.getElementById('grip-dot'),
    gripStatus:   document.getElementById('grip-status'),
    speedDot:     document.getElementById('speed-dot'),
    speedStatus:  document.getElementById('speed-status'),
    jstBase:      document.getElementById('jst-base'),
    jstShoulder:  document.getElementById('jst-shoulder'),
    jstElbow:     document.getElementById('jst-elbow'),
    jstWrist:     document.getElementById('jst-wrist'),
    controlPanel: document.getElementById('control-panel'),
};

/* ---------------------------------------------------------------
   Slider ↔ state sync
   --------------------------------------------------------------- */
function syncSlidersToState() {
    for (const j of ['base', 'shoulder', 'elbow', 'wrist']) {
        ui.sliders[j].value = state.joints[j];
        ui.vals[j].textContent = state.joints[j].toFixed(1) + '°';
    }
}

for (const j of ['base', 'shoulder', 'elbow', 'wrist']) {
    ui.sliders[j].addEventListener('input', () => {
        if (state.emergencyStop) return;
        state.joints[j] = parseFloat(ui.sliders[j].value);
        ui.vals[j].textContent = state.joints[j].toFixed(1) + '°';
    });
}

syncSlidersToState();

/* ---- speed slider ---- */
ui.speedSlider.addEventListener('input', () => {
    state.speed = parseInt(ui.speedSlider.value);
    ui.speedVal.textContent = state.speed + '%';
});

/* ---- gripper buttons ---- */
ui.gripOpen.addEventListener('click', () => {
    if (state.emergencyStop) return;
    state.gripperTarget = 1;
    robot.setGripperTarget(1);
    ui.gripOpen.classList.add('active');
    ui.gripClose.classList.remove('active');
});
ui.gripClose.addEventListener('click', () => {
    if (state.emergencyStop) return;
    state.gripperTarget = 0;
    robot.setGripperTarget(0);
    ui.gripClose.classList.add('active');
    ui.gripOpen.classList.remove('active');
});
// initial active
ui.gripOpen.classList.add('active');

/* ---- reset joints ---- */
ui.resetBtn.addEventListener('click', () => {
    if (state.emergencyStop) return;
    Object.assign(state.joints, DEFAULT_JOINTS);
    syncSlidersToState();
});

/* ---- emergency stop ---- */
ui.estopBtn.addEventListener('click', () => {
    state.emergencyStop = !state.emergencyStop;

    if (state.emergencyStop) {
        ui.estopBtn.textContent = '✓ RESET — Resume Operations';
        ui.estopBtn.classList.add('active');
        ui.estopBtn.classList.add('engaged');
        ui.estopOverlay.classList.remove('hidden');
        ui.controlPanel.classList.add('controls-disabled');
    } else {
        ui.estopBtn.textContent = '⬣ EMERGENCY STOP';
        ui.estopBtn.classList.remove('active');
        ui.estopBtn.classList.remove('engaged');
        ui.estopOverlay.classList.add('hidden');
        ui.controlPanel.classList.remove('controls-disabled');
    }
});

/* ---------------------------------------------------------------
   Resize handler
   --------------------------------------------------------------- */
function resize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

/* ---------------------------------------------------------------
   FPS counter
   --------------------------------------------------------------- */
let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

/* ---------------------------------------------------------------
   Animation loop
   --------------------------------------------------------------- */
let prevTime = 0;

function animate(time) {
    requestAnimationFrame(animate);
    const t = time * 0.001;             // seconds
    const dt = Math.min(t - prevTime, 0.1);
    prevTime = t;

    // FPS
    frameCount++;
    fpsTime += dt;
    if (fpsTime >= 0.5) {
        currentFps = Math.round(frameCount / fpsTime);
        ui.fps.textContent = currentFps + ' FPS';
        frameCount = 0;
        fpsTime = 0;
    }

    let isMoving = false;

    if (!state.emergencyStop) {
        /* --- joystick drives base & shoulder --- */
        if (joystick.active) {
            const speedFact = state.speed / 50;
            const jx = joystick.x;
            const jy = joystick.y;

            state.joints.base += jx * 80 * dt * speedFact;
            state.joints.shoulder += jy * 50 * dt * speedFact;

            // clamp
            state.joints.base     = clamp(state.joints.base,     JOINT_LIMITS.base);
            state.joints.shoulder = clamp(state.joints.shoulder, JOINT_LIMITS.shoulder);

            syncSlidersToState();
            isMoving = true;
        }

        /* --- apply joints --- */
        for (const j of ['base', 'shoulder', 'elbow', 'wrist']) {
            robot.setJoint(j, state.joints[j]);
        }

        /* --- gripper animation --- */
        const prevGrip = robot.gripperOpen;
        robot.updateGripper(dt);
        if (Math.abs(robot.gripperOpen - prevGrip) > 0.001) isMoving = true;
    } else {
        // Even during e-stop, still render robot at current state
        for (const j of ['base', 'shoulder', 'elbow', 'wrist']) {
            robot.setJoint(j, state.joints[j]);
        }
    }

    /* --- update live status --- */
    updateStatus(isMoving);

    orbitCtrl.update();
    renderer.render(scene, camera);
}

/* ---------------------------------------------------------------
   Status display updater
   --------------------------------------------------------------- */
function updateStatus(isMoving) {
    // Movement
    if (state.emergencyStop) {
        state.movementStatus = 'STOPPED';
        ui.moveDot.className = 'status-dot stopped';
    } else if (isMoving) {
        state.movementStatus = 'Moving';
        ui.moveDot.className = 'status-dot moving';
    } else {
        state.movementStatus = 'Idle';
        ui.moveDot.className = 'status-dot idle';
    }
    ui.moveStatus.textContent = state.movementStatus;

    // System
    if (state.emergencyStop) {
        state.systemStatus = 'E-STOP';
        ui.sysDot.className = 'status-dot stopped';
    } else {
        state.systemStatus = 'Online';
        ui.sysDot.className = 'status-dot online';
    }
    ui.sysStatus.textContent = state.systemStatus;

    // Gripper
    const gp = Math.round(robot.gripperOpen * 100);
    ui.gripFill.style.width = gp + '%';
    ui.gripPercent.textContent = gp + '%';
    if (gp > 80) {
        ui.gripStatus.textContent = 'Open';
        ui.gripDot.className = 'status-dot open';
    } else if (gp < 20) {
        ui.gripStatus.textContent = 'Closed';
        ui.gripDot.className = 'status-dot closed';
    } else {
        ui.gripStatus.textContent = 'Partial (' + gp + '%)';
        ui.gripDot.className = 'status-dot moving';
    }

    // Speed
    ui.speedStatus.textContent = state.speed + '%';

    // Joystick readout
    ui.joyX.textContent = joystick.x.toFixed(2);
    ui.joyY.textContent = joystick.y.toFixed(2);

    // Joint status table
    ui.jstBase.textContent     = state.joints.base.toFixed(1) + '°';
    ui.jstShoulder.textContent = state.joints.shoulder.toFixed(1) + '°';
    ui.jstElbow.textContent    = state.joints.elbow.toFixed(1) + '°';
    ui.jstWrist.textContent    = state.joints.wrist.toFixed(1) + '°';
}

/* ---------------------------------------------------------------
   Utility
   --------------------------------------------------------------- */
function clamp(val, limits) {
    return Math.max(limits.min, Math.min(limits.max, val));
}

/* ---- kick off ---- */
animate(0);
console.log('%c RoboXcraft 🤖 Loaded ', 'background:#0d0f1e;color:#00aaff;font-size:14px;padding:4px 8px;border-radius:4px;');
