import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUCKET, supabase } from "@/lib/supabase";
import {
  MAX_BYTES_GLOBAL,
  REGLAS_MIME,
  coincideFirma,
  formatoPermitido,
} from "@/lib/archivos";

const error = (mensaje: string, status: number) =>
  NextResponse.json({ error: mensaje }, { status });

export async function POST(request: Request) {
  // Rechazo temprano por Content-Length, antes de leer el cuerpo.
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES_GLOBAL + 1024 * 1024) {
    return error("El archivo supera el tamaño máximo permitido.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("La solicitud debe ser multipart/form-data válida.", 400);
  }

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return error("Falta el campo 'archivo' o está vacío.", 400);
  }

  const subidoPor = String(formData.get("subidoPor") ?? "").trim();
  if (!subidoPor || subidoPor.length > 60) {
    return error("'subidoPor' es obligatorio (máximo 60 caracteres).", 400);
  }

  const tituloEnviado = String(formData.get("titulo") ?? "").trim();
  const titulo = (tituloEnviado || archivo.name.replace(/\.[^.]+$/, "")).slice(0, 120);
  if (!titulo) {
    return error("No se pudo determinar un título.", 400);
  }

  const regla = REGLAS_MIME[archivo.type];
  if (!regla) {
    return error(`Tipo no permitido. Formatos válidos: ${formatoPermitido}.`, 415);
  }
  if (archivo.size > regla.maxBytes) {
    const maxMb = regla.maxBytes / (1024 * 1024);
    return error(`El archivo supera el máximo de ${maxMb} MB para este tipo.`, 413);
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  if (!coincideFirma(archivo.type, buffer)) {
    return error("El contenido del archivo no corresponde a su tipo declarado.", 415);
  }

  const publicId = `${regla.tipo.toLowerCase()}/${randomUUID()}.${regla.extension}`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(publicId, buffer, { contentType: archivo.type, upsert: false });
  if (errorSubida) {
    console.error("Error subiendo a Supabase:", errorSubida.message);
    return error("No se pudo subir el archivo al almacenamiento en la nube.", 502);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(publicId);

  try {
    const registro = await prisma.archivo.create({
      data: {
        titulo,
        url: data.publicUrl,
        publicId,
        tipoArchivo: regla.tipo,
        mime: archivo.type,
        tamanoBytes: archivo.size,
        subidoPor,
      },
    });
    return NextResponse.json(registro, { status: 201 });
  } catch (e) {
    console.error("Error guardando metadatos:", e);
    // Compensación: no dejar archivos huérfanos en la nube.
    const { error: errorLimpieza } = await supabase.storage.from(BUCKET).remove([publicId]);
    if (errorLimpieza) {
      console.error("No se pudo revertir la subida:", publicId, errorLimpieza.message);
    }
    return error("No se pudieron guardar los metadatos. La subida fue revertida.", 500);
  }
}

const TIPOS_VALIDOS = ["IMAGEN", "VIDEO", "PDF"] as const;
const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 100;

// GET /api/archivos?tipo=IMAGEN|VIDEO|PDF&q=texto&limit=50&cursor=<id>
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const tipo = params.get("tipo")?.toUpperCase();
  if (tipo && !(TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
    return error(`'tipo' debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.`, 400);
  }

  const limiteSolicitado = Number(params.get("limit") ?? LIMITE_POR_DEFECTO);
  if (!Number.isInteger(limiteSolicitado) || limiteSolicitado < 1) {
    return error("'limit' debe ser un entero positivo.", 400);
  }
  const limit = Math.min(limiteSolicitado, LIMITE_MAXIMO);

  const q = params.get("q")?.trim();
  const cursor = params.get("cursor");

  try {
    // Se pide uno extra para saber si hay más páginas.
    const filas = await prisma.archivo.findMany({
      where: {
        ...(tipo ? { tipoArchivo: tipo as (typeof TIPOS_VALIDOS)[number] } : {}),
        ...(q ? { titulo: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ fechaSubida: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = filas.length > limit;
    const items = hayMas ? filas.slice(0, limit) : filas;
    return NextResponse.json({
      items,
      nextCursor: hayMas ? items[items.length - 1].id : null,
    });
  } catch (e) {
    console.error("Error consultando archivos:", e);
    return error("No se pudo consultar el listado.", 500);
  }
}
