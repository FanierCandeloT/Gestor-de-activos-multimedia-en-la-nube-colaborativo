# Cloud Media Vault — Estado y tareas pendientes

Stack: Next.js (App Router, TypeScript) + Supabase Storage (archivos) + Neon PostgreSQL con Prisma (metadatos).

## Ya hecho (backend completo)

| Pieza | Archivo |
|---|---|
| Proyecto Next.js + Tailwind | raíz |
| Modelo `Archivo` + migración `init` | `prisma/schema.prisma`, `prisma/migrations/` |
| Cliente Prisma | `src/lib/prisma.ts` |
| Cliente Supabase (solo servidor) | `src/lib/supabase.ts` |
| Reglas de tipo/tamaño y firma de archivo | `src/lib/archivos.ts` |
| `POST /api/archivos` (subir) | `src/app/api/archivos/route.ts` |
| `GET /api/archivos` (listar, filtrar, buscar, paginar) | `src/app/api/archivos/route.ts` |
| `DELETE /api/archivos/:id` (borra nube y BD) | `src/app/api/archivos/[id]/route.ts` |

## Cómo arrancar

1. `npm install`
2. Copiar `.env.example` a `.env.local` y pedir las credenciales reales (nunca subirlas a git).
3. `npm run dev` y abrir http://localhost:3000

## Contrato de la API

**POST /api/archivos** — `multipart/form-data`
- `archivo` (File, obligatorio), `subidoPor` (texto, obligatorio, máx. 60), `titulo` (opcional).
- Permitido: JPG/PNG/WebP hasta 10 MB, PDF hasta 20 MB, MP4/WebM hasta 50 MB.
- 201 con el registro creado. Errores: 400 (campos), 413 (tamaño), 415 (tipo), 502 (nube), 500. Todos como `{ "error": "mensaje" }`.

**GET /api/archivos?tipo=IMAGEN|VIDEO|PDF&q=texto&limit=50&cursor=<id>**
- Respuesta: `{ items: Archivo[], nextCursor: string | null }`, más recientes primero.

**DELETE /api/archivos/:id** — 200 `{ id, eliminado: true }`, 404 si no existe, 502 si falla la nube.

`Archivo`: `id, titulo, url, publicId, tipoArchivo (IMAGEN|VIDEO|PDF), mime, tamanoBytes, fechaSubida, subidoPor`.

## Pendiente

### Tarea A — Interfaz de subida (Rol 4)
- Componente de subida en `src/components/` con selección de archivo y arrastrar y soltar.
- Campo "Tu nombre" (`subidoPor`) y título opcional.
- Validar tipo y tamaño en el navegador antes de enviar (mismas reglas que `src/lib/archivos.ts`).
- Enviar con `FormData` a `POST /api/archivos` y mostrar estados de carga (spinner o barra), éxito y error con el mensaje del servidor.
- Vista previa del archivo elegido antes de subir.
- Responsiva (móvil y escritorio).

### Tarea B — Galería, filtros y borrado (Rol 5)
- Galería que consume `GET /api/archivos`.
- Cada tarjeta: vista previa (miniatura de imagen, `<video controls>`, enlace o vista de PDF), título, peso formateado (KB/MB), tipo, fecha y autor.
- Filtros por tipo (Todos/Imagen/Video/PDF) y búsqueda por título.
- Botón eliminar con confirmación que llama a `DELETE /api/archivos/:id` y actualiza la lista sin recargar la página.
- Estados vacío, cargando y error. Paginación con `nextCursor` ("Cargar más").
- Al subir un archivo nuevo (Tarea A), la galería debe refrescarse sola.

### Tarea C — Integración y QA
- Probar subida y borrado con imagen, PDF y video (MP4 y WebM; el video aún no se ha probado).
- Probar casos de error: archivo demasiado grande, tipo no permitido, sin nombre de autor.
- Revisar que no haya errores en la consola del navegador.
- Ejecutar `npm run lint` y `npm run build` sin errores.

### Tarea D — Documentación y entrega
- `README.md`: integrantes y rol de cada uno, diagrama o explicación de la arquitectura (Next.js → Supabase Storage + Neon/Prisma), instrucciones de ejecución.
- Confirmar que no hay `.env` ni `node_modules` en el repo (solo `.env.example`).
- Ensayar la demo de 8 minutos: subir un archivo y verlo en el panel de Supabase y en la BD; eliminarlo y comprobar el borrado en ambos. Para verificar el borrado en la nube mira la lista del bucket en el panel de Supabase, porque la URL pública puede seguir dando 200 un rato por la caché del CDN.

## Flujo de trabajo en GitHub

- Cada tarea en su propia rama (`feature/subida-ui`, `feature/galeria`, `feature/qa-docs`) y un Pull Request hacia `main`.
- Commits pequeños y con mensajes claros.
- Las Tareas A y B tocan archivos distintos; la integración (que la galería refresque tras subir) se coordina en el Pull Request de la segunda en fusionarse.
