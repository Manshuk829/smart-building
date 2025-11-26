import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// --- CONFIGURATION ---
const CONFIG = {
    floors: 4,
    width: 32,  // User specified width
    depth: 17,  // User specified length
    floorHeight: 15 / 4, // Total height 15 / 4 floors = 3.75 per floor
    nodesPerFloor: 4,
    colors: {
        background: 0x0f172a,
        floor: 0x1e293b,
        wall: 0x334155,
        highlight: 0x3b82f6,
        danger: 0xef4444,
        safe: 0x22c55e,
        text: 0xffffff
    }
};

// --- STATE ---
let scene, camera, renderer, controls;
let buildingGroup = new THREE.Group();
let personMesh;
let activePathLines = [];
let emergencyLight;
let sensorData = {}; // Real-time data
let isEvacuating = false;

// --- INITIALIZATION ---
export function initEvacuationSystem(containerId) {
    const container = document.getElementById(containerId);

    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.background);
    scene.fog = new THREE.Fog(CONFIG.colors.background, 50, 200);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(60, 60, 60);
    camera.lookAt(CONFIG.width / 2, (CONFIG.floors * CONFIG.floorHeight) / 2, CONFIG.depth / 2);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Emergency Light (Red Rotating Spot)
    emergencyLight = new THREE.SpotLight(0xff0000, 5);
    emergencyLight.position.set(CONFIG.width / 2, CONFIG.floors * CONFIG.floorHeight + 20, CONFIG.depth / 2);
    emergencyLight.angle = Math.PI / 6;
    emergencyLight.penumbra = 0.5;
    emergencyLight.distance = 200;
    emergencyLight.castShadow = true;
    emergencyLight.visible = false;
    scene.add(emergencyLight);
    scene.add(emergencyLight.target);

    // Build Structure
    createBuilding();

    // Animation Loop
    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Mouse Controls (Simple Orbit)
    setupControls(container);
}

// --- BUILDING GENERATION ---
function createBuilding() {
    scene.add(buildingGroup);

    // Create Floors
    for (let i = 0; i < CONFIG.floors; i++) {
        const y = i * CONFIG.floorHeight;

        // Floor Plane
        const geometry = new THREE.BoxGeometry(CONFIG.width, 0.5, CONFIG.depth);
        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.floor,
            transparent: true,
            opacity: 0.9
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.position.set(CONFIG.width / 2, y, CONFIG.depth / 2);
        floor.receiveShadow = true;
        floor.userData = { type: 'floor', level: i + 1 };
        buildingGroup.add(floor);

        // Grid Helper
        const grid = new THREE.GridHelper(Math.max(CONFIG.width, CONFIG.depth), 20, 0x475569, 0x334155);
        grid.position.set(CONFIG.width / 2, y + 0.3, CONFIG.depth / 2);
        grid.scale.set(CONFIG.width / 32, 1, CONFIG.depth / 32); // Adjust aspect
        buildingGroup.add(grid);

        // Floor Label
        createTextLabel(`Floor ${i + 1}`, -5, y, CONFIG.depth / 2);

        // Nodes (Stairs/Lifts) - 4 Corners
        const nodePositions = [
            { x: 2, z: 2, id: 1 },
            { x: CONFIG.width - 2, z: 2, id: 2 },
            { x: CONFIG.width - 2, z: CONFIG.depth - 2, id: 3 },
            { x: 2, z: CONFIG.depth - 2, id: 4 }
        ];

        nodePositions.forEach(pos => {
            const nodeGeo = new THREE.CylinderGeometry(1, 1, 0.2, 16);
            const nodeMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.highlight, emissive: 0x1e40af });
            const node = new THREE.Mesh(nodeGeo, nodeMat);
            node.position.set(pos.x, y + 0.4, pos.z);
            node.userData = { type: 'node', floor: i + 1, id: pos.id };
            buildingGroup.add(node);

            // Vertical Connector (Stairs visual)
            if (i < CONFIG.floors - 1) {
                const connGeo = new THREE.CylinderGeometry(0.2, 0.2, CONFIG.floorHeight, 8);
                const connMat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.3 });
                const conn = new THREE.Mesh(connGeo, connMat);
                conn.position.set(pos.x, y + CONFIG.floorHeight / 2, pos.z);
                buildingGroup.add(conn);
            }
        });
    }
}

function createTextLabel(text, x, y, z) {
    // Simple HTML overlay or Sprite would be better, but using 3D text is heavy.
    // We'll use a simple Sprite for performance.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(text, 250, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y + 2, z);
    sprite.scale.set(10, 2.5, 1);
    buildingGroup.add(sprite);
}

// --- LOGIC & UPDATES ---

export function updateSensorData(data) {
    // data structure: { floor: 1, type: 'flame', node: 2, value: 1 }
    sensorData = data;

    // Reset visuals
    buildingGroup.children.forEach(child => {
        if (child.userData.type === 'node') {
            child.material.color.setHex(CONFIG.colors.highlight);
            child.material.emissive.setHex(0x1e40af);
        }
    });

    // Check for Fire
    let fireDetected = false;
    if (data.type === 'flame' && data.value === 1) {
        fireDetected = true;
        const floorIdx = data.floor - 1;
        const nodeIdx = data.node; // 1-4

        // Highlight Danger Node
        const dangerNode = buildingGroup.children.find(c =>
            c.userData.type === 'node' &&
            c.userData.floor === data.floor &&
            c.userData.id === nodeIdx
        );

        if (dangerNode) {
            dangerNode.material.color.setHex(CONFIG.colors.danger);
            dangerNode.material.emissive.setHex(0xff0000);

            // Add Fire Particles (Simple)
            // (Implementation omitted for brevity, can add later)
        }

        triggerEvacuation(data.floor, nodeIdx);
    }

    // Emergency Light Control
    emergencyLight.visible = fireDetected;
}

function triggerEvacuation(dangerFloor, dangerNodeId) {
    if (isEvacuating) return; // Already running
    isEvacuating = true;

    console.log(`🚨 EVACUATION TRIGGERED! Fire on Floor ${dangerFloor}, Node ${dangerNodeId}`);

    // 1. Find Person (Start at random location on danger floor for demo)
    const startX = CONFIG.width / 2;
    const startZ = CONFIG.depth / 2;
    const startY = (dangerFloor - 1) * CONFIG.floorHeight + 0.5;

    if (!personMesh) createPerson(startX, startY, startZ);
    personMesh.position.set(startX, startY, startZ);
    personMesh.visible = true;

    // 2. Calculate Safe Path
    // Logic: Find nearest node on SAME floor that is NOT the danger node
    const nodes = [1, 2, 3, 4];
    const safeNodes = nodes.filter(n => n !== dangerNodeId);

    // Simple heuristic: Pick the first safe node (can be improved to nearest)
    const targetNodeId = safeNodes[0];
    const targetNode = buildingGroup.children.find(c =>
        c.userData.type === 'node' &&
        c.userData.floor === dangerFloor &&
        c.userData.id === targetNodeId
    );

    if (targetNode) {
        // Path 1: To Safe Node
        const path1 = [
            new THREE.Vector3(startX, startY, startZ),
            new THREE.Vector3(targetNode.position.x, startY, targetNode.position.z)
        ];

        // Path 2: Downstairs (to Ground)
        const path2 = [];
        for (let i = dangerFloor - 1; i >= 0; i--) {
            path2.push(new THREE.Vector3(targetNode.position.x, i * CONFIG.floorHeight + 0.5, targetNode.position.z));
        }

        // Path 3: Exit (Ground Floor 0,0)
        path2.push(new THREE.Vector3(0, 0.5, 0));

        animatePerson([...path1, ...path2]);
    }
}

function createPerson(x, y, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xf97316 })
    );
    body.position.y = 0.75;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd4aa })
    );
    head.position.y = 1.8;
    group.add(body, head);
    group.position.set(x, y, z);

    personMesh = group;
    scene.add(personMesh);
}

function animatePerson(points) {
    let currentPointIdx = 0;
    let progress = 0;
    const speed = 0.1; // Movement speed

    function step() {
        if (currentPointIdx >= points.length - 1) {
            isEvacuating = false;
            return; // Reached end
        }

        const p1 = points[currentPointIdx];
        const p2 = points[currentPointIdx + 1];

        progress += speed;

        if (progress >= 1) {
            progress = 0;
            currentPointIdx++;
            step();
            return;
        }

        personMesh.position.lerpVectors(p1, p2, progress);
        requestAnimationFrame(step);
    }
    step();
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Rotate Emergency Light
    if (emergencyLight.visible) {
        const time = Date.now() * 0.005;
        emergencyLight.target.position.x = CONFIG.width / 2 + Math.cos(time) * 20;
        emergencyLight.target.position.z = CONFIG.depth / 2 + Math.sin(time) * 20;
        emergencyLight.target.updateMatrixWorld();
    }

    renderer.render(scene, camera);
}

// --- CONTROLS ---
function setupControls(domElement) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
    });

    domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
            };

            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 1),
                    toRadians(deltaMove.x * 1),
                    0,
                    'XYZ'
                ));

            // Simple camera rotation logic (can be replaced with OrbitControls if imported)
            // For now, just rotating the building group for simplicity
            buildingGroup.rotation.y += deltaMove.x * 0.01;
        }

        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });

    domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}
