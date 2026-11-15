// Funciones para mostrar datos de forma legible en las tarjetas.

export function formatearPeso(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export const ETIQUETA_TIPO = {
    IMAGEN: "Imagen",
    VIDEO: "Video",
    PDF: "PDF",
} as const;