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

const ENDPOINT = "/api/archivos";

type Respuesta = { status: number; cuerpo: unknown };

// Envía el FormData con XMLHttpRequest en vez de fetch, porque fetch no informa
// del progreso de subida y XMLHttpRequest sí (xhr.upload.onprogress).
function subirConProgreso(datos: FormData, alProgresar: (porcentaje: number) => void): Promise<Respuesta> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", ENDPOINT);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) alProgresar(Math.round((e.loaded / e.total) * 100));
        };

        // onload se dispara con cualquier respuesta del servidor, también 4xx y 5xx.
        xhr.onload = () => {
            let cuerpo: unknown = null;
            try {
                cuerpo = JSON.parse(xhr.responseText);
            } catch {
                // Respuesta que no es JSON: se trata como error genérico más abajo.
            }
            resolve({ status: xhr.status, cuerpo });
        };

        // onerror solo ocurre si no hubo respuesta (sin red, servidor apagado...).
        xhr.onerror = () => reject(new Error("No se pudo conectar con el servidor. Revisa tu conexión."));

        xhr.send(datos);
    });
}

// Saca el mensaje { error } que devuelve la API, o uno genérico según el código.
function mensajeDeError({ status, cuerpo }: Respuesta): string {
    if (cuerpo && typeof cuerpo === "object" && "error" in cuerpo && typeof cuerpo.error === "string") {
        return cuerpo.error;
    }
    return `No se pudo subir el archivo (error ${status}).`;
}

type Estado =
    | { tipo: "inactivo" }
    | { tipo: "subiendo"; progreso: number }
    | { tipo: "exito"; mensaje: string }
    | { tipo: "error"; mensaje: string };

type Props = {
    // Se llama cuando el servidor confirma la subida (201), para que la galería se recargue.
    onSubido?: () => void;
};

// Formulario de subida (Tarea A, Rol 4): selección o arrastrar y soltar, validación previa,
// vista previa y envío a POST /api/archivos con barra de progreso y mensajes de éxito o error.
export default function SubidaArchivo({ onSubido }: Props) {
    const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });
    const subiendo = estado.tipo === "subiendo";
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
        // Al elegir otro archivo se oculta el mensaje de la subida anterior.
        setEstado({ tipo: "inactivo" });
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
        if (subiendo) return; // no cambiar el archivo a mitad de una subida
        // Solo se sube un archivo a la vez: si sueltan varios, se toma el primero.
        elegirArchivo(e.dataTransfer.files[0]);
    }

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        // Evita que el navegador recargue la página al enviar el formulario.
        e.preventDefault();
        setNombreTocado(true);
        if (!listo || subiendo) return;

        // Mismos nombres de campo que espera POST /api/archivos.
        const datos = new FormData();
        datos.append("archivo", archivo);
        datos.append("subidoPor", subidoPor.trim());
        datos.append("titulo", titulo.trim());

        setEstado({ tipo: "subiendo", progreso: 0 });
        try {
            const respuesta = await subirConProgreso(datos, (progreso) =>
                setEstado({ tipo: "subiendo", progreso }),
            );

            if (respuesta.status !== 201) {
                setEstado({ tipo: "error", mensaje: mensajeDeError(respuesta) });
                return;
            }

            const registro = respuesta.cuerpo as { titulo?: string } | null;
            setEstado({
                tipo: "exito",
                mensaje: `"${registro?.titulo ?? archivo.name}" se subió correctamente.`,
            });
            // Se limpia el formulario para la siguiente subida; el nombre se conserva.
            setTitulo("");
            quitarArchivo();
            onSubido?.(); // la galería vuelve a pedir GET /api/archivos
        } catch (error) {
            setEstado({
                tipo: "error",
                mensaje: error instanceof Error ? error.message : "Error desconocido.",
            });
        }
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
                    className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                        subiendo
                            ? "cursor-not-allowed border-zinc-300 opacity-50 dark:border-zinc-600"
                            : arrastrando
                              ? "cursor-pointer border-blue-600 bg-blue-50 dark:bg-blue-950"
                              : "cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        disabled={subiendo}
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
                            {/* wrap-anywhere parte nombres largos sin espacios; con truncate
                                (una sola línea) el móvil ensanchaba la página. */}
                            <span className="min-w-0 wrap-anywhere" title={archivo.name}>
                                {archivo.name}{" "}
                                <span className="text-zinc-500">({formatearPeso(archivo.size)})</span>
                            </span>
                            <button
                                type="button"
                                onClick={quitarArchivo}
                                disabled={subiendo}
                                className="shrink-0 rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
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
                            disabled={subiendo}
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
                            disabled={subiendo}
                            maxLength={120}
                            placeholder="Si lo dejas vacío se usa el nombre del archivo"
                            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
                        />
                    </label>
                </div>

                {/* Barra de progreso: llega a 100 % cuando el navegador terminó de enviar;
                    luego el servidor aún sube a la nube y guarda en la BD. */}
                {estado.tipo === "subiendo" && (
                    <div className="flex flex-col gap-1 text-sm" aria-live="polite">
                        <div className="flex justify-between">
                            <span>{estado.progreso < 100 ? "Subiendo..." : "Guardando en la nube..."}</span>
                            <span>{estado.progreso} %</span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Progreso de la subida"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={estado.progreso}
                            className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                        >
                            <div
                                className={`h-full bg-blue-600 transition-[width] ${estado.progreso === 100 ? "animate-pulse" : ""}`}
                                style={{ width: `${estado.progreso}%` }}
                            />
                        </div>
                    </div>
                )}

                {estado.tipo === "exito" && (
                    <p role="status" className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        {estado.mensaje}
                    </p>
                )}

                {estado.tipo === "error" && (
                    <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        {estado.mensaje}
                    </p>
                )}

                {/* Se activa solo con archivo válido y nombre, y no mientras se sube. */}
                <button
                    type="submit"
                    disabled={!listo || subiendo}
                    className="inline-flex items-center gap-2 self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {subiendo && (
                        <span
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                        />
                    )}
                    {subiendo ? "Subiendo..." : "Subir"}
                </button>
            </form>
        </section>
    );
}
