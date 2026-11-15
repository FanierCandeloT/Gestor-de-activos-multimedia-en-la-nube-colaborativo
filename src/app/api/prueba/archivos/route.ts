// SOLO PARA PRUEBAS: imita GET /api/archivos con datos en memoria. Se borra antes de entregar.
import { NextResponse } from "next/server";
import { archivosPrueba, TAMANO_PAGINA_PRUEBA } from "@/lib/datosPrueba";

const TIPOS_VALIDOS = ["IMAGEN", "VIDEO", "PDF"];
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "No disponible." }, { status: 404 });
    }
    await pausa(400); // para poder ver el estado "Cargando..."

    const params = new URL(request.url).searchParams;
    const tipo = params.get("tipo")?.toUpperCase();
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
        return NextResponse.json({ error: "'tipo' no válido." }, { status: 400 });
    }
    const q = params.get("q")?.trim().toLowerCase();
    const cursor = params.get("cursor");

    const filtrados = archivosPrueba
        .filter((a) => !tipo || a.tipoArchivo === tipo)
        .filter((a) => !q || a.titulo.toLowerCase().includes(q))
        .sort((a, b) => b.fechaSubida.localeCompare(a.fechaSubida));

    let inicio = 0;
    if (cursor) {
        // Igual que Prisma: un cursor que ya no existe provoca error.
        const pos = filtrados.findIndex((a) => a.id === cursor);
        if (pos === -1) {
            return NextResponse.json({ error: "No se pudo consultar el listado." }, { status: 500 });
        }
        inicio = pos + 1;
    }

    const items = filtrados.slice(inicio, inicio + TAMANO_PAGINA_PRUEBA);
    const hayMas = inicio + TAMANO_PAGINA_PRUEBA < filtrados.length;
    return NextResponse.json({
        items,
        nextCursor: hayMas ? items[items.length - 1].id : null,
    });
}
