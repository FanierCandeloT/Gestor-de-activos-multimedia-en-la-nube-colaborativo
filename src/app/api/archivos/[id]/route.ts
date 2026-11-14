import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUCKET, supabase } from "@/lib/supabase";

const error = (mensaje: string, status: number) =>
  NextResponse.json({ error: mensaje }, { status });

// DELETE /api/archivos/:id — primero la nube (por publicId), después la BD.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const archivo = await prisma.archivo.findUnique({ where: { id } });
    if (!archivo) {
      return error("El archivo no existe.", 404);
    }

    const { error: errorNube } = await supabase.storage
      .from(BUCKET)
      .remove([archivo.publicId]);
    if (errorNube) {
      // No se toca la BD: el registro sigue apuntando al archivo y se puede reintentar.
      console.error("Error borrando en Supabase:", errorNube.message);
      return error("No se pudo eliminar el archivo de la nube. Intenta de nuevo.", 502);
    }

    // deleteMany no falla si otra petición ya lo borró (idempotente).
    await prisma.archivo.deleteMany({ where: { id } });
    return NextResponse.json({ id, eliminado: true });
  } catch (e) {
    console.error("Error eliminando archivo:", e);
    return error("No se pudo eliminar el archivo.", 500);
  }
}
