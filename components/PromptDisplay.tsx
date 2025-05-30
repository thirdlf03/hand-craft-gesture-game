
import React from 'react';
import { PromptItem } from '../types';
import HandShapeIcon from './HandShapeIcon';

interface PromptDisplayProps {
  prompt: PromptItem;
}

const PromptDisplay: React.FC<PromptDisplayProps> = ({ prompt }) => {
  return (
    <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-2xl max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-mochiy text-primary mb-6">
        【お題】 <span className="text-text-dark">{prompt.objectToMake}</span>
      </h2>
      <p className="text-xl md:text-2xl text-text-dark mb-8">{prompt.fullText}</p>
      <div className="flex justify-center items-center space-x-4 md:space-x-8">
        <HandShapeIcon shape={prompt.shape1} />
        <span className="text-3xl font-bold text-secondary">+</span>
        <HandShapeIcon shape={prompt.shape2} />
      </div>
    </div>
  );
};

export default PromptDisplay;
