
import React, { useState, useEffect } from 'react';
import { NavItem } from '../types';
import { MenuIcon, XIcon } from './icons';

interface NavbarProps {
  navItems: NavItem[];
  onCmsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ navItems, onCmsClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsOpen(false);
    const targetId = event.currentTarget.getAttribute('href')?.substring(1);
    if (!targetId) return;

    if (targetId === 'inicio') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navLinkClasses = `
    font-['Montserrat'] font-bold 
    text-white hover:text-[#F4A261]
    transition-colors duration-300 uppercase text-[11px] xl:text-xs
    relative after:content-[''] after:absolute after:w-0 after:h-[2px] 
    after:block after:bg-[#F4A261] after:transition-all after:duration-300 
    after:left-1/2 after:-translate-x-1/2 after:bottom-[-4px]
    hover:after:w-full
  `;

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0D2C54] shadow-lg' : 'bg-transparent'}`}>
        <div className="w-full px-4 lg:px-8 xl:px-12 flex justify-between items-center h-20">
          <a href="#inicio" aria-label="XVI CLAGTEE 2026, ir al inicio" onClick={handleNavClick}>
            <img 
              src="https://res.cloudinary.com/dnh5bxvvy/image/upload/v1753825283/image_efe0xn.png" 
              alt="CLAGTEE 2026 Logo" 
              className="h-[120px] object-contain mt-8"
            />
          </a>
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {navItems.map((item) => (
              <a key={item.text} href={item.url} className={navLinkClasses} onClick={handleNavClick}>
                {item.text}
              </a>
            ))}
            <button 
              onClick={onCmsClick}
              className="bg-[#F4A261] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#E76F51] transition-all text-[11px] xl:text-xs uppercase whitespace-nowrap"
            >
              Gestión de Papers
            </button>
          </div>
          <div className="lg:hidden">
            <button 
              onClick={() => setIsOpen(true)} 
              className="text-white"
              aria-label="Abrir menú de navegación"
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              <MenuIcon className="h-7 w-7" />
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay */}
      <div 
        id="mobile-menu"
        className={`
          lg:hidden
          fixed inset-0 bg-white z-[100]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <div className="absolute top-6 right-6">
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-[#0D2C54]"
              aria-label="Cerrar menú de navegación"
            >
              <XIcon className="h-8 w-8" />
            </button>
        </div>
        <nav className="flex flex-col items-center justify-center h-full w-full space-y-8">
          {navItems.map((item) => (
            <a 
              key={item.text} 
              href={item.url} 
              onClick={handleNavClick} 
              className="text-2xl font-['Montserrat'] font-bold text-[#0D2C54] hover:text-[#2A9D8F] transition-colors"
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
};
