"use client";

import { useEffect, useRef, useState, type DragEvent, type SubmitEvent } from "react";
import { REGLAS_MIME, formatoPermitido } from "@/lib/archivos";
import { formatearPeso } from "@/lib/formato";

// Tipos que ofrece el selector de archivos: los mismos que acepta el servidor.
const ACEPTADOS = Object.keys(REGLAS_MIME).join(",");

// Validación previa en el navegador con las mismas reglas que el servidor
// (src/lib/archivos.ts). Devuelve el mensaje de error o null si es válido.
// El servidor vuelve a validar todo y además revisa la firma real del archivo.
function validarArchivo(f: File): string | null {
    const regla = REGLAS_MIME[f.type];
    if (!regla) {
        return `Tipo de archivo no permitido. Formatos válidos: ${formatoPermitido}.`;
    }
    if (f.size === 0) {
        return "El archivo está vacío.";
    }
    if (f.size > regla.maxBytes) {
        return `El archivo pesa ${formatearPeso(f.size)} y el máximo para este tipo es ${formatearPeso(regla.maxBytes)}.`;
    }
    return null;
}

// Vista previa del archivo elegido, antes de subirlo. "url" es una URL local
// (blob:) creada con URL.createObjectURL: el archivo aún no ha salido del navegador.
function VistaPreviaLocal({ archivo, url }: { archivo: File; url: string }) {
    const tipo = REGLAS_MIME[archivo.type]?.tipo;

    if (tipo === "IMAGEN") {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`Vista previa de ${archivo.name}`} className="max-h-80 w-full object-contain" />
        );
    }

    if (tipo === "VIDEO") {
        return <video src={url} controls preload="metadata" className="max-h-80 w-full bg-black" />;
    }

    // PDF: el visor del navegador dentro de un iframe, más un enlace por si
    // el navegador (p. ej. en móvil) no muestra PDF incrustados.
    return (
        <div className="flex flex-col gap-2">
            <iframe src={url} title={`Vista previa de ${archivo.name}`} className="h-80 w-full bg-white" />
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-sm text-blue-600 underline dark:text-blue-400"
            >
                Abrir el PDF en otra pestaña
            </a>
        </div>
    );
}

// Formulario de subida (Tarea A, Rol 4).
// Paso 4: vista previa del archivo elegido. Todavía no sube nada.
export default function SubidaArchivo() {
    const [subidoPor, setSubidoPor] = useState(""); // obligatorio en la API (máx. 60)
    const [nombreTocado, setNombreTocado] = useState(false); // muestra el error solo tras salir del campo
    const [titulo, setTitulo] = useState(""); // opcional (máx. 120)
    const [archivo, setArchivo] = useState<File | null>(null);
    const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
    const [arrastrando, setArrastrando] = useState(false); // resalta la zona al arrastrar encima
    const inputRef = useRef<HTMLInputElement>(null);
    const [urlPrevia, setUrlPrevia] = useState<string | null>(null);
    // Copia de la URL actual para poder liberarla al desmontar el componente.
    const urlPreviaRef = useRef<string | null>(null);

    // Cada createObjectURL reserva memoria hasta llamar a revokeObjectURL:
    // se libera la anterior antes de crear otra (o al quitar el archivo).
    function cambiarVistaPrevia(f: File | null) {
        if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current);
        const nueva = f ? URL.createObjectURL(f) : null;
        urlPreviaRef.current = nueva;
        setUrlPrevia(nueva);
    }

    // Al salir de la página se libera la última URL creada.
    useEffect(() => {
        return () => {
            if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current);
        };
    }, []);

    const nombreValido = subidoPor.trim() !== "";
    const listo = archivo !== null && nombreValido;

    function limpiarInput() {
        // Limpia el input para poder volver a elegir el mismo archivo.
        if (inputRef.current) inputRef.current.value = "";
    }

    // Punto común para el selector y para arrastrar y soltar.
    function elegirArchivo(f: File | undefined) {
        if (!f) return;
        const error = validarArchivo(f);
        if (error) {
            // Un archivo inválido no se guarda: se muestra el motivo.
            setArchivo(null);
            setErrorArchivo(error);
            cambiarVistaPrevia(null);
            limpiarInput();
            return;
        }
        setArchivo(f);
        setErrorArchivo(null);
        cambiarVistaPrevia(f);
    }

    function quitarArchivo() {
        setArchivo(null);
        setErrorArchivo(null);
        cambiarVistaPrevia(null);
        limpiarInput();
    }

    function alArrastrarEncima(e: DragEvent<HTMLLabelElement>) {
        // Sin preventDefault el navegador no permite soltar aquí.
        e.preventDefault();
        setArrastrando(true);
    }

    function alSalir(e: DragEvent<HTMLLabelElement>) {
        // Ignora el "salir" que ocurre al pasar sobre elementos hijos de la zona.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setArrastrando(false);
        }
    }

    function alSoltar(e: DragEvent<HTMLLabelElement>) {
        // Sin preventDefault el navegador abriría el archivo en la pestaña.
        e.preventDefault();
        setArrastrando(false);
        // Solo se sube un archivo a la vez: si sueltan varios, se toma el primero.
        elegirArchivo(e.dataTransfer.files[0]);
    }

    function enviar(e: SubmitEvent<HTMLFormElement>) {
        // Evita que el navegador recargue la página al enviar el formulario.
        e.preventDefault();
        setNombreTocado(true);
        if (!listo) return;
        // Paso 5: aquí se enviará el FormData a POST /api/archivos.
    }

    return (
        <section className="mb-8 rounded-lg border border-zinc-200 p-4 sm:p-6 dark:border-zinc-700">
            <h2 className="mb-4 text-xl font-semibold">Subir archivo</h2>

            <form onSubmit={enviar} className="flex flex-col gap-4">
                {/* Zona del archivo: al ser un <label>, hacer clic abre el selector del input. */}
                <label
                    onDragOver={alArrastrarEncima}
                    onDragLeave={alSalir}
                    onDrop={alSoltar}
                    className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                        arrastrando
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                            : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACEPTADOS}
                        onChange={(e) => elegirArchivo(e.target.files?.[0])}
                        className="sr-only"
                    />
                    <span className="font-medium">
                        {arrastrando ? "Suelta el archivo aquí" : "Arrastra un archivo o haz clic para elegirlo"}
                    </span>
                    <span className="text-zinc-500">{formatoPermitido}</span>
                </label>

                {errorArchivo && (
                    <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        {errorArchivo}
                    </p>
                )}

                {archivo && (
                    <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
                        {urlPrevia && (
                            <div className="bg-zinc-100 p-2 dark:bg-zinc-800">
                                <VistaPreviaLocal archivo={archivo} url={urlPrevia} />
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span className="min-w-0 truncate" title={archivo.name}>
                                {archivo.name}{" "}
                                <span className="text-zinc-500">({formatearPeso(archivo.size)})</span>
                            </span>
                            <button
                                type="button"
                                onClick={quitarArchivo}
                                className="shrink-0 rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                                Quitar
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                        <span>
                            Tu nombre <span className="text-red-600">*</span>
                        </span>
                        <input
                            type="text"
                            value={subidoPor}
                            onChange={(e) => setSubidoPor(e.target.value)}
                            onBlur={() => setNombreTocado(true)}
                            maxLength={60}
                            aria-required="true"
                            aria-invalid={nombreTocado && !nombreValido}
                            placeholder="Ej. Juan Pérez"
                            className={`rounded border bg-transparent px-3 py-2 ${
                                nombreTocado && !nombreValido
                                    ? "border-red-500"
                                    : "border-zinc-300 dark:border-zinc-600"
                            }`}
                        />
                        {/* Solo espacios en blanco también cuenta como vacío (el servidor hace trim). */}
                        {nombreTocado && !nombreValido && (
                            <span className="text-red-600">Escribe tu nombre para poder subir el archivo.</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                        <span>Título (opcional)</span>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            maxLength={120}
                            placeholder="Si lo dejas vacío se usa el nombre del archivo"
                            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
                        />
                    </label>
                </div>

                {/* Se activa solo con archivo válido y nombre. El envío real llega en el paso 5. */}
                <button
                    type="submit"
                    disabled={!listo}
                    className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Subir
                </button>
            </form>
        </section>
    );
}
