import React, { useEffect, useState } from 'react';
import neko1 from '../../assets/neko1.webm';
import neko2 from '../../assets/neko2.webm';

export default function Display() {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = (await window.electron.ipcRenderer.invoke('get-settings')) as any;
      setSeconds((settings.breakTime || 5) * 60);
      setIsLoaded(true);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (seconds <= 0) {
      if (seconds === 0) {
        window.electron.ipcRenderer.sendMessage('dismiss-cat');
      }
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, isLoaded]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeString = `${m}:${String(s).padStart(2, '0')}`;

  return (
    <div className="display-container">
      {isLoaded && <div className="countdown">{timeString}</div>}
      
      {!isVideoEnded ? (
        <video 
          src={neko1} 
          autoPlay 
          muted 
          playsInline 
          onEnded={() => setIsVideoEnded(true)} 
        />
      ) : (
        <video 
          src={neko2} 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="sleeping" 
        />
      )}
    </div>
  );
}
