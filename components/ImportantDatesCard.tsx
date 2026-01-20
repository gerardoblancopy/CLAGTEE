
import React from 'react';
import { ImportantDate } from '../types';
import { CalendarIcon } from './icons';

interface ImportantDatesCardProps {
  item: ImportantDate;
  index: number;
}

export const ImportantDatesCard: React.FC<ImportantDatesCardProps> = ({ item, index }) => {
  return (
    <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md h-full transition-shadow hover:shadow-lg">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#EAF2F8] text-[#0D2C54]">
            <CalendarIcon className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="font-bold text-[#0D2C54] text-lg">{item.date}</p>
        <p className="text-gray-600 font-['Roboto']">{item.event}</p>
      </div>
    </div>
  );
};
