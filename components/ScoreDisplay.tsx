
import React from 'react';
import { ScoreData } from '../types';

interface ScoreDisplayProps {
  scoreData: ScoreData | null;
  onPlayAgain: () => void;
  capturedImage: string | null;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ scoreData, onPlayAgain, capturedImage }) => {
  if (!scoreData) {
    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-2xl">
        <p className="text-2xl text-text-dark font-bold">スコアを計算できませんでした。</p>
        <button
          onClick={onPlayAgain}
          className="mt-8 px-8 py-3 bg-primary text-text-light font-bold text-xl rounded-lg shadow-md hover:bg-red-700 transition-colors active:scale-95"
        >
          もう一度遊ぶ
        </button>
      </div>
    );
  }

  const getScoreColor = (points: number) => {
    if (points >= 80) return 'text-green-500';
    if (points >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="text-center p-6 md:p-10 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl max-w-lg mx-auto">
      <h2 className="text-3xl font-mochiy text-primary mb-4">結果発表！</h2>
      
      {capturedImage && (
        <div className="mb-6">
          <p className="text-lg text-text-dark mb-2">あなたが作った作品：</p>
          <img 
            src={capturedImage} 
            alt="Player's creation" 
            className="w-48 h-auto mx-auto rounded-lg shadow-md border-2 border-accent"
            style={{ transform: 'scaleX(-1)' }} 
          />
        </div>
      )}

      <p className="text-2xl text-text-dark mb-2">あなたのスコアは...</p>
      <p className={`text-7xl font-mochiy mb-4 ${getScoreColor(scoreData.points)}`}>
        {scoreData.points}<span className="text-3xl text-text-dark">点</span>
      </p>
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-8">
        <p className="text-lg text-text-dark font-semibold">AIからのフィードバック：</p>
        <p className="text-md text-gray-700">{scoreData.feedback}</p>
      </div>
      <button
        onClick={onPlayAgain}
        className="px-10 py-4 bg-secondary text-text-light font-bold text-xl rounded-lg shadow-md hover:bg-teal-600 transition-colors active:scale-95"
      >
        もう一度遊ぶ！
      </button>
    </div>
  );
};

export default ScoreDisplay;
