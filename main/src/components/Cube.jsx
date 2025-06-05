import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

// Course textures will be loaded from these paths
const texturePaths = {
  'digital-literacy': '/images/cube-faces/digital-literacy.png',
  'accounting': '/images/cube-faces/accounting.png',
  'data-analysis': '/images/cube-faces/data-analysis.png',
  'intro-programming': '/images/cube-faces/intro-programming.png',
  'global-logistics': '/images/cube-faces/global-logistics.png',
  'university': '/images/cube-faces/university-logo.png', // 6th face
};

// Course routes for navigation
const courseRoutes = {
  'digital-literacy': '/digital-literacy',
  'accounting': '/accounting',
  'data-analysis': '/data-analysis',
  'intro-programming': '/intro-programming',
  'global-logistics': '/global-logistics',
  'university': '/', // Homepage
};

const Cube = () => {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  
  // Scene objects we need to access outside the initial setup
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const cubeRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const autoRotateRef = useRef(true);
  
  // Track which face is currently selected (for keyboard navigation)
  const selectedFaceRef = useRef(null);
  
  // Mapping of faces to course IDs
  const faceIndices = {
    0: 'digital-literacy',    // Right
    1: 'accounting',          // Left
    2: 'data-analysis',       // Top
    3: 'intro-programming',   // Bottom
    4: 'global-logistics',    // Front
    5: 'university',          // Back
  };
  
  // Initialize the 3D scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create cube with placeholder materials
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    
    // Create placeholder materials with course colors
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0x1E90FF }), // Digital Literacy - Blue
      new THREE.MeshBasicMaterial({ color: 0x4CAF50 }), // Accounting - Green
      new THREE.MeshBasicMaterial({ color: 0x9C27B0 }), // Data Analysis - Purple
      new THREE.MeshBasicMaterial({ color: 0xFF9800 }), // Intro to Programming - Amber
      new THREE.MeshBasicMaterial({ color: 0xFF5252 }), // Global Logistics - Red
      new THREE.MeshBasicMaterial({ color: 0x004A99 })  // University - Dark Blue
    ];
    
    // Create cube
    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cubeRef.current = cube;
    
    // Setup raycaster for interactions
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    
    // Add texture loader
    const loadTextures = () => {
      const textureLoader = new THREE.TextureLoader();
      
      // Load each texture and apply to corresponding face
      Object.entries(texturePaths).forEach(([courseId, path], index) => {
        textureLoader.load(
          path, 
          (texture) => {
            // Apply texture to material
            materials[index].map = texture;
            materials[index].needsUpdate = true;
            
            // Add ARIA labels and metadata to faces for accessibility
            const face = cube.geometry.faces ? cube.geometry.faces[index] : null;
            if (face) {
              face.courseId = courseId;
              face.altText = `${courseId.replace('-', ' ')} course`;
            }
          },
          undefined,
          (err) => console.error(`Error loading texture: ${path}`, err)
        );
      });
    };
    
    // Call texture loading function
    loadTextures();
    
    // Setup animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Auto-rotate if not being interacted with
      if (autoRotateRef.current) {
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Handle mouse move for hover effects
    const handleMouseMove = (event) => {
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouseRef.current, camera);
      
      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObject(cube);
      
      // Reset cursor
      document.body.style.cursor = 'default';
      
      if (intersects.length > 0) {
        // Change cursor to indicate clickable
        document.body.style.cursor = 'pointer';
        
        // Get the face index
        const faceIndex = Math.floor(intersects[0].faceIndex / 2);
        selectedFaceRef.current = faceIndex;
      } else {
        selectedFaceRef.current = null;
      }
    };
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    
    // Handle mouse click
    const handleClick = () => {
      if (selectedFaceRef.current !== null) {
        const courseId = faceIndices[selectedFaceRef.current];
        navigate(courseRoutes[courseId]);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);
    
    // Handle mouse enter/leave for auto-rotation
    const handleMouseEnter = () => {
      autoRotateRef.current = false;
    };
    const handleMouseLeave = () => {
      autoRotateRef.current = true;
    };
    renderer.domElement.addEventListener('mouseenter', handleMouseEnter);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    
    // Handle keyboard navigation
    const handleKeyDown = (event) => {
      // Only handle keyboard navigation if cube is focused
      if (document.activeElement !== mountRef.current) return;
      
      switch (event.key) {
        case 'ArrowRight':
          cube.rotation.y -= Math.PI / 12;
          event.preventDefault();
          break;
        case 'ArrowLeft':
          cube.rotation.y += Math.PI / 12;
          event.preventDefault();
          break;
        case 'ArrowUp':
          cube.rotation.x += Math.PI / 12;
          event.preventDefault();
          break;
        case 'ArrowDown':
          cube.rotation.x -= Math.PI / 12;
          event.preventDefault();
          break;
        case 'Enter':
          if (selectedFaceRef.current !== null) {
            const courseId = faceIndices[selectedFaceRef.current];
            navigate(courseRoutes[courseId]);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mouseenter', handleMouseEnter);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      
      // Clean up Three.js resources
      mountRef.current.removeChild(renderer.domElement);
      cube.geometry.dispose();
      materials.forEach(material => material.dispose());
      renderer.dispose();
    };
  }, [navigate]);
  
  return (
    <div 
      ref={mountRef} 
      className="cube-container" 
      tabIndex={0} 
      aria-label="Interactive 3D cube. Use arrow keys to rotate and Enter to select a course."
    />
  );
};

export default Cube;
