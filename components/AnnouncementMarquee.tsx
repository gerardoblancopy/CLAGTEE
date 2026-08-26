import React from 'react';

interface AnnouncementMarqueeProps {
  text: string;
}

// Repeticiones dentro de un mismo grupo: aseguran que el track llene pantallas
// anchas antes de reiniciar el ciclo.
const REPEATS_PER_GROUP = 4;

export const AnnouncementMarquee: React.FC<AnnouncementMarqueeProps> = ({ text }) => {
  const group = Array.from({ length: REPEATS_PER_GROUP }, (_, index) => (
    <span key={index} className="flex items-center whitespace-nowrap">
      <span className="px-8 text-sm md:text-base font-bold uppercase tracking-wide">{text}</span>
      <span aria-hidden="true" className="text-[#F4A261]">
        ★
      </span>
    </span>
  ));

  return (
    // shrink-0: el contenedor raíz de App es `flex flex-col h-full`; sin esto la
    // banda se comprime hasta quedar solo con su padding.
    <div
      className="marquee-root relative shrink-0 overflow-hidden bg-[#0D2C54] text-white py-3 shadow-md"
      role="status"
      aria-label={text}
    >
      <div className="marquee-track">
        <span className="flex">{group}</span>
        {/* Copia duplicada: el desplazamiento de -50% la deja alineada con la original. */}
        <span aria-hidden="true" className="flex">
          {group}
        </span>
      </div>
    </div>
  );
};
