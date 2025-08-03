
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { Memory } from '../types';
import { Carousel } from '../components/Carousel';
import { Lightbox } from '../components/Lightbox';
import { SparkleIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getMemoryBySlug, loading, getCreatedMemories } = useMemoriesContext();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Omit<Memory, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMemory = async () => {
      if (slug) {
        
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

  const coverImage = memory.coverImageUrl || (memory.images && memory.images.length > 0 ? memory.images[0] : 'https://www.toptal.com/designers/subtlepatterns/uploads/watercolor.png');
  const hasGalleryImages = memory.images && memory.images.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {lightboxImage && <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      
      <div className="relative pb-12">
        {/* Hero Section */}
        <div 
          className="h-60 md:h-72 w-full flex flex-col items-center justify-center text-white text-center group bg-cover bg-center"
          style={{ backgroundImage: `url(${coverImage})`, textShadow: '1px 1px 3px rgba(0,0,0,0.4)' }}
          onClick={memory.coverImageUrl ? () => setLightboxImage(coverImage) : undefined}
        >
          <div className="absolute inset-0 bg-black/30"></div>
          {memory.coverImageUrl && (
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </div>
          )}
          <div className="relative z-10 p-4">
            <h1 className="text-5xl md:text-7xl font-bold font-serif">{memory.title}</h1>
            {memory.shortMessage && <p className="mt-2 text-xl italic">"{memory.shortMessage}"</p>}
          </div>
        </div>

        {/* Content Section with overlapping card */}
        <div className="relative container mx-auto max-w-3xl px-6 -mt-12 md:-mt-16 z-10">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl">

            {/* Avatar positioned relative to the card */}
            {memory.avatarUrl && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <img src={memory.avatarUrl} alt="Memory Avatar" className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 md:border-8 border-white shadow-lg object-cover" />
                </div>
            )}
            
            {/* Card Content */}
            <div className="pt-12 md:pt-16 text-center">
                <p className="text-sm text-slate-500 font-serif">Memorial Code: <span className="font-bold text-slate-700">{memory.slug}</span></p>
                <p className="text-xs text-slate-500 mt-1">Remember this code for easy access from any device.</p>
                {isOwner && (
                  <Link to={`/edit/${memory.slug}`} className="mt-4 inline-block bg-gray-200 text-slate-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-gray-300 transition-colors">
                      Edit Memorial
                  </Link>
                )}
            </div>
          
            {memory.memoryContent && (
              <div className="prose max-w-none text-slate-700 whitespace-pre-wrap font-sans text-left mt-8">
                <p>{memory.memoryContent}</p>
              </div>
            )}

            {hasGalleryImages && (
              <div className="mt-12">
                <h3 className="text-2xl font-serif font-bold text-center text-slate-800 mb-6">Photo Gallery</h3>
                <Carousel images={memory.images} onImageClick={setLightboxImage} />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Page bottom content */}
      <div className="text-center py-12 px-4 bg-slate-100">
          <div className="flex flex-col items-center space-y-5">
            <Link to="/create" className="bg-gradient-to-b from-sky-400 to-sky-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:from-sky-500 hover:to-sky-600 transition-all duration-200 transform active:translate-y-px active:shadow-md">
              Create Another Memory
            </Link>
             <a
              href="https://bobicare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:from-amber-500 hover:to-amber-600 transition-all duration-200 transform active:translate-y-px active:shadow-md"
            >
              Visit Our Store on Amazon
            </a>
          </div>
      </div>
    </div>
  );
};

export default MemoryPage;
