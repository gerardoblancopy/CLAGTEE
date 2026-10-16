import React from 'react';

interface AnnouncementMarqueeProps {
  text: string;
  href?: string;
}

// Repeticiones dentro de un mismo grupo: aseguran que el track llene pantallas
// anchas antes de reiniciar el ciclo.
const REPEATS_PER_GROUP = 4;

export const AnnouncementMarquee: React.FC<AnnouncementMarqueeProps> = ({ 
  text, 
  href = '#version-final-ieee' 
}) => {
  const group = Array.from({ length: REPEATS_PER_GROUP }, (_, index) => (
    <span key={index} className="flex items-center whitespace-nowrap">
      <span className="px-8 text-sm md:text-base font-bold uppercase tracking-wide group-hover:text-[#F4A261] transition-colors">
        {text}
      </span>
      <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#F4A261] inline-block" />
    </span>
  ));

  const contentElement = (
    <div className="marquee-track">
      <span className="flex">{group}</span>
      {/* Copia duplicada: el desplazamiento de -50% la deja alineada con la original. */}
      <span aria-hidden="true" className="flex">
        {group}
      </span>
    </div>
  );

  return (
    // shrink-0: el contenedor raíz de App es `flex flex-col h-full`; sin esto la
    // banda se comprime hasta quedar solo con su padding.
    <a
      href={href}
      className="marquee-root relative shrink-0 overflow-hidden bg-[#0D2C54] text-white py-3 shadow-md block group cursor-pointer hover:bg-[#0b2444] transition-colors"
      role="status"
      aria-label={text}
      title="Ir a las instrucciones de la versión final IEEE y descarga de plantilla"
    >
      {contentElement}
    </a>
  );
};
