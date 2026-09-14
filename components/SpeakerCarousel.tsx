import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeynoteSpeaker } from '../types';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, XIcon } from './icons';

interface SpeakerCarouselProps {
  speakers: KeynoteSpeaker[];
  subtitle?: string;
  moreSoonText?: string;
  viewFullText?: string;
}

export const SpeakerCarousel: React.FC<SpeakerCarouselProps> = ({
  speakers,
  subtitle,
  moreSoonText = 'Más conferencistas magistrales serán anunciados próximamente.',
  viewFullText = 'Ver afiche oficial',
}) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<KeynoteSpeaker | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to enable/disable arrows
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 20);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 20);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [speakers]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSpeaker(null);
    };
    if (selectedSpeaker) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedSpeaker]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.8, 620);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!speakers || speakers.length === 0) {
    return (
      <p className="text-center text-lg text-gray-600">
        {moreSoonText}
      </p>
    );
  }

  const isSingle = speakers.length === 1;

  return (
    <div className="relative">
      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-8 font-['Roboto'] text-base md:text-lg">
          {subtitle}
        </p>
      )}

      {/* Carousel Navigation Arrows (shown if multiple items or overflow) */}
      {speakers.length > 1 && (
        <div className="flex justify-end gap-3 mb-4 px-4 max-w-6xl mx-auto">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Anterior conferencista"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 bg-white text-[#0D2C54] shadow-sm hover:bg-[#0D2C54] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Siguiente conferencista"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 bg-white text-[#0D2C54] shadow-sm hover:bg-[#0D2C54] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Carousel Container - Following past editions logic */}
      <div
        ref={scrollContainerRef}
        className={`flex overflow-x-auto space-x-6 p-4 pb-8 snap-x snap-mandatory ${
          isSingle ? 'justify-center' : ''
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {speakers.map((speaker) => (
          <div
            key={speaker.id}
            className="flex-shrink-0 w-full max-w-[620px] snap-center"
          >
            <div className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 flex flex-col h-full">
              {/* Banner Image Container */}
              <div
                className="relative overflow-hidden bg-[#08203E] aspect-[16/9] cursor-pointer flex items-center justify-center"
                onClick={() => setSelectedSpeaker(speaker)}
              >
                {/* Ambient blurred backdrop so vertical posters feel natural and match the card format */}
                <img
                  src={speaker.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 pointer-events-none"
                  aria-hidden="true"
                />

                <img
                  src={speaker.imageUrl}
                  alt={speaker.name}
                  className="relative z-0 max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Subtle Hover Overlay */}
                <div className="absolute inset-0 z-10 bg-[#0D2C54]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 bg-white/95 text-[#0D2C54] px-4 py-2 rounded-full font-bold text-xs tracking-wide shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <ZoomInIcon className="w-4 h-4 text-[#2A9D8F]" />
                    {viewFullText}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 md:p-7 flex-grow flex flex-col justify-between">
                <div>
                  {/* Badge & Date Tag */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {speaker.badge && (
                      <span className="inline-block bg-[#F4A261]/20 text-[#D97706] font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                        {speaker.badge}
                      </span>
                    )}
                    {speaker.date && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
                        {speaker.date}
                      </span>
                    )}
                  </div>

                  {/* Speaker / Panel Name */}
                  <h3 className="text-2xl font-bold text-[#0D2C54] font-['Montserrat'] tracking-tight">
                    {speaker.name}
                  </h3>

                  {/* Tagline */}
                  {speaker.tagline && (
                    <p className="text-xs font-semibold text-[#2A9D8F] uppercase tracking-wider mt-0.5">
                      {speaker.tagline}
                    </p>
                  )}

                  {/* Talk / Theme Title */}
                  {speaker.title && (
                    <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border-l-4 border-[#F4A261]">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        {speaker.typeLabel || 'Charla Magistral'}
                      </span>
                      <p className="text-sm md:text-base font-semibold text-[#0D2C54] font-['Roboto'] leading-snug">
                        {speaker.title}
                      </p>
                    </div>
                  )}

                  {/* Panelists Grid or Speaker Description */}
                  {speaker.panelists && speaker.panelists.length > 0 ? (
                    <div className="mt-4 space-y-2.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-[#2A9D8F]">
                        Panelistas destacados
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {speaker.panelists.map((panelist, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-slate-50 border border-gray-100 rounded-xl p-2.5 flex flex-col justify-between hover:bg-slate-100/80 transition-colors"
                          >
                            <span className="font-bold text-xs text-[#0D2C54]">
                              {panelist.name}
                            </span>
                            <span className="text-[11px] text-gray-600 mt-0.5 leading-tight">
                              {panelist.role}
                            </span>
                            {panelist.affiliation && (
                              <span className="text-[10px] text-[#2A9D8F] font-medium mt-0.5 leading-tight">
                                {panelist.affiliation}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : speaker.description ? (
                    <p className="text-xs text-gray-600 font-['Roboto'] mt-3 leading-relaxed">
                      {speaker.description}
                    </p>
                  ) : null}
                </div>

                {/* Action Button */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedSpeaker(speaker)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0D2C54] hover:text-[#2A9D8F] transition-colors"
                  >
                    <ZoomInIcon className="w-4 h-4 text-[#2A9D8F]" />
                    {viewFullText}
                  </button>
                  <span className="text-[11px] text-gray-400 font-['Roboto']">
                    CLAGTEE 2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notice below carousel */}
      {moreSoonText && (
        <div className="text-center mt-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-xs md:text-sm text-gray-600 font-['Roboto']">
            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
            {moreSoonText}
          </span>
        </div>
      )}

      {/* Lightbox Modal for Full-Resolution Banner / Poster */}
      <AnimatePresence>
        {selectedSpeaker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSpeaker(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-[#0D2C54] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedSpeaker(null)}
                aria-label="Cerrar modal"
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-white hover:text-[#0D2C54] transition-all flex items-center justify-center shadow-lg"
              >
                <XIcon className="w-6 h-6" />
              </button>

              {/* High-Resolution Banner / Poster Image */}
              <div className="relative flex-1 min-h-0 bg-slate-950 overflow-hidden flex items-center justify-center p-2 md:p-4">
                <img
                  src={selectedSpeaker.imageUrl}
                  alt={selectedSpeaker.name}
                  className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                />
              </div>

              {/* Modal Footer info */}
              <div className="p-4 md:p-5 bg-[#08203E] text-white flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {selectedSpeaker.badge && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4A261]">
                        {selectedSpeaker.badge}
                      </span>
                    )}
                    {selectedSpeaker.date && (
                      <span className="text-xs text-gray-300">
                        • {selectedSpeaker.date}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg md:text-xl font-bold text-white font-['Montserrat'] truncate">
                    {selectedSpeaker.name}
                  </h4>
                  <p className="text-xs md:text-sm text-gray-300 line-clamp-2">
                    {selectedSpeaker.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a
                    href={selectedSpeaker.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A9D8F] text-white text-xs font-bold hover:bg-[#238276] transition-colors"
                  >
                    Abrir en pestaña nueva
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
