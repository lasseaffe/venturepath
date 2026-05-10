// src/components/vault/TicketBarcodeRenderer.jsx
import { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';

const BCID_MAP = {
  qr:      'qrcode',
  pdf417:  'pdf417',
  aztec:   'azteccode',
  code128: 'code128',
};

/**
 * Renders a barcode/QR from raw string data onto a canvas.
 * @param {{ data: string, type: 'qr'|'pdf417'|'aztec'|'code128', className?: string }} props
 */
export default function TicketBarcodeRenderer({ data, type = 'qr', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid:        BCID_MAP[type] ?? 'qrcode',
        text:        data,
        scale:       3,
        includetext: false,
        backgroundcolor: '0E1012',
        barcolor:        'D9C5B2',
      });
    } catch (err) {
      console.warn('TicketBarcodeRenderer: failed to render barcode', err);
    }
  }, [data, type]);

  if (!data) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
      aria-label="Ticket barcode"
    />
  );
}
