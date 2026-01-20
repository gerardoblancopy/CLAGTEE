

import React from 'react';
import { BookCover } from '../types';

interface BookCoverCardProps {
  item: BookCover;
}

export const BookCoverCard: React.FC<BookCoverCardProps> = ({ item }) => {
  return (
    <div className="group bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-2 h-full flex flex-col">
      <div className="overflow-hidden bg-gray-200">
        <img 
          src={item.imageUrl} 
          alt={item.description} 
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110" 
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-[#0D2C54] font-['Montserrat']">
          Edición {item.year}
        </h3>
        <p className="text-sm text-gray-600 font-['Roboto'] mt-1">
          {item.description}
        </p>
      </div>
    </div>
  );
};