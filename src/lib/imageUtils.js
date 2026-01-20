/**
 * Image Processing Utility
 * Resizes and compresses images to uniform size for resource previews
 */

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 800;
const TARGET_ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 1:1 (square)
const MAX_FILE_SIZE_MB = 2; // Max input file size in MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const TARGET_QUALITY = 0.85; // WebP quality (0-1)
const TARGET_FILE_SIZE_KB = 500; // Target output size in KB

/**
 * Resize and compress image to uniform dimensions
 * @param {File} file - The image file to process
 * @returns {Promise<File>} - Processed image file as WebP
 */
export async function processResourceImage(file) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (2MB max)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Image must be smaller than ${MAX_FILE_SIZE_MB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            // Calculate dimensions maintaining aspect ratio
            let { width, height } = calculateDimensions(img.width, img.height);
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = TARGET_WIDTH;
            canvas.height = TARGET_HEIGHT;
            const ctx = canvas.getContext('2d');
            
            // Fill with white background (for transparent images)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            
            // Calculate centering offset for aspect ratio differences
            const offsetX = (TARGET_WIDTH - width) / 2;
            const offsetY = (TARGET_HEIGHT - height) / 2;
            
            // Draw and scale image
            ctx.drawImage(img, offsetX, offsetY, width, height);
            
            // Convert to WebP blob with quality compression
            let quality = TARGET_QUALITY;
            let blob = await canvasToWebP(canvas, quality);
            
            // If file is still too large, reduce quality iteratively
            const maxSize = TARGET_FILE_SIZE_KB * 1024; // Convert KB to bytes
            let attempts = 0;
            while (blob.size > maxSize && quality > 0.5 && attempts < 5) {
              quality -= 0.1;
              blob = await canvasToWebP(canvas, quality);
              attempts++;
            }
            
            // Create File object from blob
            const processedFile = new File(
              [blob],
              `resource-${Date.now()}.webp`,
              { type: 'image/webp' }
            );
            
            resolve(processedFile);
          } catch (error) {
            reject(new Error(`Error processing image: ${error.message}`));
          }
        };
        
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target.result;
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate dimensions maintaining aspect ratio while fitting target size
 */
function calculateDimensions(originalWidth, originalHeight) {
  const originalAspectRatio = originalWidth / originalHeight;
  
  let width, height;
  
  if (originalAspectRatio > TARGET_ASPECT_RATIO) {
    // Image is wider - fit to width, center vertically
    width = TARGET_WIDTH;
    height = TARGET_WIDTH / originalAspectRatio;
  } else {
    // Image is taller - fit to height, center horizontally
    height = TARGET_HEIGHT;
    width = TARGET_HEIGHT * originalAspectRatio;
  }
  
  return { width, height };
}

/**
 * Convert canvas to WebP blob
 */
function canvasToWebP(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to WebP'));
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Create preview URL from file
 * @param {File} file - Image file
 * @returns {Promise<string>} - Data URL for preview
 */
export function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
  
  return { valid: true };
}
