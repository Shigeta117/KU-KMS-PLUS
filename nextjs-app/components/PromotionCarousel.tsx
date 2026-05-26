'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const images = [
  '/Promotion/KU-LMS+01.png',
  '/Promotion/KU-LMS+02.png',
  '/Promotion/KU-LMS+03.png',
  '/Promotion/KU-LMS+04.png',
];

export function PromotionCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    const node = scrollRef.current;
    const scrollAmount = node.clientWidth * index;
    node.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    setCurrentIndex(index);
  };

  const handlePrev = () => {
    const next = (currentIndex - 1 + images.length) % images.length;
    scrollTo(next);
  };

  const handleNext = () => {
    const next = (currentIndex + 1) % images.length;
    scrollTo(next);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    };
    const node = scrollRef.current;
    node?.addEventListener('scroll', handleScroll, { passive: true });
    return () => node?.removeEventListener('scroll', handleScroll);
  }, [currentIndex]);

  // Auto-play
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        if (scrollRef.current) {
          const scrollAmount = scrollRef.current.clientWidth * next;
          scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [isHovered]);

  return (
    <div 
      className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50 group bg-slate-100 dark:bg-slate-900"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((src, i) => (
          <div key={i} className="w-full flex-none snap-center relative aspect-[16/10]">
            <Image
              src={src}
              alt={`Promotion Slide ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={handlePrev}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 opacity-0 md:group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 hover:scale-110 md:opacity-0 opacity-100"
      >
        <ChevronLeft size={28} />
      </button>
      <button 
        onClick={handleNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 opacity-0 md:group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 hover:scale-110 md:opacity-0 opacity-100"
      >
        <ChevronRight size={28} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 p-2 px-4 rounded-full bg-black/20 backdrop-blur-md">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'bg-white scale-125 shadow-sm' : 'bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
