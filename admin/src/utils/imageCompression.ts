/**
 * Compresses an image file using browser Canvas API.
 * @param file - The source image File object
 * @param options - Configuration options for compression
 * @returns Promise resolving to a compressed File object
 */
export async function compressImage(
    file: File, 
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
    const { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = options;

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        
        image.onload = () => {
            let width = image.width;
            let height = image.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not supported'));
                return;
            }

            ctx.drawImage(image, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Image compression failed'));
                        return;
                    }
                    // Create new File from blob
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        image.onerror = (error) => reject(error);
    });
}
