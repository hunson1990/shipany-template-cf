'use client';

import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        loop: true,
        playsinline: true,
        fluid: true,
        responsive: true,
        aspectRatio: '16:9',
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        userActions: {
          hotkeys: true
        },
        sources: [
          {
            src: src,
            type: 'video/mp4',
          },
        ],
      }));

      // 初始隐藏控制栏
      player.ready(function(this: any) {
        this.userActive(false);
      });
    }
  }, []);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      player.src({ src: src, type: 'video/mp4' });
    }
  }, [src]);

  return (
    <div data-vjs-player className={className}>
      <div ref={videoRef} />
      <style jsx global>{`
        .video-js {
          width: 100%;
          height: auto;
        }
        .video-js .vjs-control-bar {
          display: flex !important;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          visibility: hidden;
          opacity: 0;
          transition: visibility 0s linear 0.3s, opacity 0.3s;
        }
        .video-js:hover .vjs-control-bar,
        .video-js.vjs-user-active .vjs-control-bar,
        .video-js.vjs-playing:hover .vjs-control-bar {
          visibility: visible;
          opacity: 1;
          transition-delay: 0s;
        }
        .video-js .vjs-big-play-button {
          border: none;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          opacity: 0.6;
          transition: opacity 0.3s;
          width: 1.5em;
          height: 1.5em;
          line-height: 1.5em;
          border-radius: 50%;
        }
        .video-js .vjs-big-play-button .vjs-icon-placeholder:before {
          font-size: 1.2em;
        }
        .video-js:hover .vjs-big-play-button {
          opacity: 0;
          pointer-events: none;
        }
        .video-js .vjs-big-play-button:focus,
        .video-js .vjs-big-play-button:hover {
          background: rgba(0, 0, 0, 0.5);
          opacity: 0.8;
        }
        .video-js.vjs-playing .vjs-big-play-button {
          display: none;
        }
        .video-js .vjs-progress-control .vjs-progress-holder {
          height: 0.3em;
        }
        .video-js .vjs-play-progress {
          background-color: #6466F1;
        }
        .video-js .vjs-volume-level {
          background-color: #6466F1;
        }
      `}</style>
    </div>
  );
};
