"use client";
import TarjetaArchivo from "./TarjetaArchivo";
import { useEffect, useState } from "react";
import type { Archivo, RespuestaListado } from "@/lib/tipos";


export default function Galeria() {
    const [items, setItems] = useState<Archivo[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        async function cargar() {
            try {
                const res = await fetch("/api/archivos");
                const datos = await res.json();
                if (!res.ok) {
                    throw new Error(datos.error ?? "No se pudo cargar la galería.");
                }
                if (!cancelado) setItems((datos as RespuestaListado).items);
            } catch (e) {
                if (!cancelado) {
                    setError(e instanceof Error ? e.message : "Error desconocido.");
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        }

        cargar();
        return () => {
            cancelado = true;
        };
    }, []);

    if (cargando) {
        return <p className="p-6 text-zinc-500">Cargando archivos...</p>;
    }

    if (error) {
        return (
            <p className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
                {error}
            </p>
        );
    }

    if (items.length === 0) {
        return <p className="p-6 text-zinc-500">Aún no hay archivos subidos.</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
                <TarjetaArchivo key={a.id} archivo={a} />
            ))}
        </div>
    );
}