/**
 * 3D Library Visualizer using Three.js
 */
class LibraryVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.books = [];
        this.booksByGenre = {};
        this.genrePositions = {};
        this.bookObjects = [];
        this.genreLabels = []; 
        this.currentFilter = 'all';
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedBook = null;
        this.activeGenre = null; 
        
        this.keyStates = {};
        this.moveSpeed = 0.5;
        this.cameraMoveVector = new THREE.Vector3();
        this.targetCameraPosition = null;
        this.targetLookAt = null;
        this.animationInProgress = false;
        this.animationDuration = 1000; 
        this.animationStartTime = 0;
        this.startCameraPosition = null;

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2c3e50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 5, 15);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Lights + Floor
        this.addLights();
        this.addFloor();
        
        // Events
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
        window.addEventListener('keyup', this.onKeyUp.bind(this), false);
        this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
        
        // Start loop
        this.animate();
    }

    onKeyDown(event) {
        this.keyStates[event.code] = true;
    }
    onKeyUp(event) {
        this.keyStates[event.code] = false;
    }

    onMouseWheel(event) {
        event.preventDefault();
        const zoomIntensity = 0.1;
        const delta = -Math.sign(event.deltaY) * zoomIntensity;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.camera.position.addScaledVector(forward, delta * 5);
        this.controls.update();
    }

    updateCameraPosition() {
        if (this.animationInProgress) return;
        
        this.cameraMoveVector.set(0, 0, 0);
        if (this.keyStates['KeyW'] || this.keyStates['ArrowUp']) {
            this.cameraMoveVector.z = -this.moveSpeed;
        }
        if (this.keyStates['KeyS'] || this.keyStates['ArrowDown']) {
            this.cameraMoveVector.z = this.moveSpeed;
        }
        if (this.keyStates['KeyA'] || this.keyStates['ArrowLeft']) {
            this.cameraMoveVector.x = -this.moveSpeed;
        }
        if (this.keyStates['KeyD'] || this.keyStates['ArrowRight']) {
            this.cameraMoveVector.x = this.moveSpeed;
        }
        
        if (this.cameraMoveVector.length() > 0) {
            this.cameraMoveVector.applyQuaternion(this.camera.quaternion);
            this.camera.position.add(this.cameraMoveVector);
            
            const forward = new THREE.Vector3(0, 0, -1)
                .applyQuaternion(this.camera.quaternion)
                .multiplyScalar(10);
            this.controls.target.copy(this.camera.position).add(forward);
            this.controls.update();
        }
    }

    updateCameraAnimation() {
        if (!this.animationInProgress) return;
        
        const now = Date.now();
        const elapsed = now - this.animationStartTime;
        
        if (elapsed >= this.animationDuration) {
            this.camera.position.copy(this.targetCameraPosition);
            this.controls.target.copy(this.targetLookAt);
            this.controls.update();
            this.animationInProgress = false;
            return;
        }
        
        const progress = elapsed / this.animationDuration;
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        const eased = easeOutCubic(progress);
        
        this.camera.position.lerpVectors(
            this.startCameraPosition,
            this.targetCameraPosition,
            eased
        );
        this.controls.target.lerpVectors(
            this.controls.target.clone(),
            this.targetLookAt,
            eased
        );
        this.controls.update();
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
        pointLight1.position.set(-10, 8, 5);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
        pointLight2.position.set(10, 8, -5);
        this.scene.add(pointLight2);
    }

    addFloor() {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        
        // Create a wood texture for the floor
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;
        
        // Base wood color
        context.fillStyle = '#8B4513'; // SaddleBrown
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add wood grain
        context.strokeStyle = '#A0522D'; // Sienna
        context.lineWidth = 3;
        
        // Create random wood grain pattern
        for (let i = 0; i < 40; i++) {
            const y = Math.random() * canvas.height;
            context.beginPath();
            context.moveTo(0, y);
            
            // Create wavy line for wood grain
            for (let x = 0; x < canvas.width; x += 20) {
                const yOffset = y + (Math.random() * 10 - 5);
                context.lineTo(x, yOffset);
            }
            
            context.stroke();
        }
        
        // Add some darker knots randomly
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 5 + Math.random() * 15;
            
            context.fillStyle = '#5D4037'; // Dark brown
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
            
            // Add lighter ring around knot
            context.strokeStyle = '#D7CCC8'; // Light wood color
            context.lineWidth = 2;
            context.beginPath();
            context.arc(x, y, radius + 2, 0, Math.PI * 2);
            context.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10); // Repeat the texture
        
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.updateCameraPosition();
        this.updateCameraAnimation();
        this.updateBookAnimations();
        this.checkCameraDistance();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loadData(data) {
        this.books = data.books;
        this.booksByGenre = data.booksByGenre;
        this.clearBooks();
        this.calculateGenrePositions();
        this.createBooks();
    }

    clearBooks() {
        for (let obj of this.bookObjects) {
            this.scene.remove(obj.mesh);
        }
        this.bookObjects = [];
        
        for (let label of this.genreLabels) {
            this.scene.remove(label.mesh);
        }
        this.genreLabels = [];
    }

    calculateGenrePositions() {
        const genreCount = Object.keys(this.booksByGenre).length;
        const radius = Math.max(genreCount * 2.5, 15);
        let angle = 0;
        const angleStep = (2 * Math.PI) / genreCount;
        
        let i = 0;
        for (let genre in this.booksByGenre) {
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            this.genrePositions[genre] = {
                center: new THREE.Vector3(x, 0, z),
                rotation: -angle + Math.PI / 2,
                index: i
            };
            angle += angleStep;
            i++;
        }
    }

    createBooks() {
        for (let genre in this.booksByGenre) {
            
            const books = this.booksByGenre[genre];
            const genrePosition = this.genrePositions[genre];
            
            // Add the genre label at the genre center
            this.addGenreLabel(genre, genrePosition.center);
            
            // Create a group for this genre’s books.
            const genreGroup = new THREE.Group();
            
            // Shelf and book parameters
            const shelfWidth = 12;
            const shelfHeight = 2.5;
            const bookThickness = 0.3;
            const bookSpacing = 0.1;
            const effectiveBookWidth = bookThickness + bookSpacing;
            const bookHeight = 2;
            const maxBooksPerShelf = Math.floor(shelfWidth / effectiveBookWidth);
            
            // Create each book in the group with local (unrotated) coordinates.
            for (let i = 0; i < books.length; i++) {
                const book = books[i];
                
                const shelfLevel = Math.floor(i / maxBooksPerShelf);
                const positionInShelf = i % maxBooksPerShelf;
                
                let booksOnThisShelf = maxBooksPerShelf;
                if (shelfLevel === Math.floor((books.length - 1) / maxBooksPerShelf)) {
                    booksOnThisShelf = books.length - (shelfLevel * maxBooksPerShelf);
                }
                
                const totalShelfSpace = booksOnThisShelf * effectiveBookWidth;
                const shelfOffset = (shelfWidth - totalShelfSpace) / 2;
                const bookPosition = (positionInShelf * effectiveBookWidth)
                                   + (bookThickness / 2)
                                   - (shelfWidth / 2)
                                   + shelfOffset;
                
                // Local coordinates along X and Y. Here we assume the shelf runs along the local X axis.
                const localX = bookPosition;
                const localY = shelfLevel * shelfHeight + (bookHeight / 2);
                
                // Create the book mesh and position it locally (no rotation here).
                const bookMesh = this.createBookMesh(book, bookThickness, bookHeight, 1.5, shelfLevel);
                bookMesh.position.set(localX, localY, 0);
                genreGroup.add(bookMesh);
                
                // Save the book object; note that we will update the original world transform
                // after positioning the group.
                this.bookObjects.push({
                    mesh: bookMesh,
                    book: book,
                    genre: genre,
                    originalPosition: new THREE.Vector3(), // placeholder; update below.
                    originalRotation: new THREE.Euler(),     // placeholder; update below.
                    shelfLevel,
                    positionInShelf
                });
            }
            
            // Position the entire group at the genre center and rotate it according to the genre.
            genreGroup.position.copy(genrePosition.center);
            genreGroup.rotation.y = genrePosition.rotation;
            this.scene.add(genreGroup);
            
            // Now update each book’s original (world) position/rotation using the group’s transform.
            genreGroup.updateMatrixWorld(true);
            genreGroup.traverse(child => {
                if (child instanceof THREE.Mesh && child.userData.book) {
                    const bookObj = this.bookObjects.find(obj => obj.mesh === child);
                    if (bookObj) {
                        // Compute world position
                        child.getWorldPosition(bookObj.originalPosition);
                        // Compute world rotation as an Euler angle from the quaternion.
                        const quat = new THREE.Quaternion();
                        child.getWorldQuaternion(quat);
                        const euler = new THREE.Euler();
                        euler.setFromQuaternion(quat);
                        bookObj.originalRotation.copy(euler);
                    }
                }
            });
        }
    }
    

    createBookMesh(book, thickness, height, width, shelfLevel) {
        const geometry = new THREE.BoxGeometry(thickness, height, width);
        
        // Swapped so that "spineMaterial" is from createBookCover, etc.
        const spineMaterial = this.createBookCover(book);
        const coverMaterial = this.createBookSpine(book, thickness, height);
        
        // Face order: [+x, -x, +y, -y, +z, -z]
        const materials = [
            spineMaterial,                                         // +x = SPINE
            new THREE.MeshStandardMaterial({ color: 0xffffff }),   // -x
            new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }),   // +y
            new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }),   // -y
            coverMaterial,                                         // +z = COVER
            new THREE.MeshStandardMaterial({ color: 0xffffff })    // -z
        ];
        
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.userData.book = book;
        
        // Make unavailable books glow with a reddish color
        if (!book.Available) {
            // Add emissive red glow to all materials
            materials.forEach(material => {
                if (material.emissive) {
                    material.emissive.set(0xff0000); // Red
                    material.emissiveIntensity = 0.3; // Subtle glow
                }
            });
        }
        
        return mesh;
    }

    createBookSpine(book, width, height) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 512;
        
        const genreHash = this.hashString(book.Genre);
        const r = ((genreHash & 0xFF0000) >> 16) / 255;
        const g = ((genreHash & 0x00FF00) >> 8) / 255;
        const b = (genreHash & 0x0000FF) / 255;
        
        context.fillStyle = `rgb(${Math.floor(r*200+55)}, ${Math.floor(g*200+55)}, ${Math.floor(b*200+55)})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(Math.PI/2);
        
        context.font = 'bold 42px Arial';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        let title = book.Title;
        if (title.length > 25) {
            title = title.substring(0, 22) + '...';
        }
        context.fillText(title, 0, 0);
        context.restore();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7,
            metalness: 0.2
        });
    }

    createBookCover(book) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;
        
        const genreHash = this.hashString(book.Genre);
        const r = ((genreHash & 0xFF0000) >> 16) / 255;
        const g = ((genreHash & 0x00FF00) >> 8) / 255;
        const b = (genreHash & 0x0000FF) / 255;
        
        context.fillStyle = `rgb(${Math.floor(r*200+55)}, ${Math.floor(g*200+55)}, ${Math.floor(b*200+55)})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#333333';
        context.lineWidth = 8;
        context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        
        let y = 100;
        
        context.font = 'bold 42px Arial';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        const title = book.Title;
        const words = title.split(' ');
        let lines = [];
        let currentLine = '';
        
        for (let word of words) {
            if (currentLine.length + word.length + 1 <= 20) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        const lineHeight = 42;
        for (let line of lines) {
            context.fillText(line, canvas.width / 2, y);
            y += lineHeight;
        }
        
        y += 100;
        context.font = '32px Arial';
        context.fillText(`by ${book.Author}`, canvas.width / 2, y);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7,
            metalness: 0.1
        });
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            // Check if we hit a genre label
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                if (obj.userData.isGenreLabel) {
                    this.navigateToGenre(obj.userData.genre);
                    return;
                }
            }
            // Check if we hit a book in the active genre
            if (this.activeGenre) {
                for (let i = 0; i < intersects.length; i++) {
                    const obj = intersects[i].object;
                    if (obj.userData.book) {
                        const bookObj = this.bookObjects.find(b => b.mesh === obj);
                        if (bookObj && bookObj.genre === this.activeGenre) {
                            this.selectBook(obj);
                            return;
                        }
                    }
                }
            }
        }
        this.deselectBook();
    }

    navigateToGenre(genre) {
        const genrePos = this.genrePositions[genre];
        if (!genrePos) return;
        
        // If we're selecting a different genre, return any selected books to their original positions
        if (this.activeGenre !== genre) {
            this.deselectAllBooks();
        }
        
        const targetPos = genrePos.center.clone();
        const direction = new THREE.Vector3()
            .subVectors(targetPos, new THREE.Vector3(0, 0, 0))
            .normalize();
        const distance = 10;
        const cameraPos = targetPos.clone().add(direction.multiplyScalar(distance));
        cameraPos.y = 4;
        
        this.targetCameraPosition = cameraPos;
        this.targetLookAt = targetPos.clone();
        this.startCameraPosition = this.camera.position.clone();
        
        this.animationInProgress = true;
        this.animationStartTime = Date.now();
        
        this.activeGenre = genre;
        this.updateGenreLabels();
    }
    
    updateGenreLabels() {
        for (let label of this.genreLabels) {
            const isActive = label.genre === this.activeGenre;
            if (label.mesh.material.emissive) {
                if (isActive) {
                    label.mesh.material.emissive.set(0x3498db);
                    label.mesh.material.emissiveIntensity = 0.5;
                } else {
                    label.mesh.material.emissive.set(0x000000);
                    label.mesh.material.emissiveIntensity = 0;
                }
            }
        }
    }

    addGenreLabel(genre, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 192;
        
        // Use the same color generation as books for consistency
        const genreHash = this.hashString(genre);
        const r = ((genreHash & 0xFF0000) >> 16) / 255;
        const g = ((genreHash & 0x00FF00) >> 8) / 255;
        const b = (genreHash & 0x0000FF) / 255;
        
        // Fill with the same color as book spines
        context.fillStyle = `rgb(${Math.floor(r*200+55)}, ${Math.floor(g*200+55)}, ${Math.floor(b*200+55)})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 4;
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        const fontSize = 36;
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        const words = genre.split(' ');
        let lines = [];
        let currentLine = '';
        const wrapLength = genre.length > 10 ? 8 : 15;
        
        for (let word of words) {
            if (currentLine.length + word.length + 1 <= wrapLength) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        const lineHeight = fontSize + 6;
        let y = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        
        for (let line of lines) {
            context.fillText(line, canvas.width / 2, y);
            y += lineHeight;
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const aspectRatio = canvas.height / canvas.width;
        const planeWidth = 4;
        const planeHeight = planeWidth * aspectRatio;
        
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, 5, position.z);
        mesh.rotation.y = this.genrePositions[genre].rotation;
        
        mesh.userData.genre = genre;
        mesh.userData.isGenreLabel = true;
        
        this.scene.add(mesh);
        
        this.genreLabels.push({
            mesh: mesh,
            genre: genre,
            position: position.clone()
        });
    }

    selectBook(bookMesh) {
        this.deselectBook();
        
        const bookObj = this.bookObjects.find(obj => obj.mesh === bookMesh);
        if (!bookObj) return;
        
        this.selectedBook = bookMesh;
        bookMesh._originalMaterials = bookMesh.material.map(mat => mat.clone());
        
        this.animateBookSelection(bookObj);
        
        const book = bookMesh.userData.book;
        const detailsDiv = document.getElementById('bookDetails');
        if (detailsDiv) {
            const lastCheckoutDate = new Date(book['Last Checkout Date']);
            const formattedDate = lastCheckoutDate.toLocaleDateString();
            
            detailsDiv.innerHTML = `
                <p><strong>Title:</strong> ${book.Title}</p>
                <p><strong>Author:</strong> ${book.Author}</p>
                <p><strong>Genre:</strong> ${book.Genre}</p>
                <p><strong>Publication Year:</strong> ${book['Publication Year']}</p>
                <p><strong>Status:</strong> ${book.Available ? 'Available' : 'Checked Out'}</p>
                <p><strong>Last Checkout:</strong> ${formattedDate}</p>
                <p><strong>Book ID:</strong> ${book['Book ID']}</p>
            `;
        }
    }

    // -------------------------------------------------------------------------
    //   2-STEP ANIMATION:
    //   STEP 1: Pull out by 1.5 units (the cover width)
    //   STEP 2: Move 4 units in front of camera + rotate so +Z faces camera
    // -------------------------------------------------------------------------
    animateBookSelection(bookObj) {
        const mesh = bookObj.mesh;
        const parent = mesh.parent;
    
        // Get current world position and quaternion for the book.
        const worldOriginalPos = new THREE.Vector3();
        mesh.getWorldPosition(worldOriginalPos);
    
        const worldOriginalQuat = new THREE.Quaternion();
        mesh.getWorldQuaternion(worldOriginalQuat);
        
        // The book's local start position and rotation are already in parent's space.
        const localStartPos = mesh.position.clone();
        const localOriginalRot = mesh.rotation.clone();
    
        // STEP 1: Compute pull-out in world space.
        const worldOriginalRot = new THREE.Euler().setFromQuaternion(worldOriginalQuat);
        const pullDirection = new THREE.Vector3(0, 0, 1)
            .applyEuler(worldOriginalRot)
            .normalize();
        const pullDistance = 1.5;
        const worldPullOutPos = worldOriginalPos.clone().add(pullDirection.multiplyScalar(pullDistance));
        const localPullOutPos = parent.worldToLocal(worldPullOutPos.clone());
    
        // STEP 2: Compute final position in world space.
        const forward = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.camera.quaternion)
            .normalize();
        const worldFinalPos = this.camera.position.clone().add(forward.multiplyScalar(2));
        worldFinalPos.y = this.camera.position.y - 1; // slightly below camera
        const localFinalPos = parent.worldToLocal(worldFinalPos.clone());
    
        // Compute the target rotation directly in the parent's local space.
        // Convert the camera's world position to the parent's local space.
        const localCameraPos = parent.worldToLocal(this.camera.position.clone());
        // The book's local position is already available.
        const localBookPos = mesh.position.clone();
        // Compute the direction from the book to the camera in local space.
        const localDir = new THREE.Vector3().subVectors(localCameraPos, localBookPos).normalize();
        // Calculate the angle so that the book's local +Z axis faces the camera.
        const localAngle = Math.atan2(localDir.x, localDir.z);
        const localTargetRot = new THREE.Euler(0, localAngle - Math.PI / 2, 0);
    
        // Set up the animation data in parent's local space.
        mesh.userData.animation = {
            startTime: Date.now(),
            totalDuration: 1000,
            pullDuration: 300,
    
            startPosition: localStartPos,
            pullOutPosition: localPullOutPos,
            startRotation: localOriginalRot,
            midRotation: localOriginalRot.clone(),
    
            finalPosition: localFinalPos,
            targetRotation: localTargetRot,
    
            originalPosition: localStartPos,
            originalRotation: localOriginalRot,
    
            active: true,
            reverse: false,
            step: 1
        };
    }      

    updateBookAnimations() {
        for (let bookObj of this.bookObjects) {
            const mesh = bookObj.mesh;
            const anim = mesh.userData.animation;
            if (!anim || !anim.active) continue;
            
            const elapsed = Date.now() - anim.startTime;
            const totalDur = anim.totalDuration;
            
            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
            const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
            
            if (anim.reverse) {
                // Reverse: put book back
                const progress = clamp(elapsed / totalDur, 0, 1);
                const e = easeOutCubic(progress);

                if (progress >= 1) {
                    mesh.position.copy(anim.originalPosition);
                    mesh.quaternion.setFromEuler(anim.originalRotation);
                    mesh.userData.animation.active = false;
                } else {
                    mesh.position.lerpVectors(anim.finalPosition, anim.originalPosition, e);
                    const startQ = new THREE.Quaternion().setFromEuler(anim.targetRotation);
                    const endQ   = new THREE.Quaternion().setFromEuler(anim.originalRotation);
                    mesh.quaternion.slerpQuaternions(startQ, endQ, e);
                }
            } else {
                // Forward: step 1 => step 2
                if (anim.step === 1) {
                    // Pull out
                    const progress = clamp(elapsed / anim.pullDuration, 0, 1);
                    const e = easeOutCubic(progress);

                    if (progress >= 1) {
                        anim.step = 2;
                        anim.startTime = Date.now();
                    } else {
                        // Lerp position from original->pullOut
                        mesh.position.lerpVectors(
                            anim.startPosition,
                            anim.pullOutPosition,
                            e
                        );
                        // Keep same rotation in step 1
                        mesh.quaternion.setFromEuler(anim.startRotation);
                    }
                } else if (anim.step === 2) {
                    // Move + rotate
                    const step2Duration = totalDur - anim.pullDuration;
                    const step2Elapsed = elapsed - anim.pullDuration;
                    const progress = clamp(step2Elapsed / step2Duration, 0, 1);
                    const e = easeOutCubic(progress);

                    if (progress >= 1) {
                        mesh.position.copy(anim.finalPosition);
                        mesh.quaternion.setFromEuler(anim.targetRotation);
                    } else {
                        mesh.position.lerpVectors(
                            anim.pullOutPosition,
                            anim.finalPosition,
                            e
                        );
                        const startQ = new THREE.Quaternion().setFromEuler(anim.originalRotation);
                        const endQ   = new THREE.Quaternion().setFromEuler(anim.targetRotation);
                        mesh.quaternion.slerpQuaternions(startQ, endQ, e);
                    }
                }
            }
        }
    }

    deselectBook() {
        if (this.selectedBook) {
            const bookObj = this.bookObjects.find(obj => obj.mesh === this.selectedBook);
            if (bookObj) {
                const mesh = this.selectedBook;
                if (mesh.userData.animation) {
                    const anim = mesh.userData.animation;
                    anim.startTime = Date.now();
                    anim.reverse = true;
                    anim.active = true;
                }
                if (mesh._originalMaterials) {
                    mesh.material = mesh._originalMaterials;
                    delete mesh._originalMaterials;
                }
            }
            
            this.selectedBook = null;
            
            const detailsDiv = document.getElementById('bookDetails');
            if (detailsDiv) {
                detailsDiv.innerHTML = '<p>Click on a book to see details</p>';
            }
        }
    }
    
    // New method to deselect all books when camera moves far away or genre changes
    deselectAllBooks() {
        // First deselect the currently selected book if any
        this.deselectBook();
        
        // Then check all book objects and return any that are animated to their original positions
        for (let bookObj of this.bookObjects) {
            const mesh = bookObj.mesh;
            const anim = mesh.userData.animation;
            
            // If the book is in the middle of an animation and not already returning
            if (anim && anim.active && !anim.reverse) {
                anim.startTime = Date.now();
                anim.reverse = true;
            }
        }
    }
    
    // New method to check camera distance from active genre
    checkCameraDistance() {
        // If no active genre or animation in progress, skip this check
        if (!this.activeGenre || this.animationInProgress) return;
        
        const genrePos = this.genrePositions[this.activeGenre];
        if (!genrePos) return;
        
        const genreCenter = genrePos.center.clone();
        const distanceToGenre = this.camera.position.distanceTo(genreCenter);
        
        // If camera is too far from the active genre (more than 25 units), deselect all books
        const maxDistance = 25;
        if (distanceToGenre > maxDistance) {
            this.deselectAllBooks();
            this.activeGenre = null;
            this.updateGenreLabels();
        }
    }

    filterByGenre(genre) {
        this.currentFilter = genre;
        for (let bookObj of this.bookObjects) {
            if (genre === 'all' || bookObj.genre === genre) {
                bookObj.mesh.visible = true;
            } else {
                bookObj.mesh.visible = false;
            }
        }
        if (genre !== 'all') {
            this.navigateToGenre(genre);
        }
    }
}

window.LibraryVisualizer = LibraryVisualizer;
