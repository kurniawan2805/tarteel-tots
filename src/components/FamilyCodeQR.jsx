import { QRCodeCanvas } from 'qrcode.react';
import { useRef } from 'react';

export default function FamilyCodeQR({ familyCode }) {
  const qrRef = useRef();

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    
    const link = document.createElement('a');
    link.download = `family-code-${familyCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const shareQR = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob');
      
      const file = new File([blob], `family-code-${familyCode}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Family Code QR',
          text: `Join our family! Use code: ${familyCode}`,
          files: [file]
        });
      } else if (navigator.share) {
        // Fallback to text share if files not supported
        await navigator.share({
          title: 'Family Code',
          text: `Join our family! Use code: ${familyCode}`,
        });
      } else {
        alert('Sharing not supported on this browser. You can copy the code manually.');
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback: Copy to clipboard? Or just alert
      alert('Sharing failed. Please try downloading or copy the code manually.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-bg-dark rounded-2xl">
      <div ref={qrRef} className="bg-white p-4 rounded-lg">
        <QRCodeCanvas 
          value={familyCode} 
          size={200} 
          level="H" 
          includeMargin={true}
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Manual Code</p>
        <code className="text-3xl font-black text-primary bg-white px-6 py-2 rounded-xl block border-2 border-primary border-opacity-10 shadow-sm">
          {familyCode}
        </code>
      </div>

      <div className="flex gap-2 w-full pt-2">
        <button
          onClick={downloadQR}
          className="flex-1 btn-secondary text-xs py-2 uppercase font-bold"
        >
          📥 Download
        </button>
        <button
          onClick={shareQR}
          className="flex-1 btn-secondary text-xs py-2 uppercase font-bold"
        >
          📤 Share
        </button>
      </div>
      
      <p className="text-[10px] text-text-muted text-center mt-2 font-medium">
        Have your spouse scan the QR code or enter the code manually to join.
      </p>
    </div>
  );
}
