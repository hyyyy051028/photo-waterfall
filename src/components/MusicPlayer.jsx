import React, { useState, useRef, useEffect } from 'react';
import { CustomerServiceOutlined } from '@ant-design/icons';
import './MusicPlayer.css';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 组件卸载时暂停音乐
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className={`music-player ${isPlaying ? 'playing' : ''}`}>
      <button
        className="music-toggle"
        onClick={togglePlay}
        aria-label={isPlaying ? '暂停音乐' : '播放音乐'}
      >
        <CustomerServiceOutlined />
      </button>
      <audio
        ref={audioRef}
        src="/music/方雅贤+-+遇到.mp3"
        loop
      />
    </div>
  );
};

export default MusicPlayer;
