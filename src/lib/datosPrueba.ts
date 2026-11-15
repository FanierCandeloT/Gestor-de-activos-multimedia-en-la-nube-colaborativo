// SOLO PARA PRUEBAS: datos simulados en memoria para probar la galería sin base de datos.
// Se usan desde /api/prueba/archivos y la página /prueba. Se pierden al reiniciar el servidor.
import type { Archivo, TipoArchivo } from "@/lib/tipos";

const TIPOS: TipoArchivo[] = ["IMAGEN", "VIDEO", "PDF"];

function crearDatos(): Archivo[] {
    return Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const tipoArchivo = TIPOS[i % 3];
        const url =
            tipoArchivo === "IMAGEN"
                ? `https://picsum.photos/seed/vault${n}/600/400`
                : tipoArchivo === "VIDEO"
                  ? "https://www.w3schools.com/html/mov_bbb.mp4"
                  : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
        const nombre = { IMAGEN: "Foto", VIDEO: "Video", PDF: "Documento" }[tipoArchivo];
        return {
            id: `p${String(n).padStart(2, "0")}`,
            titulo: `${nombre} de prueba ${n}`,
            url,
            publicId: `prueba/${n}`,
            tipoArchivo,
            mime: "x",
            tamanoBytes: n * 350_000,
            // Más reciente primero: el 10 es el más nuevo.
            fechaSubida: new Date(Date.UTC(2026, 10, n)).toISOString(),
            subidoPor: n % 2 === 0 ? "Sebastian" : "Fanier",
        };
    });
}

// globalThis para que el recargado en caliente de Next no reinicie los datos.
const g = globalThis as unknown as { __archivosPrueba?: Archivo[] };
export const archivosPrueba: Archivo[] = (g.__archivosPrueba ??= crearDatos());

export const TAMANO_PAGINA_PRUEBA = 4;
