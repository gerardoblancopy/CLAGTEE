
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Content } from '../types';
import { CalendarIcon, MapPinIcon } from './icons';

interface HeaderProps {
  heroContent: Content['sections']['hero'];
}

const heroContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delayChildren: 0.5,
        },
    },
};

const heroItemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
};


export const Header: React.FC<HeaderProps> = ({ heroContent }) => {
  const handleCTAClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetId = event.currentTarget.getAttribute('href')?.substring(1);
    if (targetId) {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <header 
      id="inicio" 
      className="relative text-white bg-cover bg-center h-[70vh] min-h-[500px] flex items-center justify-center"
      style={{ backgroundImage: "url('https://storage.googleapis.com/chile-travel-cdn/2021/08/Vitrina_Centro_santiago-1.jpg')" }}
    >
      <div className="absolute inset-0 bg-[#0D2C54] opacity-70"></div>
      
      <div className="relative z-10 flex items-center justify-center">
          <motion.div 
            className="text-center p-4"
            variants={heroContainerVariants}
            initial="hidden"
            animate="show"
          >
              <motion.h1 
                variants={heroItemVariants}
                className="text-5xl md:text-7xl font-bold font-['Montserrat'] tracking-tight drop-shadow-lg">
                {heroContent.title}
              </motion.h1>
              <motion.p 
                variants={heroItemVariants}
                className="mt-4 text-xl md:text-2xl font-light font-['Roboto'] max-w-3xl mx-auto drop-shadow-md">
                {heroContent.subtitle}
              </motion.p>
              <motion.div 
                variants={heroItemVariants}
                className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-lg">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-6 w-6 text-[#F4A261]" />
                  <span>{heroContent.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6 text-[#F4A261]" />
                  <span>{heroContent.date}</span>
                </div>
              </motion.div>
              <motion.a 
                variants={heroItemVariants}
                href="#acerca-de" 
                onClick={handleCTAClick}
                className="mt-12 inline-block bg-[#F4A261] text-[#0D2C54] font-bold font-['Montserrat'] uppercase py-3 px-8 rounded-full text-lg hover:bg-white transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                Saber Más
              </motion.a>
          </motion.div>
      </div>
    </header>
  );
};
