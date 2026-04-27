import React, { useEffect, useState } from 'react';

export default function Display() {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [neko1Url, setNeko1Url] = useState('');
  const [neko2Url, setNeko2Url] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const [settings, url1, url2] = await Promise.all([
        window.electron.ipcRenderer.invoke('get-settings'),
        window.electron.ipcRenderer.invoke('get-asset-path', 'neko1.webm'),
        window.electron.ipcRenderer.invoke('get-asset-path', 'neko2.webm'),
      ]);
      setSeconds(((settings as any).breakTime || 5) * 60);
      setNeko1Url(url1 as string);
      setNeko2Url(url2 as string);
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
      
      {neko1Url && (!isVideoEnded ? (
        <video
          src={neko1Url}
          autoPlay
          muted
          playsInline
          onEnded={() => setIsVideoEnded(true)}
        />
      ) : (
        <video
          src={neko2Url}
          autoPlay
          muted
          loop
          playsInline
          className="sleeping"
        />
      ))}
    </div>
  );
}
