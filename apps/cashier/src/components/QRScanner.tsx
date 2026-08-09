'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraOff, Keyboard, ScanLine } from 'lucide-react';
import { Button, Input } from './ui';

/** Minimal typing for the experimental BarcodeDetector API (not in lib.dom). */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

type CameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'unsupported';

export function QRScanner({ onToken, busy }: { onToken: (token: string) => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const firedRef = useRef(false);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [manual, setManual] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const emit = useCallback(
    (token: string) => {
      if (firedRef.current) return;
      firedRef.current = true;
      stop();
      onToken(token);
    },
    [onToken, stop],
  );

  const start = useCallback(async () => {
    firedRef.current = false;
    setCamera('starting');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCamera('scanning');

      const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!Ctor) {
        setAutoDetect(false);
        return;
      }
      const detector = new Ctor({ formats: ['qr_code'] });
      const loop = () => {
        const el = videoRef.current;
        if (!el || firedRef.current) return;
        detector
          .detect(el)
          .then((codes) => {
            const first = codes[0];
            if (first?.rawValue) emit(first.rawValue);
          })
          .catch(() => undefined);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setCamera('denied');
    }
  }, [emit]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          aria-label="QR scanner camera preview"
        />
        {camera === 'scanning' ? (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-52 w-52 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
              <span className="rounded-pill bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                {autoDetect ? 'Point at the customer’s QR code' : 'Camera on — enter code below'}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            {camera === 'denied' || camera === 'unsupported' ? (
              <>
                <CameraOff className="h-10 w-10 text-white/70" aria-hidden />
                <p className="text-sm text-white/80">
                  {camera === 'denied'
                    ? 'Camera access is blocked. Allow it in settings, or enter the code manually.'
                    : 'This device can’t open the camera. Enter the code manually below.'}
                </p>
              </>
            ) : (
              <>
                <ScanLine className="h-10 w-10 text-white/70" aria-hidden />
                <p className="text-sm text-white/80">Start the camera to scan a QR code.</p>
                <Button
                  size="md"
                  onClick={() => void start()}
                  loading={camera === 'starting'}
                  leftIcon={<ScanLine className="h-5 w-5" aria-hidden />}
                >
                  Start camera
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-surface-raised p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
          <Keyboard className="h-4 w-4" aria-hidden />
          Enter code manually
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) emit(manual.trim());
          }}
          className="flex gap-2"
        >
          <div className="flex-1">
            <Input
              label="QR code"
              hideLabel
              value={manual}
              onChange={(e) => {
                firedRef.current = false;
                setManual(e.target.value);
              }}
              placeholder="e.g. MB-1042 or the QR token"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={!manual.trim() || busy} loading={busy}>
            Validate
          </Button>
        </form>
      </div>
    </div>
  );
}
