/**
 * WebGL detection utility functions
 */

/**
 * Check if WebGL is supported in the current browser
 * @returns {boolean} True if WebGL is supported, false otherwise
 */
export const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    const hasWebGL = !!(
      window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
    return hasWebGL;
  } catch (e) {
    console.warn('WebGL detection failed:', e);
    return false;
  }
};

/**
 * Check if WebGL is enabled and performing well
 * More thorough check that attempts to create a simple scene
 * @returns {boolean} True if WebGL is enabled and performing well, false otherwise
 */
export const isWebGLPerformant = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return false;
    
    // Try to create a simple shader program
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    
    // If any of these operations fail, WebGL might not be performing well
    return !!(vertexShader && fragmentShader && program);
  } catch (e) {
    console.warn('WebGL performance check failed:', e);
    return false;
  }
};
