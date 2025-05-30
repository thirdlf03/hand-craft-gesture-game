
import React from 'react';
import { HandShape } from '../types';

interface HandShapeIconProps {
  shape: HandShape;
  className?: string;
}

const HandShapeIcon: React.FC<HandShapeIconProps> = ({ shape, className }) => {
  let emoji = '';
  switch (shape) {
    case HandShape.GUU:
      emoji = '✊';
      break;
    case HandShape.CHOKI:
      emoji = '✌️';
      break;
    case HandShape.PAA:
      emoji = '✋';
      break;
    default:
      emoji = '';
  }

  return (
    <span className={`inline-flex items-center justify-center p-3 bg-white border-2 border-secondary rounded-lg shadow-md text-secondary ${className}`}>
      <span className="text-3xl mr-2">{emoji}</span>
      <span className="text-xl font-bold">{shape}</span>
    </span>
  );
};

export default HandShapeIcon;
