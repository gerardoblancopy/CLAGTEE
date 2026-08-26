
import React, { useState, useEffect } from 'react';
import { NavItem, UIStrings } from '../types';
import { MenuIcon, XIcon } from './icons';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  navItems: NavItem[];
  onCmsClick: () => void;
  ui: UIStrings;
}

export const Navbar: React.FC<NavbarProps> = ({ navItems, onCmsClick, ui }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage } = useLanguage();

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

  const handleCmsClick = () => {
    setIsOpen(false);
    onCmsClick();
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
        <div className="w-full px-4 lg:px-8 xl:px-12 flex justify-between items-center gap-3 xl:gap-10 h-20">
          <a href="#inicio" aria-label={ui.ariaHome} onClick={handleNavClick} className="shrink-0">
            <img
              src="/CLAGTEE_2026_blanco.png"
              alt="CLAGTEE 2026 Logo"
              className="h-16 object-contain"
            />
          </a>
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {navItems.map((item) => (
              <a key={item.url} href={item.url} className={navLinkClasses} onClick={handleNavClick}>
                {item.text}
              </a>
            ))}
            <LanguageSelector language={language} onLanguageChange={setLanguage} variant="desktop" />
            <button
              onClick={onCmsClick}
              className="bg-[#F4A261] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#E76F51] transition-all text-[11px] xl:text-xs uppercase whitespace-nowrap"
            >
              {ui.paperManagement}
            </button>
          </div>
          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(true)}
              className="text-white"
              aria-label={ui.ariaOpenMenu}
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
              aria-label={ui.ariaCloseMenu}
            >
              <XIcon className="h-8 w-8" />
            </button>
        </div>
        <nav className="flex flex-col items-center justify-start h-full w-full space-y-6 overflow-y-auto px-6 pt-24 pb-16">
          <LanguageSelector language={language} onLanguageChange={setLanguage} variant="mobile" />
          {navItems.map((item) => (
            <a
              key={item.url}
              href={item.url}
              onClick={handleNavClick}
              className="text-2xl font-['Montserrat'] font-bold text-[#0D2C54] hover:text-[#2A9D8F] transition-colors"
            >
              {item.text}
            </a>
          ))}
          <button
            onClick={handleCmsClick}
            className="mt-4 bg-[#F4A261] text-[#0D2C54] px-6 py-3 rounded-full font-bold uppercase text-sm tracking-wide hover:bg-[#E76F51] hover:text-white transition-colors"
          >
            {ui.paperManagement}
          </button>
        </nav>
      </div>
    </>
  );
};
