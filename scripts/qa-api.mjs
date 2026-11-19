// Pruebas de integración contra el servidor en marcha (npm run dev).
// Uso: npm run qa [-- ruta/video.mp4 ruta/video.webm ...]
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const API = `${BASE}/api/archivos`;
const AUTOR = "QA";

const storage = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
}).storage.from(process.env.SUPABASE_BUCKET ?? "Media-files");

const MIME_POR_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
);

// Cabeceras mínimas: bastan para la validación de firma del servidor, no para reproducirse.
const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypisom"),
  Buffer.alloc(12),
]);
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(28)]);

const resultados = [];

function check(nombre, ok, detalle = "") {
  resultados.push({ nombre, ok });
  console.log(`${ok ? "OK  " : "FALLA"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}

async function subir({ bytes, nombre, mime, autor = AUTOR, titulo }) {
  const form = new FormData();
  if (bytes) form.append("archivo", new Blob([bytes], { type: mime }), nombre);
  if (autor !== null) form.append("subidoPor", autor);
  if (titulo) form.append("titulo", titulo);
  const res = await fetch(API, { method: "POST", body: form });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function listar(query = "") {
  const res = await fetch(`${API}?${query}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function existeEnBucket(publicId) {
  const carpeta = publicId.split("/")[0];
  const { data, error } = await storage.list(carpeta, { search: basename(publicId) });
  if (error) throw new Error(error.message);
  return data.some((f) => f.name === basename(publicId));
}

async function cicloCompleto({ etiqueta, bytes, nombre, mime, tipo }) {
  const titulo = `qa-${etiqueta}-${Date.now()}`;
  const subida = await subir({ bytes, nombre, mime, titulo });
  const r = subida.body;
  check(`${etiqueta}: POST 201`, subida.status === 201, `${subida.status} ${r?.error ?? ""}`);
  if (subida.status !== 201) return;

  check(
    `${etiqueta}: metadatos`,
    r.titulo === titulo &&
      r.tipoArchivo === tipo &&
      r.mime === mime &&
      r.tamanoBytes === bytes.length &&
      r.subidoPor === AUTOR &&
      r.url.includes(r.publicId) &&
      !Number.isNaN(Date.parse(r.fechaSubida)),
  );

  const publico = await fetch(r.url);
  check(
    `${etiqueta}: URL pública`,
    publico.ok && publico.headers.get("content-type")?.startsWith(mime),
    `${publico.status} ${publico.headers.get("content-type")}`,
  );
  check(`${etiqueta}: está en el bucket`, await existeEnBucket(r.publicId));

  const filtrado = await listar(`tipo=${tipo}&q=${titulo}`);
  check(
    `${etiqueta}: GET con filtro y búsqueda`,
    filtrado.body?.items?.length === 1 && filtrado.body.items[0].id === r.id,
  );

  const borrado = await fetch(`${API}/${r.id}`, { method: "DELETE" });
  check(`${etiqueta}: DELETE 200`, borrado.status === 200);
  check(`${etiqueta}: fuera del bucket`, !(await existeEnBucket(r.publicId)));
  check(
    `${etiqueta}: fuera de la BD`,
    (await listar(`q=${titulo}`)).body?.items?.length === 0,
  );

  const otraVez = await fetch(`${API}/${r.id}`, { method: "DELETE" });
  check(`${etiqueta}: segundo DELETE 404`, otraVez.status === 404);
}

async function casosDeError() {
  const esperar = async (nombre, status, peticion) => {
    const r = await peticion;
    check(nombre, r.status === status && typeof r.body?.error === "string", `${r.status} ${r.body?.error ?? ""}`);
  };

  await esperar("sin archivo → 400", 400, subir({ bytes: null }));
  await esperar("sin autor → 400", 400, subir({ bytes: png, nombre: "a.png", mime: "image/png", autor: null }));
  await esperar("autor en blanco → 400", 400, subir({ bytes: png, nombre: "a.png", mime: "image/png", autor: "   " }));
  await esperar("autor de 61 caracteres → 400", 400, subir({ bytes: png, nombre: "a.png", mime: "image/png", autor: "x".repeat(61) }));
  await esperar("tipo no permitido (.txt) → 415", 415, subir({ bytes: Buffer.from("hola"), nombre: "a.txt", mime: "text/plain" }));
  await esperar("tipo no permitido (.gif) → 415", 415, subir({ bytes: Buffer.from("GIF89a"), nombre: "a.gif", mime: "image/gif" }));
  await esperar("PNG falso (contenido de texto) → 415", 415, subir({ bytes: Buffer.from("no soy una imagen"), nombre: "falso.png", mime: "image/png" }));
  await esperar("imagen de 11 MB → 413", 413, subir({ bytes: Buffer.concat([png, Buffer.alloc(11 * 1024 * 1024)]), nombre: "grande.png", mime: "image/png" }));
  await esperar("cuerpo de 60 MB → 413", 413, subir({ bytes: Buffer.alloc(60 * 1024 * 1024), nombre: "enorme.mp4", mime: "video/mp4" }));

  const json = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("cuerpo JSON en vez de multipart → 400", json.status === 400);

  await esperar("GET tipo inválido → 400", 400, listar("tipo=AUDIO"));
  await esperar("GET limit=0 → 400", 400, listar("limit=0"));
  await esperar("DELETE id inexistente → 404", 404, fetch(`${API}/no-existe`, { method: "DELETE" }).then(async (r) => ({ status: r.status, body: await r.json() })));

  const orden = await listar("limit=100");
  const fechas = orden.body?.items?.map((a) => Date.parse(a.fechaSubida)) ?? [];
  check("GET ordenado del más reciente al más antiguo", fechas.every((f, i) => i === 0 || fechas[i - 1] >= f));
}

const extras = await Promise.all(
  process.argv.slice(2).map(async (ruta) => {
    const mime = MIME_POR_EXT[extname(ruta).toLowerCase()];
    if (!mime) throw new Error(`Extensión no soportada: ${ruta}`);
    const tipo = mime.startsWith("image/") ? "IMAGEN" : mime.startsWith("video/") ? "VIDEO" : "PDF";
    return { etiqueta: basename(ruta), bytes: await readFile(ruta), nombre: basename(ruta), mime, tipo };
  }),
);

const casos = [
  { etiqueta: "PNG", bytes: png, nombre: "qa.png", mime: "image/png", tipo: "IMAGEN" },
  { etiqueta: "PDF", bytes: pdf, nombre: "qa.pdf", mime: "application/pdf", tipo: "PDF" },
  { etiqueta: "MP4", bytes: mp4, nombre: "qa.mp4", mime: "video/mp4", tipo: "VIDEO" },
  { etiqueta: "WebM", bytes: webm, nombre: "qa.webm", mime: "video/webm", tipo: "VIDEO" },
  ...extras,
];

for (const caso of casos) await cicloCompleto(caso);
await casosDeError();

const fallos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} pruebas correctas`);
process.exit(fallos ? 1 : 0);
