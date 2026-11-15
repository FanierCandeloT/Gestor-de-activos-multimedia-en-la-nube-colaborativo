# Gestor-de-activos-multimedia-en-la-nube-colaborativo

> Este README es provisional. La Tarea D (integrantes, arquitectura e instrucciones de ejecución completas) la completa el equipo.

## Rol 5 — Galería multimedia, filtros y QA (Sebastián Meneses Molina)

La pantalla principal consume `GET /api/archivos` y `DELETE /api/archivos/:id`.

| Componente | Qué hace |
|---|---|
| `src/components/Biblioteca.tsx` | Contenedor de la página. Guarda el contador de refresco y tiene el botón "Actualizar". |
| `src/components/Galeria.tsx` | Carga datos, filtros por tipo, búsqueda por título (con espera de 300 ms), paginación "Cargar más" con `nextCursor`, borrado con actualización inmediata de la lista y estados de carga, error y vacío. |
| `src/components/TarjetaArchivo.tsx` | Vista previa por tipo (imagen, `<video controls>`, enlace a PDF), título, peso, tipo, fecha, autor y borrado con confirmación. |
| `src/lib/tipos.ts`, `src/lib/formato.ts` | Tipos del lado cliente y formato de peso y fecha. |

Para refrescar la galería tras subir un archivo, el componente de subida debe llamar a `refrescar()` de `Biblioteca` cuando el `POST` responda 201.
