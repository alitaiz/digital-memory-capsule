import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { Memory } from '../types';
import { Lightbox } from '../components/Lightbox';
import { Carousel } from '../components/Carousel';
import { SparkleIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getMemoryBySlug, loading, getCreatedMemories } = useMemoriesContext();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Omit<Memory, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [recoverCode, setRecoverCode] = useState('');

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
            setError('');
            setRecoverCode('');
          } else {
            setError(`Could not find a memorial with code "${slug}".`);
            setTimeout(() => navigate(`/recover?notfound=true&slug=${slug}`), 2500);
          }
        }
      }
    };

    fetchMemory();
    return () => { isMounted = false; };
  }, [slug, getMemoryBySlug, navigate, getCreatedMemories]);

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoverCode.trim()) {
      navigate(`/memory/${recoverCode.trim()}`);
    }
  };

  const calculateShortMessageStyle = (text: string | undefined): React.CSSProperties => {
    if (!text) return {};

    const length = text.length;
    const maxFontSize = 1.25; // rem, equivalent to text-xl
    const minFontSize = 0.875; // rem, equivalent to text-sm
    const maxLengthThreshold = 180; // At this length or more, font is at its smallest
    const minLengthThreshold = 80;  // Below this length, font is at its largest

    let fontSize = maxFontSize;

    if (length > minLengthThreshold) {
      if (length >= maxLengthThreshold) {
        fontSize = minFontSize;
      } else {
        // Calculate the interpolation factor (0.0 to 1.0)
        const progress = (length - minLengthThreshold) / (maxLengthThreshold - minLengthThreshold);
        // Apply the interpolation to the font size
        fontSize = maxFontSize - progress * (maxFontSize - minFontSize);
      }
    }

    return {
      fontSize: `${fontSize}rem`,
      lineHeight: '1.5', // A consistent, readable line-height
    };
  };


  if (loading && !memory) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-4">
            <SparkleIcon className="w-16 h-16 text-pink-400 animate-pulse" />
            <p className="mt-4 font-serif text-slate-600 text-xl">Finding this memorial...</p>
        </div>
    );
  }
  
  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-4">
            <h2 className="text-2xl font-serif text-red-500">{error}</h2>
            <p className="mt-2 text-slate-600">You will be redirected to the recovery page shortly.</p>
        </div>
      )
  }

  if (!memory) {
    return null; 
  }

  const coverImage = memory.coverImageUrl || 'https://images.unsplash.com/photo-1541318011303-9cf178c5e9a4?q=80&w=2070&auto=format&fit=crop';
  
  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {lightboxImage && <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      
      <div className="relative pb-16">
        {/* Hero Section */}
        <div 
          className="h-80 md:h-96 w-full flex flex-col items-center justify-end text-white text-center group bg-cover bg-center relative"
          style={{ backgroundImage: `url(${coverImage})`, textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}
          onClick={memory.coverImageUrl ? () => setLightboxImage(coverImage) : undefined}
        >
          <div className="absolute inset-0 bg-black/30 z-0"></div>
          {memory.coverImageUrl && (
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center cursor-pointer z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </div>
          )}
          <div className="relative z-20 p-4 pb-24 w-full">
            <h1 className="text-5xl md:text-7xl font-bold font-serif">{memory.title}</h1>
            {memory.shortMessage && <p style={calculateShortMessageStyle(memory.shortMessage)} className="mt-2 italic max-w-2xl mx-auto">"{memory.shortMessage}"</p>}
          </div>
        </div>

        {/* Content Section */}
        <div className="relative container mx-auto max-w-3xl px-4 -mt-16 z-10">
          
          {/* Avatar */}
          {memory.avatarUrl && (
            <img 
              src={memory.avatarUrl} 
              alt={`${memory.title} avatar`} 
              className="w-36 h-36 md:w-48 md:h-48 object-cover rounded-full border-4 border-white bg-white shadow-lg mx-auto -mb-24 md:-mb-32 relative z-20 cursor-pointer"
              onClick={() => setLightboxImage(memory.avatarUrl!)}
            />
          )}
          
          {/* Main Card */}
          <div className={`bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center ${memory.avatarUrl ? 'pt-28 md:pt-36' : 'pt-8'}`}>
            <div className="mt-4">
                <p className="text-slate-600">Memorial Code: <strong className="font-mono bg-slate-100 p-1 rounded">{memory.slug}</strong></p>
                <p className="text-sm text-slate-500 mt-1">Remember this code for easy access from any device.</p>
            </div>

            {isOwner && (
                <div className="mt-4">
                    <Link to={`/edit/${slug}`} className="inline-block bg-slate-200 text-slate-700 font-semibold py-2 px-5 rounded-full hover:bg-slate-300 transition-colors text-sm">
                        Edit Memorial
                    </Link>
                </div>
            )}

            {memory.memoryContent && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-2xl font-serif font-bold text-slate-700 mb-4">Our Story</h3>
                <p className="text-left text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {memory.memoryContent}
                </p>
              </div>
            )}

            {memory.images && memory.images.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-2xl font-serif font-bold text-slate-700 mb-4">Photo Memories</h3>
                <Carousel images={memory.images} onImageClick={setLightboxImage} />
              </div>
            )}
          </div>
        </div>

        {/* Buttons & Recovery Section */}
        <div className="container mx-auto max-w-3xl px-4 mt-10 space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/create" className="w-full sm:w-auto text-center font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all duration-300 px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    Create Another Memorial Page
                </Link>
                <a href="https://www.amazon.com" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center font-semibold text-white bg-green-500 hover:bg-green-600 transition-all duration-300 px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    Visit Our Store on Amazon
                </a>
            </div>
            
            <div className="max-w-md mx-auto bg-pink-50/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                <h3 className="text-center font-serif text-slate-700 mb-3">Have a memorial code?</h3>
                <form onSubmit={handleRecoverSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={recoverCode}
                        onChange={(e) => setRecoverCode(e.target.value)}
                        placeholder="e.g., lucky-88"
                        className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-pink-400 focus:border-pink-400 shadow-inner"
                        aria-label="Memorial Code"
                    />
                    <button type="submit" className="flex-shrink-0 bg-blue-400 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-500 transition-colors shadow-md" aria-label="Search">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryPage;