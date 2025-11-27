import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// --- CONFIGURATION ---
const CONFIG = {
    floors: 4,
    width: 60,  // Increased size for better visualization
    depth: 40,
    floorHeight: 12,
    nodesPerFloor: 4,
    colors: {
        background: 0x0f172a,
        floor: 0x1e293b,
        wall: 0x334155,
        roomWall: 0x475569,
        highlight: 0x3b82f6,
        danger: 0xef4444,
        safe: 0x22c55e,
        text: 0xffffff,
        stairs: 0x64748b
    }
};

// --- STATE ---
let scene, camera, renderer, controls;
let buildingGroup = new THREE.Group();
let personMesh;
let emergencyLight;
let isEvacuating = false;

// --- INITIALIZATION ---
export function initEvacuationSystem(containerId) {
    const container = document.getElementById(containerId);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.background);
    scene.fog = new THREE.Fog(CONFIG.colors.background, 50, 300);

    // Camera (Adjusted for larger building)
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(100, 100, 120);
    camera.lookAt(CONFIG.width / 2, (CONFIG.floors * CONFIG.floorHeight) / 2, CONFIG.depth / 2);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 150, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Emergency Light
    emergencyLight = new THREE.SpotLight(0xff0000, 10);
    emergencyLight.position.set(CONFIG.width / 2, CONFIG.floors * CONFIG.floorHeight + 40, CONFIG.depth / 2);
    emergencyLight.angle = Math.PI / 4;
    emergencyLight.penumbra = 0.5;
    emergencyLight.visible = false;
    scene.add(emergencyLight);

    // Build
    createBuilding();

    // Loop
    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    setupControls(container);
}

// --- BUILDING GENERATION ---
function createBuilding() {
    scene.add(buildingGroup);

    for (let i = 0; i < CONFIG.floors; i++) {
        const y = i * CONFIG.floorHeight;

        // 1. Floor Slab
        const floorGeo = new THREE.BoxGeometry(CONFIG.width, 0.5, CONFIG.depth);
        const floorMat = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.floor,
            transparent: true,
            opacity: 0.95
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(CONFIG.width / 2, y, CONFIG.depth / 2);
        floor.receiveShadow = true;
        buildingGroup.add(floor);

        // 2. Rooms (Partitions)
        createRooms(y);

        // 3. Nodes (Stairs) - 4 Corners
        const nodePositions = [
            { x: 4, z: 4, id: 1 },
            { x: CONFIG.width - 4, z: 4, id: 2 },
            { x: CONFIG.width - 4, z: CONFIG.depth - 4, id: 3 },
            { x: 4, z: CONFIG.depth - 4, id: 4 }
        ];

        nodePositions.forEach(pos => {
            // Stairwell Marker
            const nodeGeo = new THREE.BoxGeometry(4, 0.2, 4);
            const nodeMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.highlight, emissive: 0x1e40af });
            const node = new THREE.Mesh(nodeGeo, nodeMat);
            node.position.set(pos.x, y + 0.3, pos.z);
            node.userData = { type: 'node', floor: i + 1, id: pos.id };
            buildingGroup.add(node);

            // Visual Stairs (connecting to floor above)
            if (i < CONFIG.floors - 1) {
                createStairs(pos.x, y, pos.z);
            }
        });

        // Floor Label
        createTextLabel(`Floor ${i + 1}`, -8, y, CONFIG.depth / 2);
    }
}

function createRooms(y) {
    // Simple layout: Cross (+) shape walls to create 4 quadrants (rooms)
    const wallHeight = 4;
    const wallThick = 0.5;

    // Horizontal Wall
    const hWall = new THREE.Mesh(
        new THREE.BoxGeometry(CONFIG.width - 10, wallHeight, wallThick),
        new THREE.MeshStandardMaterial({ color: CONFIG.colors.roomWall })
    );
    hWall.position.set(CONFIG.width / 2, y + wallHeight / 2, CONFIG.depth / 2);
    buildingGroup.add(hWall);

    // Vertical Wall
    const vWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, wallHeight, CONFIG.depth - 10),
        new THREE.MeshStandardMaterial({ color: CONFIG.colors.roomWall })
    );
    vWall.position.set(CONFIG.width / 2, y + wallHeight / 2, CONFIG.depth / 2);
    buildingGroup.add(vWall);
}

function createStairs(x, y, z) {
    // Create a series of steps going up
    const steps = 8;
    const stepHeight = CONFIG.floorHeight / steps;
    const stepDepth = 1.5;

    const group = new THREE.Group();

    for (let s = 0; s < steps; s++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.5, stepDepth),
            new THREE.MeshStandardMaterial({ color: CONFIG.colors.stairs })
        );
        // Spiral or straight? Let's do straight for clarity
        step.position.set(0, s * stepHeight, s * (stepDepth - 0.2));
        group.add(step);
    }

    group.position.set(x, y, z);
    // Rotate to face inward
    group.lookAt(CONFIG.width / 2, y, CONFIG.depth / 2);
    buildingGroup.add(group);
}

function createTextLabel(text, x, y, z) {
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
    sprite.position.set(x, y + 4, z);
    sprite.scale.set(10, 2.5, 1);
    buildingGroup.add(sprite);
}

// --- LOGIC ---

export function updateSensorData(data) {
    // Reset Nodes
    buildingGroup.children.forEach(child => {
        if (child.userData.type === 'node') {
            child.material.color.setHex(CONFIG.colors.highlight);
            child.material.emissive.setHex(0x1e40af);
        }
    });

    if (data.type === 'flame' && data.value === 1) {
        // Highlight Fire Node
        const fireNode = buildingGroup.children.find(c =>
            c.userData.type === 'node' &&
            c.userData.floor === data.floor &&
            c.userData.id === data.node
        );

        if (fireNode) {
            fireNode.material.color.setHex(CONFIG.colors.danger);
            fireNode.material.emissive.setHex(0xff0000);
        }

        emergencyLight.visible = true;
        triggerEvacuation(data.floor, data.node);
    } else {
        emergencyLight.visible = false;
    }
}

function triggerEvacuation(dangerFloor, dangerNodeId) {
    if (isEvacuating) return;
    isEvacuating = true;

    console.log(`🚨 EVACUATING: Fire at Floor ${dangerFloor}, Node ${dangerNodeId}`);

    // 1. Spawn Person in a Room (Random Quadrant)
    const startX = CONFIG.width / 2 + (Math.random() > 0.5 ? 10 : -10);
    const startZ = CONFIG.depth / 2 + (Math.random() > 0.5 ? 10 : -10);
    const startY = (dangerFloor - 1) * CONFIG.floorHeight + 1;

    if (!personMesh) createPerson(startX, startY, startZ);
    personMesh.position.set(startX, startY, startZ);
    personMesh.visible = true;

    // 2. Find Nearest Safe Node
    const nodes = [1, 2, 3, 4];
    const safeNodes = nodes.filter(n => n !== dangerNodeId);

    // Find closest safe node by distance
    let bestNode = null;
    let minDist = Infinity;

    safeNodes.forEach(id => {
        const nodeObj = buildingGroup.children.find(c =>
            c.userData.type === 'node' &&
            c.userData.floor === dangerFloor &&
            c.userData.id === id
        );
        if (nodeObj) {
            const dist = new THREE.Vector3(startX, startY, startZ).distanceTo(nodeObj.position);
            if (dist < minDist) {
                minDist = dist;
                bestNode = nodeObj;
            }
        }
    });

    if (bestNode) {
        // Path: Room -> Hallway (Center) -> Safe Node -> Downstairs
        const path = [
            new THREE.Vector3(startX, startY, startZ), // Start
            new THREE.Vector3(CONFIG.width / 2, startY, CONFIG.depth / 2), // Hallway/Center
            new THREE.Vector3(bestNode.position.x, startY, bestNode.position.z) // Safe Node
        ];

        // Add downstairs path
        for (let i = dangerFloor - 1; i >= 0; i--) {
            path.push(new THREE.Vector3(bestNode.position.x, i * CONFIG.floorHeight + 1, bestNode.position.z));
        }
        // Exit
        path.push(new THREE.Vector3(0, 1, 0));

        animatePerson(path);
    }
}

function createPerson(x, y, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0xf97316 })
    );
    body.position.y = 1;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd4aa })
    );
    head.position.y = 2.5;
    group.add(body, head);
    group.position.set(x, y, z);

    personMesh = group;
    scene.add(personMesh);
}

function animatePerson(points) {
    let currentPointIdx = 0;
    let progress = 0;
    const speed = 0.05; // Slower for better visualization

    function step() {
        if (currentPointIdx >= points.length - 1) {
            isEvacuating = false;
            return;
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
        personMesh.lookAt(p2); // Face direction
        requestAnimationFrame(step);
    }
    step();
}

// --- ANIMATION ---
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// --- CONTROLS ---
function setupControls(domElement) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    domElement.addEventListener('mousedown', () => isDragging = true);
    domElement.addEventListener('mouseup', () => isDragging = false);

    domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = { x: e.offsetX - previousMousePosition.x };
            buildingGroup.rotation.y += deltaMove.x * 0.005;
        }
        previousMousePosition = { x: e.offsetX, y: e.pageY };
    });
}
