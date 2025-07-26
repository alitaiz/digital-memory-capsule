import { useState, useCallback } from 'react';
import { Memory, CreatedMemoryInfo, MemoryUpdatePayload, MemorySummary } from '../types';
import { API_BASE_URL } from '../config';

const LOCAL_CREATED_MEMORIES_KEY = 'digital_gift_created_memories';
const LOCAL_VISITED_SLUGS_KEY = 'digital_gift_visited_slugs';

/**
 * Creates a detailed error message from a caught error object.
 * @param error The error object caught in a try-catch block.
 * @param context A string describing the context of the API call (e.g., 'creating memory').
 * @returns A user-friendly error string.
 */
const getApiErrorMessage = (error: unknown, context: string): string => {
  console.error(`API call failed during ${context}:`, error);
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return `Network request failed while ${context}. This may be a CORS issue, a network problem, or the server may be down. Please check the browser's developer console for more details.`;
  }
  if (error instanceof Error) {
    return `A client-side error occurred while ${context}: ${error.message}`;
  }
  return `An unknown error occurred while ${context}. Please check your connection and try again.`;
};


// This hook manages interactions with the remote API and local storage for ownership/access
export const useMemories = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // --- Local storage management for OWNED memories ---
  const getCreatedMemories = useCallback((): CreatedMemoryInfo[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CREATED_MEMORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addCreatedMemory = useCallback((slug: string, editKey: string) => {
    const created = getCreatedMemories();
    if (!created.some(m => m.slug === slug)) {
      const newCreated = [...created, { slug, editKey }];
      localStorage.setItem(LOCAL_CREATED_MEMORIES_KEY, JSON.stringify(newCreated));
    }
  }, [getCreatedMemories]);
  
  const removeCreatedMemory = useCallback((slug: string) => {
     const created = getCreatedMemories();
     const updated = created.filter(m => m.slug !== slug);
     localStorage.setItem(LOCAL_CREATED_MEMORIES_KEY, JSON.stringify(updated));
  }, [getCreatedMemories]);

  // --- Local storage management for VISITED memories ---
  const getVisitedSlugs = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(LOCAL_VISITED_SLUGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addVisitedSlug = useCallback((slug: string) => {
    const created = getCreatedMemories();
    if (created.some(m => m.slug === slug)) return; // Don't add if we own it

    const visited = getVisitedSlugs();
    if (!visited.includes(slug)) {
      localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify([...visited, slug]));
    }
  }, [getCreatedMemories, getVisitedSlugs]);

  const removeVisitedSlug = useCallback((slug: string) => {
    const visited = getVisitedSlugs();
    const updated = visited.filter(s => s !== slug);
    localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify(updated));
  }, [getVisitedSlugs]);

  // --- Combined slugs ---
  const getAllSlugs = useCallback((): string[] => {
    const created = getCreatedMemories().map(m => m.slug);
    const visited = getVisitedSlugs();
    return [...new Set([...created, ...visited])]; // Unique slugs
  }, [getCreatedMemories, getVisitedSlugs]);


  // --- API Functions ---
  const generateSlug = useCallback((title: string): string => {
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!baseSlug) {
        return `memory-${Date.now().toString().slice(-6)}`;
    }
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }, []);

  const addMemory = useCallback(async (memoryData: { title: string; shortMessage: string; memoryContent: string; images: string[]; slug?: string; }): Promise<{ success: boolean; error?: string, slug?: string }> => {
    setLoading(true);
    try {
      const { title, shortMessage, memoryContent, images, slug } = memoryData;
      // Generate slug and editKey here
      const finalSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || generateSlug(title);
      const editKey = crypto.randomUUID();

      const newMemory: Memory = {
        title,
        shortMessage,
        memoryContent,
        images,
        slug: finalSlug,
        createdAt: new Date().toISOString(),
        editKey,
      };

      const response = await fetch(`${API_BASE_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      });

      if (response.ok) {
        addCreatedMemory(newMemory.slug, newMemory.editKey);
        return { success: true, slug: newMemory.slug };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Failed to create memory. Server responded with status: ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'creating memory') };
    } finally {
      setLoading(false);
    }
  }, [addCreatedMemory, generateSlug]);
  
  const getMemoryBySlug = useCallback(async (slug: string): Promise<Omit<Memory, 'editKey'> | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory/${slug}`);
      if (!response.ok) {
        if(response.status === 404) return undefined;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }
      const data: Omit<Memory, 'editKey'> = await response.json();
      addVisitedSlug(slug); // Add to visited list on successful fetch
      return data;
    } catch (error) {
      console.error(getApiErrorMessage(error, `getting memory '${slug}'`));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [addVisitedSlug]);

  const getMemorySummaries = useCallback(async (slugs: string[]): Promise<MemorySummary[]> => {
    if (slugs.length === 0) {
        return [];
    }
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/memories/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }
        
        const data: MemorySummary[] = await response.json();
        return data;
    } catch (error) {
        console.error(getApiErrorMessage(error, "getting memory list"));
        return [];
    } finally {
        setLoading(false);
    }
  }, []);

  const deleteMemory = useCallback(async (slug: string, editKey: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory/${slug}`, {
        method: 'DELETE',
        headers: {
            'X-Edit-Key': editKey,
        }
      });

      if (response.ok) {
        removeCreatedMemory(slug);
        removeVisitedSlug(slug); // Also remove from visited if it's there
        return { success: true };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Failed to delete. Server responded with ${response.status}` };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, `deleting memory '${slug}'`) };
    } finally {
      setLoading(false);
    }
  }, [removeCreatedMemory, removeVisitedSlug]);
  
  const updateMemory = useCallback(async (slug: string, editKey: string, data: MemoryUpdatePayload): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/memory/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Edit-Key': editKey,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            return { success: true };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Failed to update. Server responded with ${response.status}` };
    } catch (error) {
        return { success: false, error: getApiErrorMessage(error, `updating memory '${slug}'`) };
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    loading, 
    addMemory, 
    getMemoryBySlug,
    getMemorySummaries,
    deleteMemory,
    updateMemory,
    generateSlug,
    getAllSlugs,
    getCreatedMemories,
    removeVisitedSlug,
  };
};