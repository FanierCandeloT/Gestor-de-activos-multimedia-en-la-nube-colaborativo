"use client";

import { useState } from "react";
import Galeria from "./Galeria";
import SubidaArchivo from "./SubidaArchivo";

type Props = {
    // Por defecto usa la API real; /prueba usa una simulada.
    apiBase?: string;
};

// Contenedor de la pantalla principal. Guarda el contador que hace que la galería
// se vuelva a cargar (Punto 8: refrescar tras subir un archivo).
export default function Biblioteca({ apiBase }: Props) {
    const [refreshKey, setRefreshKey] = useState(0);
    const refrescar = () => setRefreshKey((n) => n + 1);

    return (
        <div>
            {/* Tarea A: formulario de subida. Más adelante recibirá onSubido={refrescar}
                para que la galería se recargue cuando el POST responda 201. */}
            <SubidaArchivo />

            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={refrescar}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                    Actualizar
                </button>
            </div>

            <Galeria apiBase={apiBase} refreshKey={refreshKey} />
        </div>
    );
}
