// SOLO PARA PRUEBAS: imita DELETE /api/archivos/:id sobre datos en memoria.
import { NextResponse } from "next/server";
import { archivosPrueba } from "@/lib/datosPrueba";

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "No disponible." }, { status: 404 });
    }
    await pausa(600); // para poder ver "Eliminando..."

    const { id } = await params;
    const pos = archivosPrueba.findIndex((a) => a.id === id);
    if (pos === -1) {
        return NextResponse.json({ error: "El archivo no existe." }, { status: 404 });
    }
    archivosPrueba.splice(pos, 1);
    return NextResponse.json({ id, eliminado: true });
}
