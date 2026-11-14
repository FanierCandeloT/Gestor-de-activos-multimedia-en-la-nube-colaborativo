import type { TipoArchivo } from "@/generated/prisma/client";

const MB = 1024 * 1024;

type Regla = { tipo: TipoArchivo; extension: string; maxBytes: number };

// Límites iniciales ajustables (el taller no fija formatos ni tamaños).
export const REGLAS_MIME: Record<string, Regla> = {
  "image/jpeg": { tipo: "IMAGEN", extension: "jpg", maxBytes: 10 * MB },
  "image/png": { tipo: "IMAGEN", extension: "png", maxBytes: 10 * MB },
  "image/webp": { tipo: "IMAGEN", extension: "webp", maxBytes: 10 * MB },
  "application/pdf": { tipo: "PDF", extension: "pdf", maxBytes: 20 * MB },
  "video/mp4": { tipo: "VIDEO", extension: "mp4", maxBytes: 50 * MB },
  "video/webm": { tipo: "VIDEO", extension: "webm", maxBytes: 50 * MB },
};

export const MAX_BYTES_GLOBAL = Math.max(
  ...Object.values(REGLAS_MIME).map((r) => r.maxBytes),
);

const empiezaCon = (b: Uint8Array, firma: number[], offset = 0) =>
  firma.every((v, i) => b[offset + i] === v);

// Verifica la firma real del archivo; el MIME enviado por el cliente es falsificable.
export const coincideFirma = (mime: string, b: Uint8Array): boolean => {
  switch (mime) {
    case "image/jpeg":
      return empiezaCon(b, [0xff, 0xd8, 0xff]);
    case "image/png":
      return empiezaCon(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return empiezaCon(b, [0x52, 0x49, 0x46, 0x46]) && empiezaCon(b, [0x57, 0x45, 0x42, 0x50], 8);
    case "application/pdf":
      return empiezaCon(b, [0x25, 0x50, 0x44, 0x46]);
    case "video/mp4":
      return empiezaCon(b, [0x66, 0x74, 0x79, 0x70], 4);
    case "video/webm":
      return empiezaCon(b, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
};

export const formatoPermitido = "JPG, PNG, WebP (10 MB), PDF (20 MB), MP4, WebM (50 MB)";
