import * as THREE from 'three';

/**
 * Texture loading utility for Three.js
 * Handles loading and caching of textures for better performance
 */

// Texture cache to prevent reloading the same textures
const textureCache = new Map();

/**
 * Load a texture with error handling and caching
 * @param {string} path - Path to the texture file
 * @param {Function} onLoad - Callback function when texture is loaded
 * @param {Function} onError - Callback function when texture fails to load
 * @returns {THREE.Texture} The texture object (may be a placeholder if loading fails)
 */
export const loadTexture = (path, onLoad, onError) => {
  // Check if texture is already in cache
  if (textureCache.has(path)) {
    const cachedTexture = textureCache.get(path);
    if (onLoad) onLoad(cachedTexture);
    return cachedTexture;
  }
  
  // Create texture loader
  const textureLoader = new THREE.TextureLoader();
  
  // Load texture
  const texture = textureLoader.load(
    path,
    // Success callback
    (loadedTexture) => {
      textureCache.set(path, loadedTexture);
      if (onLoad) onLoad(loadedTexture);
    },
    // Progress callback
    undefined,
    // Error callback
    (error) => {
      console.error(`Failed to load texture: ${path}`, error);
      if (onError) onError(error);
    }
  );
  
  return texture;
};

/**
 * Create a colored placeholder material
 * @param {number} color - Hex color value
 * @param {string} texturePath - Path to the texture that will eventually replace this placeholder
 * @returns {THREE.MeshBasicMaterial} Material with the specified color
 */
export const createPlaceholderMaterial = (color, texturePath) => {
  const material = new THREE.MeshBasicMaterial({ color });
  
  // Add metadata for accessibility
  material.userData = {
    texturePath,
    isPlaceholder: true
  };
  
  return material;
};

/**
 * Preload all textures for a smoother experience
 * @param {Object} texturePaths - Object with keys as identifiers and values as texture paths
 * @returns {Promise} Promise that resolves when all textures are loaded
 */
export const preloadTextures = (texturePaths) => {
  return new Promise((resolve) => {
    const textureLoader = new THREE.TextureLoader();
    const totalTextures = Object.keys(texturePaths).length;
    let loadedTextures = 0;
    
    // Load each texture and count successful loads
    Object.values(texturePaths).forEach(path => {
      if (textureCache.has(path)) {
        loadedTextures++;
        if (loadedTextures === totalTextures) resolve();
        return;
      }
      
      textureLoader.load(
        path,
        (loadedTexture) => {
          textureCache.set(path, loadedTexture);
          loadedTextures++;
          if (loadedTextures === totalTextures) resolve();
        },
        undefined,
        () => {
          // Count even failed textures so we don't hang
          loadedTextures++;
          if (loadedTextures === totalTextures) resolve();
        }
      );
    });
    
    // Handle edge case where there are no textures to load
    if (totalTextures === 0) resolve();
  });
};
