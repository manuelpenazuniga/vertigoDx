import Link from "next/link";
import { OfflineBadge } from "@/components/OfflineBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  CpuIcon,
  Activity,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "100% local, privacy-first",
    body: "Sin internet, sin cloud, sin API keys. Los datos del paciente nunca salen del dispositivo del clínico.",
  },
  {
    icon: Stethoscope,
    title: "Criterios ICVD + HINTS",
    body: "Razonamiento alineado con la Bárány Society, algoritmos HINTS, STANDING y Sudbury para triaje de stroke.",
  },
  {
    icon: CpuIcon,
    title: "Gemma 4 + Ollama",
    body: "LLM open-weight de Google ejecutándose sobre Ollama. Razonamiento en español, latencia local.",
  },
] as const;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle clinical grid background, faded to the edges */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid-clinical mask-fade-edges"
        aria-hidden
      />

      <OfflineBadge />

      <div className="relative mx-auto flex max-w-5xl flex-col px-6 pt-20 pb-24 sm:pt-28">

        {/* Eyebrow badge */}
        <div className="mb-8 flex justify-center">
          <Badge
            variant="outline"
            className="gap-2 rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium tracking-wide uppercase">
              Clinical Decision Support · MVP
            </span>
          </Badge>
        </div>

        {/* Hero headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Razonamiento de subespecialista en{" "}
            <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              otoneurología
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            VertigoDx lleva la lógica diagnóstica de los criterios ICVD y los
            algoritmos HINTS / STANDING a la atención primaria.{" "}
            <span className="font-medium text-foreground">
              Donde sea. Sin conexión.
            </span>
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/demo"
            className={buttonVariants({ size: "lg", className: "group h-11 px-6 text-base shadow-sm" })}
          >
            Ver casos demo
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/diagnose"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-11 px-6 text-base",
            })}
          >
            Iniciar evaluación clínica
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Activity className="size-3.5 text-accent" />
            Gemma 4 · 26B-A4B
          </span>
          <span className="hidden sm:inline">·</span>
          <span>4 patologías vestibulares en alcance</span>
          <span className="hidden sm:inline">·</span>
          <span>HINTS · STANDING · Sudbury</span>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="group/feature gap-3 px-5 py-5 ring-1 ring-border/60 transition-all hover:ring-primary/30 hover:shadow-[0_8px_30px_-12px_oklch(0.555_0.115_220_/_0.20)]"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-border/60 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
            <p>
              <span className="font-medium text-foreground">Hackathon MVP</span>{" "}
              · Herramienta de apoyo al diagnóstico · No reemplaza juicio clínico
            </p>
            <a
              href="https://github.com/manuelpenazuniga/vertigoDx"
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver código en GitHub
              <ArrowRight className="size-3" />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
