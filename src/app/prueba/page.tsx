import TarjetaArchivo from "@/components/TarjetaArchivo";
import type { Archivo } from "@/lib/tipos";

const base = {
    publicId: "x",
    mime: "x",
    fechaSubida: "2026-11-14T10:00:00.000Z",
    subidoPor: "Sebastian",
};

const datos: Archivo[] = [
    { ...base, id: "1", titulo: "Foto de prueba", tipoArchivo: "IMAGEN", tamanoBytes: 2_500_000, url: "https://picsum.photos/600/400" },
    { ...base, id: "2", titulo: "Video de prueba con un título muy largo para ver cómo se corta", tipoArchivo: "VIDEO", tamanoBytes: 1_000_000, url: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { ...base, id: "3", titulo: "Documento PDF", tipoArchivo: "PDF", tamanoBytes: 800, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
];

export default function Prueba() {
    return (
        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {datos.map((a) => (
                <TarjetaArchivo key={a.id} archivo={a} />
            ))}
        </main>
    );
}