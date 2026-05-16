import Link from "next/link";
import { OfflineBadge } from "@/components/OfflineBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, Stethoscope, Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center text-center space-y-12">
      <OfflineBadge />
      
      <div className="space-y-6 mt-16">
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

      <footer className="mt-auto pt-16 pb-8 text-sm text-muted-foreground">
        Hackathon MVP — Apoyo al diagnóstico, no diagnóstico definitivo.
      </footer>
    </main>
  );
}
