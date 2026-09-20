/**
 * Utility helper to handle avatar images from file pickers, cameras, or gallery.
 * Compresses and scales images on the client side using HTML5 Canvas
 * to avoid excessive localStorage/Firestore document size.
 */

export const processAvatarImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Tidak ada file yang dipilih.'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih harus berupa gambar (JPG, PNG, WebP, HEIC).'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 360; // Optimal 360x360 px for avatar quality
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          // Draw and smooth
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 0.85 quality for compact base64 size (~25-50KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch (e) {
          // Fallback to original read if canvas fails
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar dari galeri atau kamera.'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Utility helper to handle document, letter, or proof photos.
 * Compresses images to ~1200px max dimension with 0.82 JPEG quality
 * for sharp readability of handwritten letters while keeping base64 under ~100-150KB.
 * Also supports PDF files by reading data URL directly.
 */
export const processDocumentOrProofImage = (file: File, maxDim: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Tidak ada file yang dipilih.'));
      return;
    }

    // Support PDF directly
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca dokumen PDF.'));
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, WebP) atau dokumen PDF.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          // Quality 0.72 keeps letters sharp while keeping size around 30-50KB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          resolve(dataUrl);
        } catch (e) {
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca gambar berkas izin.'));
    };

    reader.readAsDataURL(file);
  });
};

