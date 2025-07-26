
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { MemoryCard, GiftIcon } from '../components/ui';
import { MemorySummary, CreatedMemoryInfo } from '../types';

const ListPage = () => {
  const { getAllSlugs, deleteMemory, getCreatedMemories, removeVisitedSlug, getMemorySummaries } = useMemoriesContext();
  const [memories, setMemories] = useState<MemorySummary[]>([]);
  const [createdMemories, setCreatedMemories] = useState<CreatedMemoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError('');
    const slugs = getAllSlugs();
    const created = getCreatedMemories();
    setCreatedMemories(created);

    if (slugs.length > 0) {
      const fetchedMemories = await getMemorySummaries(slugs);
      // Sort on the client side after fetching
      setMemories(fetchedMemories.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      setMemories([]);
    }
    setLoading(false);
  }, [getAllSlugs, getCreatedMemories, getMemorySummaries]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);
  
  const handleDelete = async (slug: string) => {
    setError('');
    const ownedMemory = createdMemories.find(cm => cm.slug === slug);

    if (ownedMemory) {
      // User is the owner: permanent deletion
      if (window.confirm("Are you sure you want to permanently delete this memory? This will remove all data and photos forever and cannot be undone.")) {
        const result = await deleteMemory(slug, ownedMemory.editKey);
        if (result.success) {
          // Refresh the list from source of truth
          loadMemories();
        } else {
          setError(result.error || 'An unknown error occurred while deleting.');
        }
      }
    } else {
      // User is a visitor: remove from local list
      if (window.confirm("Are you sure you want to remove this memory from your list? This will not delete the original page.")) {
        removeVisitedSlug(slug);
        // Refresh the list from source of truth
        loadMemories();
      }
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">Your Memories</h1>
          <p className="text-center text-slate-600 mt-2">A list of memories you have created or visited.</p>
          
          {error && <p className="text-red-500 text-center mt-4 p-2 bg-red-100 rounded-md">{error}</p>}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <GiftIcon className="animate-pulse w-10 h-10 text-sky-500"/>
                <p className="ml-4 font-serif text-slate-600">Loading your memories...</p>
             </div>
          ) : memories.length > 0 ? (
            <div className="mt-8 space-y-4">
              {memories.map(memory => {
                const isOwner = createdMemories.some(cm => cm.slug === memory.slug);
                return <MemoryCard key={memory.slug} memory={memory} onDelete={handleDelete} isOwner={isOwner} />
              })}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">You haven't created or visited any memories on this device yet.</p>
          )}

          <div className="mt-8 text-center">
            <Link to="/create" className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-transform duration-300 inline-block transform hover:scale-105">
              🎁 Create a New Memory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;
