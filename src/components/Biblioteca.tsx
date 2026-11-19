"use client";

import { useState } from "react";
import Galeria from "./Galeria";
import SubidaArchivo from "./SubidaArchivo";

// Contenedor de la pantalla principal. Guarda el contador que hace que la galería
// se vuelva a cargar (refrescar tras subir un archivo).
export default function Biblioteca() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refrescar = () => setRefreshKey((n) => n + 1);

    return (
        <div>
            {/* Formulario de subida. Al responder 201 llama a refrescar() y la
                galería se recarga sola. */}
            <SubidaArchivo onSubido={refrescar} />

            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={refrescar}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                    Actualizar
                </button>
            </div>

            <Galeria refreshKey={refreshKey} />
        </div>
    );
}
