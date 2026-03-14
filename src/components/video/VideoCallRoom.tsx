'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface VideoCallRoomProps {
  roomUrl: string;
  durationMinutes: number;
  sessionId: string;
  onCallEnded?: (elapsedSeconds: number) => void;
}

export function VideoCallRoom({
  roomUrl,
  durationMinutes,
  sessionId,
  onCallEnded,
}: VideoCallRoomProps) {
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedTime);

  // Start timer
  useEffect(() => {
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);

      // End call if time exceeded
      if (elapsed > totalSeconds) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        handleEndCall();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [totalSeconds]);

  const handleEndCall = () => {
    setCallEnded(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    onCallEnded?.(elapsedTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callEnded) {
    return (
      <div className="w-full h-screen bg-warm-offwhite flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <PhoneOff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Gesprek beëindigd
          </h1>
          <p className="text-text-secondary mb-8">
            Duur: {formatTime(elapsedTime)}
          </p>
          <p className="text-sm text-text-secondary">
            Je kunt nu notities toevoegen aan het gesprek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Daily.co iframe */}
      <iframe
        key={roomUrl}
        title="Daily.co Video Call"
        src={roomUrl}
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        allow="camera; microphone; display-capture"
      />

      {/* Timer overlay - top right */}
      <div className="absolute top-6 right-6 bg-black bg-opacity-75 rounded-lg p-4 z-10 backdrop-blur">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-white" />
          <span className="text-white font-mono font-semibold">
            {formatTime(elapsedTime)}
          </span>
        </div>
        <div className="text-white text-xs text-opacity-70">
          {formatTime(remainingSeconds)} resterend
        </div>
      </div>

      {/* Call controls - bottom center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-3 bg-black bg-opacity-75 backdrop-blur rounded-full px-4 py-3">
          <button
            onClick={() => setIsAudioOn(!isAudioOn)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title={isAudioOn ? 'Microfoon uitschakelen' : 'Microfoon inschakelen'}
          >
            {isAudioOn ? (
              <Mic className="w-5 h-5 text-white" />
            ) : (
              <MicOff className="w-5 h-5 text-red-400" />
            )}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title={isVideoOn ? 'Camera uitschakelen' : 'Camera inschakelen'}
          >
            {isVideoOn ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 text-red-400" />
            )}
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            title="Gesprek beëindigen"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
