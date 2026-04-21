// src/components/OfferQRCode.tsx
import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface OfferQRCodeProps { url: string }

const OfferQRCode: React.FC<OfferQRCodeProps> = ({ url }) => (
  <div className="text-center mt-4">
    <p className="text-sm text-gray-700 mb-2">Scan to claim this offer</p>
    <QRCodeCanvas value={url} size={180} />
  </div>
);

export default OfferQRCode;
