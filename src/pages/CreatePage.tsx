import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { ImageUploader } from '../components/ImageUploader';
import { LoadingSpinner, Toast, SparkleIcon } from '../components/ui';
import { MemoryUpdatePayload } from '../types';
import { uploadImages, checkSlugExists } from '../hooks/useMemorials';

const MAX_TOTAL_IMAGES = 5;

const CreatePage = () => {
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditMode = !!editSlug;

  const { addMemory, getMemoryBySlug, updateMemory, getCreatedMemories } = useMemoriesContext();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortMessage, setShortMessage] = useState('');
  const [memoryContent, setMemoryContent] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]); // New files from uploader
  const [existingImages, setExistingImages] = useState<string[]>([]); // For edit mode
  const [editKey, setEditKey] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');

  const maxNewImages = MAX_TOTAL_IMAGES - existingImages.length;

  useEffect(() => {
      if (isEditMode && editSlug) {
          const loadMemoryForEdit = async () => {
              setIsLoading(true);
              const memory = await getMemoryBySlug(editSlug);
              const created = getCreatedMemories();
              const ownerInfo = created.find(m => m.slug === editSlug);

              if (memory && ownerInfo) {
                  setTitle(memory.title);
                  setShortMessage(memory.shortMessage);
                  setMemoryContent(memory.memoryContent);
                  setExistingImages(memory.images);
                  setSlug(memory.slug);
                  setEditKey(ownerInfo.editKey);
              } else {
                  // Not the owner or memory doesn't exist, redirect
                  setError("You don't have permission to edit this memory or it doesn't exist.");
                  setTimeout(() => navigate('/list'), 2000);
              }
              setIsLoading(false);
          };
          loadMemoryForEdit();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editSlug, navigate]);


  const handleRewrite = async () => {
    if (!memoryContent.trim()) {
        setRewriteError('Please write a story first before using AI assist.');
        return;
    }
    setIsRewriting(true);
    setRewriteError('');
    setError('');

    try {
        const response = await fetch(`/api/rewrite-tribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: memoryContent }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'The AI assistant failed to respond. Please try again later.');
        }

        const { rewrittenText } = await response.json();
        setMemoryContent(rewrittenText);

    } catch (err) {
        console.error("AI rewrite failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setRewriteError(errorMessage);
    } finally {
        setIsRewriting(false);
    }
  };
  
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImages(current => current.filter(url => url !== urlToRemove));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('A title for the memory is required.');
      return;
    }
    if (isProcessingImages) {
        setError('Please wait for images to finish processing.');
        return;
    }
    setIsLoading(true);

    try {
      // --- PRE-FLIGHT CHECK FOR DUPLICATE SLUG ---
      // Only run this check if creating a new memory with a user-provided slug.
      if (!isEditMode && slug.trim()) {
          const slugIsTaken = await checkSlugExists(slug.trim());
          if (slugIsTaken) {
              setError(`The memory code "${slug.trim()}" is already in use. Please choose another.`);
              setIsLoading(false);
              return; // Stop execution, preserving the form state (including images).
          }
      }

      let uploadedImageUrls: string[] = [];
      // Step 2: Upload new images only after validation passes.
      if (newFiles.length > 0) {
        uploadedImageUrls = await uploadImages(newFiles);
      }
      
      const finalImages = [...existingImages, ...uploadedImageUrls];

      // Step 3: Proceed with creating or updating the memory.
      if (isEditMode) {
        if (!editSlug || !editKey) {
          throw new Error('Could not update memory. Key information is missing.');
        }
        const updatedData: MemoryUpdatePayload = {
          title,
          shortMessage,
          memoryContent,
          images: finalImages,
        };
        const result = await updateMemory(editSlug, editKey, updatedData);
        if (result.success) {
          setShowToast(true);
          setTimeout(() => {
            navigate(`/memory/${editSlug}`);
          }, 2000);
        } else {
          setError(result.error || 'An unknown error occurred during update.');
          setIsLoading(false);
        }
      } else {
        const memoryData = {
          title,
          slug: slug.trim(),
          shortMessage,
          memoryContent,
          images: finalImages,
        };
        const result = await addMemory(memoryData);
        if (result.success && result.slug) {
          setShowToast(true);
          setTimeout(() => {
            navigate(`/memory/${result.slug}`);
          }, 2000);
        } else {
          setError(result.error || 'An unknown error occurred. Please try again.');
          setIsLoading(false);
        }
      }
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'An unknown error occurred during upload.';
      setError(`Image upload failed: ${errorMessage}`);
      setIsLoading(false);
    }
  };
  
  const getButtonText = () => {
    if (isProcessingImages) return 'Processing Images...';
    if (isLoading) return isEditMode ? 'Updating Memory...' : 'Creating Memory...';
    return isEditMode ? 'Update Memory' : 'Create Memory';
  }

  return (
    <div className="min-h-screen bg-sky-50 pt-24 pb-12">
      <Toast message={isEditMode ? `Memory updated!` : `Your memory is ready!`} show={showToast} onDismiss={() => setShowToast(false)} />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">{isEditMode ? 'Edit Memory' : 'Create a Memory'}</h1>
          <p className="text-center text-slate-600 mt-2">{isEditMode ? 'Update the details for this memory.' : 'Fill in the details to build a beautiful digital gift.'}</p>

          {isLoading && !showToast ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-600 font-serif">Memory Title *</label>
                <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required placeholder="e.g., Our Trip to the Beach" />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-slate-600 font-serif">Custom Memory Code</label>
                <input type="text" id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder={isEditMode ? '' : "e.g., beach-trip-24 (auto-generated if blank)"} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500" disabled={isEditMode} />
              </div>
              <div>
                <label htmlFor="shortMessage" className="block text-sm font-medium text-slate-600 font-serif">Short Message (e.g., "A day to remember!")</label>
                <input type="text" id="shortMessage" value={shortMessage} onChange={e => setShortMessage(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="memoryContent" className="block text-sm font-medium text-slate-600 font-serif">The Full Story</label>
                  <button 
                    type="button" 
                    onClick={handleRewrite}
                    disabled={isRewriting || !memoryContent.trim()}
                    className="flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium px-2 py-1 rounded-md hover:bg-sky-50"
                    aria-label="Rewrite with AI"
                  >
                    <SparkleIcon className={`w-4 h-4 ${isRewriting ? 'animate-spin' : ''}`} />
                    <span>{isRewriting ? 'Thinking...' : 'AI Assist'}</span>
                  </button>
                </div>
                <textarea 
                  id="memoryContent" 
                  value={memoryContent} 
                  onChange={e => { setMemoryContent(e.target.value); setRewriteError(''); }} 
                  rows={6} 
                  className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" 
                  placeholder="Share the details of your memory here..."></textarea>
                {rewriteError && <p className="text-red-500 text-xs mt-1">{rewriteError}</p>}
              </div>

              {isEditMode && existingImages.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-slate-600 font-serif">Current Photos (click to remove)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-2 p-2 border border-slate-200 rounded-md">
                        {existingImages.map((imgUrl) => (
                            <div key={imgUrl} className="relative group aspect-square">
                                <img src={imgUrl} alt={`Existing photo`} className="h-full w-full object-cover rounded-md shadow-sm" />
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveExistingImage(imgUrl)}
                                    className="absolute inset-0 w-full h-full bg-black/50 flex items-center justify-center text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-md cursor-pointer"
                                    aria-label="Remove image"
                                >
                                    &#x2715;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              )}
              
              {maxNewImages > 0 ? (
                <ImageUploader
                  onFilesChange={setNewFiles}
                  onProcessingChange={setIsProcessingImages}
                  existingImageCount={existingImages.length}
                  maxImages={MAX_TOTAL_IMAGES}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-600 font-serif">Memory Photos</label>
                  <div className="mt-1 bg-slate-100 p-4 rounded-md text-sm text-slate-600 text-center">
                    You have reached the maximum of {MAX_TOTAL_IMAGES} photos. Remove an existing photo to add a new one.
                  </div>
                </div>
              )}
              
              <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Important:</strong> This memory can only be permanently deleted or edited from <strong>this device</strong>. Please keep the memory code safe to share with others.</p>
              </div>
              
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-amber-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-colors duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={isLoading || isProcessingImages}>
                {getButtonText()}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;