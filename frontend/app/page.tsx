import Link from "next/link";
import { OfflineBadge } from "@/components/OfflineBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, Stethoscope, Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-16 max-w-4xl flex flex-col items-center">
        <OfflineBadge />
        
        <div className="text-center space-y-6 mb-16 mt-8">
          <h1 className="text-5xl font-bold">VertigoDx</h1>
          <p className="text-xl text-muted-foreground">
            Razonamiento de subespecialista en otoneurología. Donde sea. Sin conexión.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/demo" className={buttonVariants({ size: "lg" })}>
            Ver casos demo
          </Link>
          <Link href="/diagnose" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Iniciar evaluación
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-8">
          <Card>
            <CardHeader>
              <WifiOff className="w-8 h-8 mb-2" />
              <CardTitle>100% Local</CardTitle>
            </CardHeader>
            <CardContent>
              Funciona sin internet. Los datos del paciente nunca salen del dispositivo.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Stethoscope className="w-8 h-8 mb-2" />
              <CardTitle>Basado en ICVD</CardTitle>
            </CardHeader>
            <CardContent>
              Criterios oficiales de la Bárány Society y algoritmos HINTS / STANDING.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="w-8 h-8 mb-2" />
              <CardTitle>Gemma 4 + Ollama</CardTitle>
            </CardHeader>
            <CardContent>
              Razonamiento en español por LLM open-weight, ejecutado localmente.
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground border-t pt-6 mt-12 w-full">
          <p>
            <strong>Hackathon MVP</strong> · Apoyo al diagnóstico, no diagnóstico definitivo ·{" "}
            <a
              href="https://github.com/manuelpenazuniga/vertigoDx"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver código en GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
