
import React from 'react';
import { motion, Variants } from 'framer-motion';

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export const Footer: React.FC = () => {
  return (
    <footer id="contacto" className="bg-[#0D2C54] text-white scroll-mt-20">
      <div className="py-16 overflow-hidden">
        <motion.div 
          className="container mx-auto px-6 md:px-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={footerVariants}
        >
            <h2 className="text-3xl font-bold mb-4">Contacto</h2>
            <p className="max-w-2xl mx-auto mb-6 font-light">
                Para cualquier consulta sobre el congreso, por favor contáctenos a través del siguiente correo electrónico.
            </p>
            <a 
                href="mailto:info@clagtee2026.org" 
                className="text-lg text-[#F4A261] font-semibold hover:underline"
            >
                clagtee2026@clagtee.org
            </a>
        </motion.div>
      </div>
      <div className="bg-[#08203e] text-gray-400 py-6">
        <div className="container mx-auto px-6 md:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Escuela de Ingeniería Eléctrica - PUCV. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
