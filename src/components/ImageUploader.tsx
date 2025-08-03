import React, { useState, useEffect, useCallback } from 'react';

export interface PreviewFile {
  id: string;
  file: File;
  preview: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
}

interface ImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  maxImages?: number;
  existingImageCount?: number;
}


export const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const MAX_DIMENSION = 1920;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      if (!event.target?.result) {
        return reject(new Error("Couldn't read file for resizing."));
      }
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Canvas toBlob failed'));
            }
            // Create a new file with the same name but a potentially different type (jpeg)
            const newFileName = file.name.split('.').slice(0, -1).join('.') + '.jpg';
            const newFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesChange, 
  onProcessingChange, 
  maxImages = 5,
  existingImageCount = 0,
}) => {
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [globalError, setGlobalError] = useState<string>('');
  
  const isProcessing = previewFiles.some(f => f.status === 'processing');
  const currentTotalCount = existingImageCount + previewFiles.length;

  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  useEffect(() => {
    const readyFiles = previewFiles
      .filter(f => f.status === 'ready')
      .map(f => f.file);
    onFilesChange(readyFiles);
  }, [previewFiles, onFilesChange]);
  
  useEffect(() => {
    // Cleanup object URLs on unmount
    return () => {
        previewFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    if (currentTotalCount + files.length > maxImages) {
      setGlobalError(`You can only have a maximum of ${maxImages} images in total.`);
      event.target.value = ''; // Reset file input
      return;
    }
    
    const generateId = () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const placeholders: PreviewFile[] = files.map(file => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file), // Temporary URL for the original image
      status: 'processing',
    }));
    setPreviewFiles(prev => [...prev, ...placeholders]);

    for (const placeholder of placeholders) {
      try {
        const resizedFile = await resizeImage(placeholder.file);
        const resizedPreview = URL.createObjectURL(resizedFile);
        
        // Update the placeholder with the processed file and new preview URL
        setPreviewFiles(currentFiles =>
          currentFiles.map(f =>
            f.id === placeholder.id
              ? { ...f, file: resizedFile, preview: resizedPreview, status: 'ready' }
              : f
          )
        );
        // Revoke the original, temporary object URL to prevent memory leaks
        URL.revokeObjectURL(placeholder.preview);
      } catch (err) {
        console.error('Failed to resize image:', placeholder.file.name, err);
        setPreviewFiles(currentFiles =>
          currentFiles.map(f =>
            f.id === placeholder.id
              ? { ...f, status: 'error', error: 'Could not process this image.' }
              : f
          )
        );
      }
    }
    
    event.target.value = '';
  }, [currentTotalCount, maxImages]);

  const removeImage = (idToRemove: string) => {
    setPreviewFiles(currentFiles => {
        const fileToRemove = currentFiles.find(f => f.id === idToRemove);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const getLabelText = () => {
    if (isProcessing) return 'Processing images...';
    return `Add Photos`;
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-600 font-serif">
        Memory Photos (up to {maxImages} total)
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-center text-sm text-slate-600">
            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-sky-500 hover:text-sky-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500 ${isProcessing ? 'opacity-50' : ''}`}>
              <span>{getLabelText()}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={currentTotalCount >= maxImages || isProcessing} />
            </label>
          </div>
          <p className="text-xs text-slate-500">{maxImages - currentTotalCount} slots remaining. Images are resized locally.</p>
        </div>
      </div>
      {globalError && <p className="text-sm text-red-500">{globalError}</p>}
      {previewFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
          {previewFiles.map((upFile) => (
            <div key={upFile.id} className="relative group aspect-square">
              <img src={upFile.preview} alt={`Preview of ${upFile.file.name}`} className="h-full w-full object-cover rounded-md shadow-sm" />
              <div className="absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-60 rounded-md">
                {upFile.status === 'ready' && <span className="text-green-400 text-3xl">&#10003;</span>}
                {upFile.status === 'error' && <span title={upFile.error} className="text-red-500 text-3xl font-bold cursor-help">!</span>}
                {upFile.status === 'processing' && <div className="w-8 h-8 border-4 border-dashed border-white rounded-full animate-spin"></div>}
              </div>
              <button onClick={() => removeImage(upFile.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" aria-label="Remove image">
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};