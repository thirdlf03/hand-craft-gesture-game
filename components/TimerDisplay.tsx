import React, { useState, useEffect } from 'react';

interface TimerDisplayProps {
  initialSeconds: number;
  onTimeout: () => void;
  start: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ initialSeconds, onTimeout, start }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!start) {
      setSecondsLeft(initialSeconds); // Reset timer if start becomes false
      return;
    }

    if (secondsLeft <= 0) {
      onTimeout();
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft(prevSeconds => prevSeconds - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [secondsLeft, onTimeout, start, initialSeconds]);
  
  useEffect(() => { // Effect to reset timer when initialSeconds or start changes
    if (start) {
      setSecondsLeft(initialSeconds);
    }
  }, [initialSeconds, start]);


  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="text-9xl font-mochiy text-primary opacity-80" style={{ WebkitTextStroke: '3px white' }}>
        {secondsLeft > 0 ? secondsLeft : '📸'}
      </div>
    </div>
  );
};

export default TimerDisplay;