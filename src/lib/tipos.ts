// Tipos que usa la galería (lado cliente).
// Reflejan lo que devuelve GET /api/archivos.

export type TipoArchivo = "IMAGEN" | "VIDEO" | "PDF";

export type Archivo = {
    id: string;
    titulo: string;
    url: string;
    publicId: string;
    tipoArchivo: TipoArchivo;
    mime: string;
    tamanoBytes: number;
    fechaSubida: string; // JSON entrega las fechas como texto ISO
    subidoPor: string;
};

export type RespuestaListado = {
    items: Archivo[];
    nextCursor: string | null;
};