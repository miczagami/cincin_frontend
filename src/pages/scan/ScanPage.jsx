import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Zap, ZapOff } from 'lucide-react';
import { Spinner } from '../../components/ui';
import useScanStore from '../../context/scanStore';

export default function ScanPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scanLabel, isScanning } = useScanStore();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('camera');
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (active && videoRef.current) { videoRef.current.srcObject = s; setStream(s); }
      } catch (err) {
        if (active) setCameraError(err.name === 'NotAllowedError' ? 'Camera access denied. Enable it in your device settings.' : 'Could not access camera.');
      }
    };
    if (mode === 'camera') start();
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
  }, [mode]);

  const toggleFlash = useCallback(async () => {
    if (!stream) return;
    try { await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: !flash }] }); setFlash(!flash); } catch {}
  }, [stream, flash]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const result = await scanLabel(new File([blob], 'label.jpg', { type: 'image/jpeg' }));
      if (result.success) navigate('/scan/confirm');
    }, 'image/jpeg', 0.85);
  }, [scanLabel, navigate]);

  return (
    <div className="h-dvh relative bg-black overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cin-black/90 px-8 text-center z-10">
          <span className="text-4xl mb-4">📷</span>
          <p className="text-sm text-cin-text font-body leading-relaxed">{cameraError}</p>
          <button onClick={() => navigate('/scan/search')} className="cin-btn-secondary mt-6 w-auto px-8">Use manual search instead</button>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-60 h-[340px] border-2 border-cin-cyan/60 rounded-2xl relative">
          {['top-0 left-0 border-t-[3px] border-l-[3px]', 'top-0 right-0 border-t-[3px] border-r-[3px]', 'bottom-0 left-0 border-b-[3px] border-l-[3px]', 'bottom-0 right-0 border-b-[3px] border-r-[3px]'].map((pos, i) => (
            <div key={i} className={`absolute w-6 h-6 border-cin-cyan rounded ${pos}`} />
          ))}
        </div>
        <p className="absolute bottom-[-40px] text-sm text-cin-text font-body whitespace-nowrap">{t('scan.pointCamera')}</p>
      </div>

      {isScanning && (
        <div className="absolute inset-0 bg-cin-black/70 flex flex-col items-center justify-center z-20">
          <Spinner size={40} />
          <p className="text-sm text-cin-cyan font-body mt-4">Identifying bottle…</p>
        </div>
      )}

      <div className="absolute top-3 left-5 right-5 flex justify-between z-10">
        <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); navigate(-1); }} className="text-cin-white text-sm font-body flex items-center gap-1"><X className="w-4 h-4" /> {t('scan.close')}</button>
        <button onClick={toggleFlash} className="text-cin-muted text-xs font-body flex items-center gap-1">{flash ? <Zap className="w-3.5 h-3.5 text-cin-cyan" /> : <ZapOff className="w-3.5 h-3.5" />} {t('scan.flash')}</button>
      </div>

      <div className="absolute bottom-[100px] left-0 right-0 flex justify-center gap-3 z-10">
        {['camera', 'barcode', 'search'].map((m) => (
          <button key={m} onClick={() => m === 'search' ? navigate('/scan/search') : setMode(m)}
            className={`px-5 py-2 rounded-full text-sm font-display font-semibold transition-all ${mode === m ? 'bg-cin-cyan text-cin-black' : 'bg-white/10 text-cin-text hover:bg-white/15'}`}>
            {t(`scan.${m}`)}
          </button>
        ))}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button onClick={handleCapture} disabled={isScanning} className="w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center disabled:opacity-40">
          <div className="w-[52px] h-[52px] rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
