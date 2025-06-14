// Wait for document to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Hide the loading message and only show it if there's an error
    document.getElementById('loading').style.display = 'none';
    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera setup - perspective camera with 75° FOV, aspect ratio matching the window, and sensible near/far clipping planes
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5; // Position camera at a fixed distance
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 0); // Transparent background to show CSS gradient
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Add a simple debug message to confirm Three.js is running
    console.log('Three.js initialized');
    
    // Add stronger ambient light so the cube is clearly visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    // Add directional light for better shading
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add a second directional light from another angle
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Future image paths will be in the images folder
    // These can be updated with actual images later
    const imagePaths = [
        'images/face1.png',
        'images/face2.png',
        'images/face3.png',
        'images/face4.png',
        'images/face5.png',
        'images/face6.png'
    ];
    
    // URLs to link to (these can be updated later)
    const linkUrls = [
        'https://josuedean.github.io/ibm/',
        'https://josuedean.github.io/ibm/',
        'https://josuedean.github.io/ibm/',
        'https://josuedean.github.io/ibm/',
        'https://josuedean.github.io/ibm/',
        'https://josuedean.github.io/ibm/'
    ];
    
    // Create materials - use textures for faces where images exist
    const textureLoader = new THREE.TextureLoader();
    const grayColor = 0x888888; // Medium gray color for fallback
    const materials = [];
    
    // Function to handle texture loading for each face
    const loadFaceTexture = (faceNumber) => {
        const path = `images/face${faceNumber}.png`;
        
        // Create a material with the texture or gray fallback
        const material = new THREE.MeshStandardMaterial({ color: grayColor });
        
        // Try to load the texture
        textureLoader.load(
            // Resource URL
            path,
            
            // onLoad callback - if it loads successfully, update the material
            (texture) => {
                material.map = texture;
                material.needsUpdate = true;
                console.log(`Successfully loaded ${path}`);
            },
            
            // onProgress callback - not needed for now
            undefined,
            
            // onError callback - log error but the gray material will remain
            (err) => {
                console.log(`Face${faceNumber} image not found, using gray: ${err.message}`);
            }
        );
        
        return material;
    };
    
    // Try to load all six face textures
    for (let i = 1; i <= 6; i++) {
        materials.push(loadFaceTexture(i));
    }
    
    // Create cube geometry - slightly larger for better visibility
    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    
    // Log that the cube has been added to the scene
    console.log('Cube added to scene');
    
    // Setup mouse controls to rotate the cube
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    // Rotation speed control
    const rotationSpeed = 0.01;
    
    // Auto rotation when not being interacted with
    let autoRotate = true;
    const autoRotationSpeed = 0.005;
    
    // Handle mouse events for interaction
    document.addEventListener('mousedown', (event) => {
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
        // Permanently disable auto-rotation after first user interaction
        autoRotate = false;
    });
    
    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };
            
            // Rotate cube based on mouse movement
            // Keep the original opposite mapping for left/right movement
            cube.rotation.y += deltaMove.x * rotationSpeed;
            cube.rotation.x += deltaMove.y * rotationSpeed;
            
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        // No longer re-enable auto-rotation
    });
    
    // Prevent zooming - no scroll listener needed
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Handle clicks on cube faces
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    document.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObject(cube);
        
        if (intersects.length > 0) {
            // Get the face index
            const faceIndex = Math.floor(intersects[0].faceIndex / 2);
            
            // Open the URL associated with the clicked face
            window.open(linkUrls[faceIndex], '_blank');
        }
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Auto-rotate cube if not being dragged
        if (autoRotate) {
            cube.rotation.y += autoRotationSpeed;
            cube.rotation.x += autoRotationSpeed * 0.5;
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
});
