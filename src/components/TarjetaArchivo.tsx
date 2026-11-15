import type { Archivo } from "@/lib/tipos";
import { ETIQUETA_TIPO, formatearFecha, formatearPeso } from "@/lib/formato";

function VistaPrevia({ archivo }: { archivo: Archivo }) {
    if (archivo.tipoArchivo === "IMAGEN") {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={archivo.url}
                alt={archivo.titulo}
                loading="lazy"
                className="h-full w-full object-cover"
            />
        );
    }

    if (archivo.tipoArchivo === "VIDEO") {
        return (
            <video
                src={archivo.url}
                controls
                preload="metadata"
                className="h-full w-full bg-black object-contain"
            />
        );
    }

    return (
        <a
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100"
        >
            <span className="text-4xl font-bold">PDF</span>
            <span className="text-sm underline">Abrir documento</span>
        </a>
    );
}

export default function TarjetaArchivo({ archivo }: { archivo: Archivo }) {
    return (
        <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <VistaPrevia archivo={archivo} />
            </div>

            <div className="space-y-1 p-3">
                <h3 className="truncate font-medium" title={archivo.titulo}>
                    {archivo.titulo}
                </h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                        {ETIQUETA_TIPO[archivo.tipoArchivo]}
                    </span>
                    <span>{formatearPeso(archivo.tamanoBytes)}</span>
                    <span>{formatearFecha(archivo.fechaSubida)}</span>
                </div>
                <p className="text-sm text-zinc-500">Por {archivo.subidoPor}</p>
            </div>
        </article>
    );
}