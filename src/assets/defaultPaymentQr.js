import { generateQrSvgDataUrl } from "../utils/qrCodeGenerator";

/**
 * Standard authentic NPCI-compliant UPI QR Code SVG used as high-resolution placeholder
 * when no custom QR code has been uploaded yet.
 */
export const defaultPaymentQrPlaceholder = generateQrSvgDataUrl(
  "upi://pay?pa=payments@upi&pn=Contribution%20Management&cu=INR",
  2
);

export default defaultPaymentQrPlaceholder;
