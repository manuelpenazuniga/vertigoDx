"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { OfflineBadge } from "@/components/OfflineBadge";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ResultPanel } from "@/components/ResultPanel";
import { fetchDemoCases, streamDiagnose } from "@/lib/api";
import type { DemoCase, DiagnosticResult } from "@/lib/types";

export default function DemoPage() {
  const [cases, setCases] = useState<DemoCase[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [selectedCase, setSelectedCase] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [stagesSeen, setStagesSeen] = useState<string[]>([]);

  useEffect(() => {
    fetchDemoCases()
      .then((data) => setCases(data))
      .catch((err) => {
        console.error("Failed to load demo cases:", err);
      });
  }, []);

  async function runCase(c: DemoCase) {
    setLoading(true);
    setSelectedCase(c);
    setStagesSeen([]);
    try {
      const stages: string[] = [];
      const data = await streamDiagnose(c.responses, (event) => {
        stages.push(event.stage);
        setStagesSeen([...stages]);
      });
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Error al procesar el caso. Verifica que el backend esté corriendo.");
      setSelectedCase(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSelectedCase(null);
    setStagesSeen([]);
  }

  if (result && selectedCase) {
    return (
      <>
        <OfflineBadge />
        <div className="border-b border-border/60 bg-secondary/40 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              Caso demo
            </Badge>
            <span className="font-medium text-foreground">{selectedCase.label}</span>
            <span className="hidden text-muted-foreground sm:inline">·</span>
            <span className="hidden truncate text-muted-foreground sm:inline">
              {selectedCase.narrative}
            </span>
          </div>
        </div>
        <ResultPanel result={result} onRestart={reset} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <OfflineBadge />
      <div className="container mx-auto max-w-3xl space-y-6 px-4">

        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </div>

        <div className="space-y-3">
          <h1 className="font-heading text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Casos clínicos guionizados
          </h1>
          <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Cinco escenarios que cubren el rango diagnóstico del MVP
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Casos diseñados con el equipo de otoneurología: BPPV, Ménière, migraña vestibular,
            sospecha de stroke y comorbilidad. Cada uno demuestra una capacidad distinta del
            pipeline clínico.
          </p>
        </div>

        {loading && (
          <Card className="px-7 py-7">
            <PipelineProgress stagesSeen={stagesSeen} loading={loading} />
          </Card>
        )}

        {!loading && (
          <div className="space-y-3 pt-2">
            {cases.map((c, idx) => (
              <Card
                key={c.id}
                className="group/case px-5 py-5 transition-all hover:ring-primary/30 hover:shadow-[0_8px_30px_-12px_oklch(0.555_0.115_220_/_0.18)]"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex flex-1 gap-4">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground/70 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-semibold leading-tight text-foreground">
                          {c.label}
                        </h3>
                        {c.expected_stroke_alert && (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 font-medium text-destructive"
                          >
                            <AlertTriangle className="mr-1 size-3" strokeWidth={2.5} />
                            Alerta de causa central
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {c.narrative}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => runCase(c)}
                    disabled={loading}
                    className="shrink-0"
                  >
                    <PlayCircle className="mr-1.5 size-4" strokeWidth={1.75} />
                    Ejecutar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-6 text-center">
          <Link href="/diagnose">
            <Button variant="outline">
              O ingresa un caso nuevo manualmente
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
