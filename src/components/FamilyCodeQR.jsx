import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef } from 'react';

export default function FamilyCodeQR({ familyCode }) {
  const [showQR, setShowQR] = useState(true);
  const qrRef = useRef();

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `family-code-${familyCode}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const shareQR = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const file = new File([blob], `family-code-${familyCode}.png`, { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          title: 'Family Code QR',
          text: `Join our family! Scan this code or use: ${familyCode}`,
          files: [file]
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-bg-dark rounded-2xl">
      {showQR ? (
        <>
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG 
              value={familyCode} 
              size={200} 
              level="H" 
              includeMargin={true}
            />
          </div>
          <p className="text-xs text-text-muted text-center">
            Have your spouse scan this QR code to join the family instantly
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={downloadQR}
              className="flex-1 btn-secondary text-sm py-2"
            >
              📥 Download
            </button>
            <button
              onClick={shareQR}
              className="flex-1 btn-secondary text-sm py-2"
            >
              📤 Share
            </button>
          </div>
        </>
      ) : (
        <>
          <code className="text-2xl font-bold text-primary bg-white px-4 py-3 rounded-lg">
            {familyCode}
          </code>
          <p className="text-xs text-text-muted">
            Share this code manually if QR scan doesn't work
          </p>
        </>
      )}
      
      <button
        onClick={() => setShowQR(!showQR)}
        className="text-xs text-primary underline"
      >
        {showQR ? 'Show Code' : 'Show QR'}
      </button>
    </div>
  );
}
