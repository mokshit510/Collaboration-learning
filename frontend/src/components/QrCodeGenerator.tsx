import React from 'react';

export interface QrCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  value,
  size = 170,
  className = '',
}) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-md border border-slate-200 shadow-xs"
        loading="lazy"
      />
    </div>
  );
};

export default QrCodeGenerator;
