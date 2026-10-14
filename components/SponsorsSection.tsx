import React from 'react';
import { motion } from 'framer-motion';
import { SponsorsContent } from '../types';

interface SponsorsSectionProps {
  content: SponsorsContent;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const SponsorsSection: React.FC<SponsorsSectionProps> = ({ content }) => {
  if (!content || !content.list || content.list.length === 0) {
    return null;
  }

  const scrollToSponsorship = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById('patrocinio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="patrocinadores" className="w-full py-16 md:py-24 bg-gradient-to-b from-gray-100 via-white to-slate-50 border-t border-slate-200 scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          {content.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0D2C54]/10 text-[#0D2C54] text-xs md:text-sm font-bold uppercase tracking-wider mb-4 border border-[#0D2C54]/20">
              <svg className="w-4 h-4 text-[#2A9D8F]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              {content.badge}
            </div>
          )}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0D2C54] tracking-tight mb-4 font-['Outfit',sans-serif]">
            {content.title}
          </h2>
          {content.subtitle && (
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-['Roboto'] leading-relaxed">
              {content.subtitle}
            </p>
          )}
        </div>

        {/* Sponsor Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-14"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {content.list.map((sponsor, index) => {
            const CardWrapper = sponsor.websiteUrl ? 'a' : 'div';
            const wrapperProps = sponsor.websiteUrl
              ? {
                  href: sponsor.websiteUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'group block'
                }
              : { className: 'group block' };

            return (
              <motion.div key={index} variants={itemVariants}>
                <CardWrapper
                  {...wrapperProps}
                  className="h-full bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-between text-center relative overflow-hidden group"
                >
                  {/* Decorative top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0D2C54] via-[#2A9D8F] to-[#F4A261] opacity-75 group-hover:opacity-100 transition-opacity" />

                  {/* Logo Container */}
                  <div className="w-full py-8 px-4 flex items-center justify-center min-h-[140px]">
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="max-h-24 md:max-h-28 w-auto max-w-full object-contain filter drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Info footer inside card */}
                  <div className="w-full pt-4 border-t border-slate-100 mt-2 flex flex-col items-center gap-2">
                    {sponsor.category && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-100 text-[#0D2C54] group-hover:bg-[#2A9D8F]/15 group-hover:text-[#2A9D8F] transition-colors">
                        {sponsor.category}
                      </span>
                    )}
                    <h3 className="text-base md:text-lg font-bold text-slate-800 group-hover:text-[#0D2C54] transition-colors flex items-center justify-center gap-1.5">
                      <span>{sponsor.name}</span>
                      {sponsor.websiteUrl && (
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-[#2A9D8F] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </h3>
                  </div>
                </CardWrapper>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Call to action for prospective sponsors */}
        {content.ctaText && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm max-w-3xl mx-auto text-center flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="text-left sm:text-left">
              <p className="text-base font-bold text-[#0D2C54]">
                {content.ctaText}
              </p>
              <p className="text-xs md:text-sm text-slate-500 font-['Roboto'] mt-1">
                Conozca los paquetes de auspicio Oro, Plata, Bronce y espacios para stands.
              </p>
            </div>
            {content.ctaButtonText && (
              <a
                href="#patrocinio"
                onClick={scrollToSponsorship}
                className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0D2C54] hover:bg-[#1a3d6b] text-white font-bold text-sm md:text-base transition-colors shadow-md"
              >
                <span>{content.ctaButtonText}</span>
                <svg className="w-4 h-4 text-[#F4A261]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
