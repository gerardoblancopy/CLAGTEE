import React from 'react';
import { Content } from '../types';
import { CalendarIcon, MapPinIcon } from './icons';

interface HeroProps {
  heroContent: Content['sections']['hero'];
}

export const Hero: React.FC<HeroProps> = ({ heroContent }) => {
  return (
    <section id="inicio" className="relative h-screen flex items-center justify-center text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://www.fmdos.cl/wp-content/uploads/2015/02/Castillo_Wulff_Valpara%C3%ADso-1024x473.jpg')" }}></div>
      <div className="absolute inset-0 bg-[#0D2C54] opacity-70"></div>
      <div className="relative z-10 text-center p-4">
        <h1 className="text-5xl md:text-7xl font-bold font-['Montserrat'] tracking-tight drop-shadow-lg">
          {heroContent.title}
        </h1>
        <p className="mt-4 text-xl md:text-2xl font-light font-['Roboto'] max-w-3xl mx-auto drop-shadow-md">
          {heroContent.subtitle}
        </p>
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-lg">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-6 w-6 text-[#F4A261]" />
            <span>{heroContent.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#F4A261]" />
            <span>{heroContent.date}</span>
          </div>
        </div>
        <a 
          href="#presentacion" 
          className="mt-12 inline-block bg-[#F4A261] text-[#0D2C54] font-bold font-['Montserrat'] uppercase py-3 px-8 rounded-full text-lg hover:bg-white transition-all duration-300 transform hover:scale-105 shadow-xl"
        >
          Saber Más
        </a>
      </div>
    </section>
  );
};