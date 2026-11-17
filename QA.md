# QA — Integración

Probado el 17/11/2026 contra Neon y Supabase reales, con `npm run dev`.

## Cómo repetirlo

```bash
npm run dev
npm run qa
```

`npm run qa` sube, consulta y borra sus propios archivos, y revisa el bucket directamente, así que no deja nada en la nube ni en la BD. Para probar con archivos reales: `npm run qa -- ruta/video.mp4 ruta/foto.jpg`.

## Resultados

**API (`npm run qa`): 50/50 pruebas correctas.**

| Tipo | Subida 201 | Metadatos | URL pública | En el bucket | Filtro + búsqueda | Borrado nube y BD | 2.º DELETE 404 |
|---|---|---|---|---|---|---|---|
| PNG | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| PDF | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| MP4 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| WebM | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

| Caso de error | Esperado | Obtenido |
|---|---|---|
| Sin archivo | 400 | 400 |
| Sin autor / autor en blanco / más de 60 caracteres | 400 | 400 |
| `.txt` y `.gif` | 415 | 415 |
| PNG con contenido falso (firma no coincide) | 415 | 415 |
| Imagen de 11 MB | 413 | 413 |
| Cuerpo de 60 MB | 413 | 413 |
| JSON en vez de multipart | 400 | 400 |
| `GET ?tipo=AUDIO` / `?limit=0` | 400 | 400 |
| `DELETE` de un id inexistente | 404 | 404 |

Extra: un MP4 de 45 MB sube en ~4 s y se borra bien (Supabase acepta archivos cerca del límite de 50 MB).

**Navegador (galería):**

- MP4 y WebM reales (2 s, grabados con `MediaRecorder`) se reproducen en `<video controls>`; imagen con miniatura y PDF con enlace.
- Filtros Imagen / Video / PDF y búsqueda (sin distinguir mayúsculas, estado "No hay resultados") funcionan.
- Borrado desde la tarjeta con confirmación: la lista se actualiza sin recargar y el archivo desaparece del bucket y de la BD (sin huérfanos).
- Vista móvil (375 px) sin desbordes.
- Consola del navegador sin errores ni advertencias; log del servidor sin errores.

**Calidad del código:** `npm run lint` y `npm run build` sin errores ni advertencias.

## Pendiente antes de entregar

- [ ] Integrar el componente de subida (Tarea A) y repetir la prueba desde la interfaz.
- [ ] Quitar las rutas de prueba (`/prueba`, `/api/prueba/archivos`, `src/lib/datosPrueba.ts`).
