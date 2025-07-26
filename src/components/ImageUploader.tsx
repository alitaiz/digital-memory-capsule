
import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export interface UploadableFile {
  file: File;
  id: string; 
  preview: string;
  status: 'queued' | 'uploading' | 'success' | 'error' | 'processing';
  publicUrl?: string; 
  error?: string;
}

interface ImageUploaderProps {
  onImagesChange: (imageUrls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxImages?: number;
}

const resizeImage = (file: File): Promise<File> => {
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


export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesChange, onUploadingChange, maxImages = 5 }) => {
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const [globalError, setGlobalError] = useState<string>('');
  
  const isUploading = uploadableFiles.some(f => f.status === 'uploading' || f.status === 'queued' || f.status === 'processing');

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useEffect(() => {
    const filesToUpload = uploadableFiles.filter(f => f.status === 'queued');
    if (filesToUpload.length > 0) {
      filesToUpload.forEach(fileToUpload => {
        setUploadableFiles(currentFiles =>
          currentFiles.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' } : f)
        );
        uploadFile(fileToUpload)
          .then(result => {
            setUploadableFiles(currentFiles =>
              currentFiles.map(f => f.id === result.id ? result : f)
            );
          });
      });
    }
  }, [uploadableFiles]);

  useEffect(() => {
    const successfulUrls = uploadableFiles
      .filter(f => f.status === 'success' && f.publicUrl)
      .map(f => f.publicUrl!);
    onImagesChange(successfulUrls);
  }, [uploadableFiles, onImagesChange]);
  
  useEffect(() => {
    // Cleanup object URLs on unmount
    return () => {
        uploadableFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const uploadFile = async (uploadable: UploadableFile): Promise<UploadableFile> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadable.file.name, contentType: uploadable.file.type }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get upload URL.' }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }
      
      const { uploadUrl, publicUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadable.file,
        headers: { 'Content-Type': uploadable.file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Direct upload to storage failed with status ${uploadResponse.status}. Check R2 bucket CORS policy and public access.`);
      }
      
      return { ...uploadable, status: 'success', publicUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
      console.error(`Upload failed for ${uploadable.file.name}:`, errorMessage);
      return { ...uploadable, status: 'error', error: errorMessage };
    }
  };


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    if (uploadableFiles.length + files.length > maxImages) {
      setGlobalError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }
    
    const generateId = () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as Crypto).randomUUID()
        : Math.random().toString(36).substring(2, 10);

    const fileProcessingPromises = files.map(file => {
      const id = generateId();
      // Immediately add a placeholder to show the user something is happening
      setUploadableFiles(prev => [
        ...prev, 
        { file, id, preview: URL.createObjectURL(file), status: 'processing' }
      ]);

      return resizeImage(file)
        .then(resizedFile => ({
            id,
            file: resizedFile,
            preview: URL.createObjectURL(resizedFile), // This will be revoked later
            status: 'queued' as const,
        }))
        .catch(err => {
            console.error('Failed to resize image:', file.name, err);
            return {
                id,
                file,
                preview: URL.createObjectURL(file),
                status: 'error' as const,
                error: 'Could not process this image.',
            };
        });
    });

    // Update placeholders with final resized files or errors
    for (const promise of fileProcessingPromises) {
        const result = await promise;
        setUploadableFiles(currentFiles => {
            const oldFile = currentFiles.find(f => f.id === result.id);
            if(oldFile?.preview !== result.preview) {
                URL.revokeObjectURL(oldFile!.preview); // Revoke the original placeholder preview
            }
            return currentFiles.map(f => f.id === result.id ? { ...f, ...result } : f)
        });
    }
    
    event.target.value = '';
  }, [uploadableFiles.length, maxImages]);

  const removeImage = (idToRemove: string) => {
    setUploadableFiles(currentFiles => {
        const fileToRemove = currentFiles.find(f => f.id === idToRemove);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const getLabelText = () => {
    if (uploadableFiles.some(f => f.status === 'processing')) return 'Processing images...';
    if (isUploading) return 'Uploading...';
    return `Upload up to ${maxImages} files`;
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-600 font-serif">
        Memory Photos (up to {maxImages})
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-center text-sm text-slate-600">
            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-sky-500 hover:text-sky-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500 ${isUploading ? 'opacity-50' : ''}`}>
              <span>{getLabelText()}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={uploadableFiles.length >= maxImages || isUploading} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Images will be resized & uploaded to secure storage.</p>
        </div>
      </div>
      {globalError && <p className="text-sm text-red-500">{globalError}</p>}
      {uploadableFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
          {uploadableFiles.map((upFile) => (
            <div key={upFile.id} className="relative group aspect-square">
              <img src={upFile.preview} alt={`Preview of ${upFile.file.name}`} className="h-full w-full object-cover rounded-md shadow-sm" />
              <div className="absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-60 rounded-md">
                {upFile.status === 'success' && <span className="text-green-400 text-3xl">&#10003;</span>}
                {upFile.status === 'error' && <span title={upFile.error} className="text-red-500 text-3xl font-bold cursor-help">!</span>}
                {(upFile.status === 'queued' || upFile.status === 'uploading' || upFile.status === 'processing') && <div className="w-8 h-8 border-4 border-dashed border-white rounded-full animate-spin"></div>}
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
