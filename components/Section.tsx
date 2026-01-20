
import React from 'react';

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

export const Section: React.FC<SectionProps> = ({ id, title, children, className = 'py-16 md:py-24', titleClassName = '', contentClassName = '' }) => {
  return (
    <section id={id} className={`w-full scroll-mt-20 ${className}`}>
      <div className="container mx-auto px-6 md:px-8">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 text-[#0D2C54] ${titleClassName}`}>
          {title}
        </h2>
        <div className={`max-w-4xl mx-auto ${contentClassName}`}>
          {children}
        </div>
      </div>
    </section>
  );
};
