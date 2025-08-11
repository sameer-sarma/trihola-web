// src/components/OfferQRCode.tsx
import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface OfferQRCodeProps {
  token: string;
}

const OfferQRCode: React.FC<OfferQRCodeProps> = ({ token }) => {
  const qrUrl = `https://trihola.com/redeem-offer?token=${encodeURIComponent(token)}`;

  return (
    <div className="text-center mt-4">
      <p className="text-sm text-gray-700 mb-2">Scan to claim this offer</p>
      <QRCodeCanvas value={qrUrl} size={180} />
    </div>
  );
};

export default OfferQRCode;
