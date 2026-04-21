// src/pages/QRCodePage.tsx

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

interface QRCodePageState {
  qrValue: string;
  title?: string;
  subtitle?: string;
  footer?: string;
  size?: number; // optional QR size
}

const QRCodePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as QRCodePageState;

  if (!state?.qrValue) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">QR Code data missing.</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  const { qrValue, title, subtitle, footer, size = 256 } = state;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white p-6 text-center">
      {title && <h1 className="text-xl font-bold mb-2">{title}</h1>}
      {subtitle && <p className="text-gray-600 mb-4">{subtitle}</p>}

      <QRCodeCanvas value={qrValue} size={size} />

      {footer && <p className="mt-6 text-sm text-gray-500">{footer}</p>}
    </div>
  );
};

export default QRCodePage;
