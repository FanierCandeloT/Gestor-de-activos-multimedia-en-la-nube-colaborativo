// SOLO PARA PRUEBAS: la misma pantalla que la principal, pero con datos simulados
// (/api/prueba/archivos) para probar filtros, paginación y borrado sin base de datos.
import Biblioteca from "@/components/Biblioteca";

export default function Prueba() {
    return (
        <main className="mx-auto max-w-6xl p-6">
            <h1 className="mb-1 text-3xl font-semibold">Cloud Media Vault</h1>
            <p className="mb-4 text-sm text-amber-600">
                Modo prueba: datos simulados en memoria (10 archivos, 4 por página).
            </p>
            <Biblioteca apiBase="/api/prueba/archivos" />
        </main>
    );
}
