# Cloud Media Vault — Gestor de activos multimedia en la nube

Aplicación web full stack para subir imágenes, videos y PDF a almacenamiento en la nube y guardar sus metadatos en una base de datos, mediante una API REST.

Taller: *Desarrollo de Experiencias Multimedia para la Web* — Universidad Autónoma de Occidente.

## Integrantes y roles

| Integrante | Rol | Aporte |
|---|---|---|
| Fanier Andres Candelo Triana | Roles 1, 2 y 3 — Arquitecto cloud y BD, Backend de ingesta y Backend de persistencia | Configuración de Supabase y Neon, esquema Prisma, variables de entorno, `POST`, `GET` y `DELETE` de `/api/archivos` |
| Juan Camilo Trujillo | Rol 4 — Frontend: formulario de carga y validaciones | `SubidaArchivo.tsx`: arrastrar y soltar, validación previa, vista previa, progreso y mensajes |
| Sebastián Meneses Molina | Rol 5 — Frontend: galería multimedia y filtros | `Galeria.tsx`, `TarjetaArchivo.tsx`, `Biblioteca.tsx`: tarjetas, filtros, búsqueda, paginación y borrado |
| Julián Sánchez Pasaje | Pruebas de integración y QA (parte del Rol 5) | `scripts/qa-api.mjs` y `QA.md`: pruebas de la API contra Neon y Supabase reales |

## Arquitectura (Ruta A: Next.js monolito full stack)

```
Navegador (React, Client Components)
   │  FormData (multipart)          GET / DELETE (JSON)
   ▼
Next.js App Router — Route Handlers /api/archivos
   │ valida tipo, tamaño y firma          │
   ├──────────────► Supabase Storage      │  (archivo físico, bucket público "Media-files")
   └──────────────► Neon PostgreSQL ◄─────┘  (solo url, publicId y metadatos, vía Prisma)
```

- **Almacenamiento desacoplado:** el archivo vive solo en Supabase Storage. La base de datos guarda únicamente la `url`, el `publicId` (ruta dentro del bucket) y metadatos técnicos.
- **Subida (`POST /api/archivos`):** el servidor recibe el `multipart/form-data`, valida el tipo MIME, el tamaño por categoría y la firma real del archivo, lo sube a Supabase y guarda los metadatos. Si falla el guardado en la BD, borra el archivo subido para no dejar huérfanos.
- **Listado (`GET /api/archivos`):** ordenado por fecha descendente, con filtro por tipo, búsqueda por título y paginación por cursor.
- **Borrado (`DELETE /api/archivos/:id`):** primero elimina el archivo en Supabase por su `publicId` y después el registro en Neon. Si falla la nube, no toca la BD.
- **CORS:** `next.config.ts` aplica una política restrictiva a `/api/*`: solo el origen definido en `ALLOWED_ORIGIN` puede llamar a la API desde un navegador, y responde los preflight `OPTIONS` (métodos GET, POST y DELETE). La página usa el mismo origen que la API.
- **Seguridad:** las claves de Supabase y Neon solo se usan en el servidor (`import "server-only"`) y viven en `.env.local`, que git ignora. El repositorio solo incluye `.env.example`.

### Modelo `Archivo`

`id`, `titulo`, `url`, `publicId` (único), `tipoArchivo` (`IMAGEN` | `VIDEO` | `PDF`), `mime`, `tamanoBytes`, `fechaSubida`, `subidoPor`.

### Formatos y límites

El taller sugiere 10 MB; estos límites son un punto de partida ajustable en `src/lib/archivos.ts`.

| Categoría | Formatos | Máximo |
|---|---|---|
| Imagen | JPG, PNG, WebP | 10 MB |
| PDF | PDF | 20 MB |
| Video | MP4, WebM | 50 MB |

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior, una base PostgreSQL en [Neon](https://neon.tech) y un proyecto de [Supabase](https://supabase.com) con un bucket **público**.

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
```

Completa `.env.local`:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SECRET_KEY` | Secret key de Supabase (solo servidor) |
| `SUPABASE_BUCKET` | Nombre del bucket público (por defecto `Media-files`) |
| `ALLOWED_ORIGIN` | Origen autorizado por CORS para `/api/*` (por defecto `http://localhost:3000`; en producción, la URL pública de la app) |

Aplica la migración y arranca:

```bash
npx prisma migrate deploy
npm run dev
```

Abre http://localhost:3000.

### Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run lint` | Revisa el código |
| `npm run build` | Compila para producción |
| `npm run qa` | Pruebas de la API (requiere `npm run dev` en marcha); ver [QA.md](QA.md) |

## API

| Método y ruta | Descripción | Respuestas |
|---|---|---|
| `POST /api/archivos` | Campos `archivo`, `subidoPor` (obligatorio, máx. 60) y `titulo` (opcional) | 201, 400, 413, 415, 502, 500 |
| `GET /api/archivos?tipo=&q=&limit=&cursor=` | `{ items, nextCursor }`, más recientes primero | 200, 400 |
| `DELETE /api/archivos/:id` | Borra en la nube y luego en la BD | 200, 404, 502 |

Los errores se devuelven como `{ "error": "mensaje" }`.
