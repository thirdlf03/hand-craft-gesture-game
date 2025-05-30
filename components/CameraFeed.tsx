
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface CameraFeedProps {
  width: number;
  height: number;
  onCameraError: (error: string) => void;
  onCameraReady?: () => void;
}

export interface CameraFeedHandle {
  captureImage: () => string | null;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  ({ width, height, onCameraError, onCameraReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
      const enableStream = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width, height } });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            if (onCameraReady) onCameraReady();
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          if (err instanceof Error) {
            onCameraError(`カメラアクセスエラー: ${err.message}. カメラの使用を許可してください。`);
          } else {
            onCameraError("カメラアクセスエラー。カメラの使用を許可してください。");
          }
        }
      };

      enableStream();

      return () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]); // Rerun if width/height change, onCameraError and onCameraReady are stable

    useImperativeHandle(ref, () => ({
      captureImage: () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg');
          }
        }
        return null;
      },
    }));

    return (
      <div className="relative w-full max-w-md mx-auto border-4 border-accent rounded-lg shadow-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto block"
          style={{ transform: 'scaleX(-1)' }} // Mirror mode
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }
);

export default CameraFeed;
