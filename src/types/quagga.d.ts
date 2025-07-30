// src/types/quagga.d.ts
declare var Quagga: {
  init: (config: any, callback: (err: any) => void) => void;
  start: () => void;
  stop: () => void;
  onDetected: (callback: (result: any) => void) => void;
  onProcessed: (callback: (result: any) => void) => void;
  offDetected: () => void;
  offProcessed: () => void;
  canvas: {
    ctx: {
      overlay: any;
    };
    dom: {
      overlay: any;
    };
  };
  ImageDebug: {
    drawPath: (path: any, coordinates: any, context: any, style: any) => void;
  };
};