import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { Memory } from '../types';
import { Carousel } from '../components/Carousel';
import { Lightbox } from '../components/Lightbox';
import { GiftIcon, SparkleIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getMemoryBySlug, loading, getCreatedMemories } = useMemoriesContext();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Omit<Memory, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchMemory = async () => {
      if (slug) {
        // Reset search code when navigating to a new memory
        setSearchCode('');
        
        const createdMemories = getCreatedMemories();
        const ownerInfo = createdMemories.find(m => m.slug === slug);
        if (isMounted) {
          setIsOwner(!!ownerInfo);
        }

        const foundMemory = await getMemoryBySlug(slug);
        if (isMounted) {
          if (foundMemory) {
            setMemory(foundMemory);
          } else {
            setError(`Could not find a memory with code "${slug}".`);
            setTimeout(() => navigate(`/recover?notfound=true&slug=${slug}`), 2500);
          }
        }
      }
    };

    fetchMemory();
    return () => { isMounted = false; };
  }, [slug, getMemoryBySlug, navigate, getCreatedMemories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = searchCode.trim();
    if (trimmedCode) {
      navigate(`/memory/${trimmedCode}`);
    }
  };


  if (loading && !memory) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
            <SparkleIcon className="w-16 h-16 text-sky-400 animate-pulse" />
            <p className="mt-4 font-serif text-slate-600 text-xl">Finding this memory...</p>
        </div>
    );
  }
  
  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
            <h2 className="text-2xl font-serif text-red-500">{error}</h2>
            <p className="mt-2 text-slate-600">You will be redirected to the recovery page shortly.</p>
        </div>
      )
  }

  if (!memory) {
    return null; 
  }

  const coverImage = memory.images && memory.images.length > 0 ? memory.images[0] : 'https://picsum.photos/1200/800';

  return (
    <div className="min-h-screen bg-white">
      {lightboxImage && <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      {/* Hero Section */}
      <div 
        className="relative h-80 md:h-96 w-full flex items-center justify-center text-white text-center cursor-pointer group"
        onClick={() => setLightboxImage(coverImage)}
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${coverImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </div>
        <div className="relative z-10 p-4">
          <h1 className="text-5xl md:text-7xl font-bold font-serif drop-shadow-lg">{memory.title}</h1>
          <p className="mt-4 text-xl font-serif italic drop-shadow-md">"{memory.shortMessage || 'A moment to remember.'}"</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-3xl p-6 md:p-8 -mt-16 relative z-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <GiftIcon className="w-8 h-8 mx-auto text-amber-500" />
            <p className="mt-2 text-sm text-slate-500 font-serif">Memory Code: <span className="font-bold text-slate-700">{memory.slug}</span></p>
            <p className="mt-1 text-xs text-slate-400">Use this code to share and revisit from any device.</p>
            {isOwner && (
              <Link to={`/edit/${memory.slug}`} className="mt-3 inline-block bg-gray-200 text-slate-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-gray-300 transition-colors">
                  Edit Memory
              </Link>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-slate-700 whitespace-pre-wrap font-sans text-center">
            <p>{memory.memoryContent}</p>
          </div>

          {memory.images && memory.images.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl font-serif font-bold text-center text-slate-800 mb-6">Photo Gallery</h3>
              <Carousel images={memory.images} onImageClick={setLightboxImage} />
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center py-12 px-4">
          <div className="flex flex-col items-center space-y-4">
            <Link to="/create" className="bg-sky-500 text-white font-bold py-3 px-6 rounded-full hover:bg-sky-600 transition-colors duration-300">
              Create Another Memory
            </Link>
            <a
              href="https://bobicare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-colors duration-300"
            >
              Visit Our Store on Amazon
            </a>
          </div>

          <div className="mt-12 max-w-md mx-auto">
            <div className="bg-slate-100/70 p-6 rounded-2xl shadow-md border border-slate-200">
                <form onSubmit={handleSearchSubmit}>
                    <label htmlFor="page-bottom-search" className="font-serif text-slate-700 mb-2 block">
                        Have a memory code?
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            id="page-bottom-search"
                            type="text"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            placeholder="e.g., surprise-party-24"
                            className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                        />
                        <button
                            type="submit"
                            className="bg-sky-500 text-white p-2.5 rounded-full hover:bg-sky-600 transition-colors flex-shrink-0"
                            aria-label="Find Memory"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryPage;