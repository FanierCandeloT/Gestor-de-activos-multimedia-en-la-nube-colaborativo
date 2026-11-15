"use client";

import { useEffect, useState } from "react";
import type { Archivo, RespuestaListado, TipoArchivo } from "@/lib/tipos";
import TarjetaArchivo from "./TarjetaArchivo";

type FiltroTipo = TipoArchivo | "TODOS";

const FILTROS: { valor: FiltroTipo; etiqueta: string }[] = [
    { valor: "TODOS", etiqueta: "Todos" },
    { valor: "IMAGEN", etiqueta: "Imagen" },
    { valor: "VIDEO", etiqueta: "Video" },
    { valor: "PDF", etiqueta: "PDF" },
];

// Resultado de una consulta, marcado con la "clave" de filtros que lo produjo.
type Resultado = {
    clave: string;
    items: Archivo[];
    nextCursor: string | null;
    error: string | null;
};

function construirParams(tipo: FiltroTipo, q: string): URLSearchParams {
    const params = new URLSearchParams();
    if (tipo !== "TODOS") params.set("tipo", tipo);
    if (q) params.set("q", q);
    return params;
}

async function leerError(res: Response, porDefecto: string): Promise<string> {
    const datos = await res.json().catch(() => null);
    return datos?.error ?? porDefecto;
}

// fetch lanza TypeError cuando no hay red; su mensaje viene en inglés.
function mensajeDeError(e: unknown): string {
    if (e instanceof TypeError) {
        return "No se pudo conectar con el servidor. Revisa tu conexión.";
    }
    return e instanceof Error ? e.message : "Error desconocido.";
}

type Props = {
    // Súbelo (+1) desde fuera para que la galería se vuelva a cargar,
    // por ejemplo después de subir un archivo nuevo.
    refreshKey?: number;
    // Ruta base de la API (por defecto la real; /prueba usa una simulada).
    apiBase?: string;
};

export default function Galeria({ refreshKey = 0, apiBase = "/api/archivos" }: Props) {
    const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
    const [texto, setTexto] = useState(""); // lo que escribe el usuario
    const [q, setQ] = useState(""); // texto ya estabilizado (debounce)
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [cargandoMas, setCargandoMas] = useState(false);
    const [borrandoId, setBorrandoId] = useState<string | null>(null);
    const [errorAccion, setErrorAccion] = useState<string | null>(null);

    const clave = `${tipo}|${q}|${refreshKey}`;
    // Si el último resultado no corresponde a los filtros actuales, se está cargando.
    const cargando = resultado?.clave !== clave;

    // Debounce: espera 300 ms sin teclear antes de buscar.
    useEffect(() => {
        const temporizador = setTimeout(() => setQ(texto.trim()), 300);
        return () => clearTimeout(temporizador);
    }, [texto]);

    // Primera página: se repite cuando cambia el tipo, el texto o refreshKey.
    useEffect(() => {
        let cancelado = false;

        async function cargar() {
            try {
                const res = await fetch(`${apiBase}?${construirParams(tipo, q)}`);
                if (!res.ok) {
                    throw new Error(await leerError(res, "No se pudo cargar la galería."));
                }
                const datos = (await res.json()) as RespuestaListado;
                if (!cancelado) {
                    setResultado({
                        clave,
                        items: datos.items,
                        nextCursor: datos.nextCursor,
                        error: null,
                    });
                }
            } catch (e) {
                if (!cancelado) {
                    setResultado({
                        clave,
                        items: [],
                        nextCursor: null,
                        error: mensajeDeError(e),
                    });
                }
            }
        }

        cargar();
        return () => {
            cancelado = true;
        };
    }, [tipo, q, clave, apiBase]);

    // Siguiente página: se añade al final de la lista actual.
    async function cargarMas() {
        if (!resultado?.nextCursor || cargandoMas) return;
        const claveAlPedir = clave;

        setCargandoMas(true);
        setErrorAccion(null);
        try {
            const params = construirParams(tipo, q);
            params.set("cursor", resultado.nextCursor);
            const res = await fetch(`${apiBase}?${params}`);
            if (!res.ok) {
                throw new Error(await leerError(res, "No se pudieron cargar más archivos."));
            }
            const datos = (await res.json()) as RespuestaListado;
            // Si mientras tanto cambiaron los filtros, se descarta esta respuesta.
            setResultado((prev) =>
                prev && prev.clave === claveAlPedir
                    ? {
                          ...prev,
                          items: [...prev.items, ...datos.items],
                          nextCursor: datos.nextCursor,
                      }
                    : prev,
            );
        } catch (e) {
            setErrorAccion(mensajeDeError(e));
        } finally {
            setCargandoMas(false);
        }
    }

    // Borrado: llama a la API y, si sale bien, quita la tarjeta sin recargar.
    async function eliminar(id: string) {
        setBorrandoId(id);
        setErrorAccion(null);
        try {
            const res = await fetch(`${apiBase}/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            // 404 = ya no existe: también se quita de la lista.
            if (!res.ok && res.status !== 404) {
                throw new Error(await leerError(res, "No se pudo eliminar el archivo."));
            }
            setResultado((prev) => {
                if (!prev) return prev;
                const items = prev.items.filter((a) => a.id !== id);
                // El cursor apunta a un archivo; si era este, se mueve al nuevo último.
                const nextCursor =
                    prev.nextCursor === id ? (items.at(-1)?.id ?? null) : prev.nextCursor;
                return { ...prev, items, nextCursor };
            });
        } catch (e) {
            setErrorAccion(mensajeDeError(e));
        } finally {
            setBorrandoId(null);
        }
    }

    const items = resultado?.items ?? [];
    const error = cargando ? null : (resultado?.error ?? null);
    const hayFiltros = tipo !== "TODOS" || q !== "";

    return (
        <section>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {FILTROS.map((f) => (
                        <button
                            key={f.valor}
                            type="button"
                            onClick={() => setTipo(f.valor)}
                            aria-pressed={tipo === f.valor}
                            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                                tipo === f.valor
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                            }`}
                        >
                            {f.etiqueta}
                        </button>
                    ))}
                </div>

                <input
                    type="search"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Buscar por título..."
                    aria-label="Buscar por título"
                    className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm sm:w-64 dark:border-zinc-600"
                />
            </div>

            {errorAccion && (
                <p
                    role="alert"
                    className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
                >
                    {errorAccion}
                </p>
            )}

            {cargando && <p className="p-6 text-zinc-500">Cargando archivos...</p>}

            {error && (
                <p
                    role="alert"
                    className="rounded border border-red-300 bg-red-50 p-4 text-red-700"
                >
                    {error}
                </p>
            )}

            {!cargando && !error && items.length === 0 && (
                <p className="p-6 text-zinc-500">
                    {hayFiltros
                        ? "No hay resultados para tu búsqueda."
                        : "Aún no hay archivos subidos."}
                </p>
            )}

            {!cargando && !error && items.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((a) => (
                            <TarjetaArchivo
                                key={a.id}
                                archivo={a}
                                eliminando={borrandoId === a.id}
                                onEliminar={eliminar}
                            />
                        ))}
                    </div>

                    {resultado?.nextCursor && (
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={cargarMas}
                                disabled={cargandoMas}
                                className="rounded border border-zinc-300 px-5 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                            >
                                {cargandoMas ? "Cargando..." : "Cargar más"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
