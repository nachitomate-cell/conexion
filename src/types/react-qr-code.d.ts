declare module "react-qr-code" {
  import type { CSSProperties } from "react";

  export interface QRCodeProps {
    value: string;
    size?: number;
    level?: "L" | "M" | "Q" | "H";
    bgColor?: string;
    fgColor?: string;
    title?: string;
    className?: string;
    style?: CSSProperties;
    viewBox?: string;
  }

  const QRCode: (props: QRCodeProps) => JSX.Element;
  export default QRCode;
}
