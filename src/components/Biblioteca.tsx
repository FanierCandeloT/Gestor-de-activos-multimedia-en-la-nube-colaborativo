"use client";

import { useState } from "react";
import Galeria from "./Galeria";

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
            {/* Cuando exista el componente de subida (Tarea A), se coloca aquí:
                <SubidaArchivo onSubido={refrescar} />
                Debe llamar a onSubido() cuando el POST responda 201. */}

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
