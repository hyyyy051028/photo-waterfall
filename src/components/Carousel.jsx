import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Carousel.css';

function Carousel({ images, interval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const timerRef = useRef(null);

  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
  }, [interval, images.length]);

  const handlePrev = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    startAutoPlay();
  }, [images.length, startAutoPlay]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex(prev => (prev + 1) % images.length);
    startAutoPlay();
  }, [images.length, startAutoPlay]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        await Promise.all(images.map(src => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = resolve;
            img.onerror = reject;
          });
        }));
        setIsLoaded(true);
        startAutoPlay();
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    };

    loadImages();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images, startAutoPlay]);

  if (!isLoaded || images.length === 0) {
    return null;
  }

  return (
    <div 
      className="carousel"
      onMouseEnter={() => {
        if (timerRef.current) clearInterval(timerRef.current);
      }}
      onMouseLeave={() => {
        startAutoPlay();
      }}
    >
      <button 
        className="carousel-arrow prev" 
        onClick={handlePrev}
      >
        ‹
      </button>
      <button 
        className="carousel-arrow next" 
        onClick={handleNext}
      >
        ›
      </button>
      {images.map((image, index) => (
        <div
          key={index}
          className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
          style={{
            backgroundImage: `url(${image})`,
            zIndex: index === currentIndex ? 1 : 0
          }}
        />
      ))}
      {images.length > 1 && (
        <div className="carousel-indicators">
          {images.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setCurrentIndex(index);
                startAutoPlay();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Carousel;
