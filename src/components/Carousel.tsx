
import React, { useState, useEffect } from 'react';

interface CarouselProps {
  images: string[];
  onImageClick?: (imageUrl: string) => void;
}

export const Carousel: React.FC<CarouselProps> = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-lg h-96 bg-slate-100">
      {/* Images are absolutely positioned and will be contained within the parent */}
      {images.map((image, index) => (
        <img
          key={index}
          src={image}
          alt={`Memory slide ${index + 1}`}
          onClick={() => onImageClick?.(image)}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'} ${onImageClick ? 'cursor-pointer' : ''}`}
          aria-hidden={index !== currentIndex}
        />
      ))}
      
      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button 
            onClick={goToPrevious} 
            className="absolute top-1/2 left-2 z-10 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous image"
          >
            &#10094;
          </button>
          <button 
            onClick={goToNext} 
            className="absolute top-1/2 right-2 z-10 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next image"
          >
            &#10095;
          </button>
        </>
      )}
    </div>
  );
};
