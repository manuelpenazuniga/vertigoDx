"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Check,
  CircleAlert,
  Info,
  ListChecks,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Confidence, DiagnosticResult } from "@/lib/types";

type Props = {
  result: DiagnosticResult;
  onRestart: () => void;
};

function confidenceBadgeClass(confidence: Confidence): string {
  if (confidence === "alta") {
    return "border border-accent/30 bg-accent/10 text-accent dark:bg-accent/15";
  }
  if (confidence === "media") {
    return "border border-amber-300/50 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/50 dark:text-amber-200";
  }
  return "border border-border bg-muted text-muted-foreground";
}

function confidenceLabel(confidence: Confidence): string {
  if (confidence === "alta") return "Confianza alta";
  if (confidence === "media") return "Confianza media";
  return "Confianza baja";
}

export function ResultPanel({ result, onRestart }: Props) {
  const {
    stroke_alert,
    differential,
    clinical_reasoning,
    next_steps,
    limitations,
    processing_time_ms,
  } = result;

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-3xl space-y-5 px-4">

        {/* 1. Stroke alert — conditional, visually dominant */}
        {stroke_alert.triggered && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Alert className="border-l-4 border-destructive/70 bg-destructive/5 ring-1 ring-destructive/15">
              <AlertTriangle className="size-5 text-destructive" strokeWidth={2} />
              <AlertTitle className="font-heading text-base font-semibold text-destructive">
                Alerta — Sospecha de causa central
              </AlertTitle>
              <AlertDescription className="mt-1 space-y-2 text-sm text-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-destructive/30 bg-destructive/10 font-semibold uppercase tracking-wide text-destructive"
                  >
                    Urgencia {stroke_alert.urgency}
                  </Badge>
                  {stroke_alert.score_hints != null && (
                    <Badge variant="outline" className="tabular-nums font-mono">
                      HINTS-adaptado: {stroke_alert.score_hints}
                    </Badge>
                  )}
                </div>
                <p className="leading-relaxed text-foreground/90">
                  {stroke_alert.reason}
                </p>
                {result.consensus_paths != null && result.consensus_paths > 1 && (
                  <div className="mt-2 border-t border-destructive/20 pt-2 text-xs text-foreground/80">
                    {result.consensus_agreement_ratio === 1 ? (
                      <>
                        <span className="font-semibold text-foreground">
                          Consenso clínico:
                        </span>{" "}
                        {result.consensus_paths}/{result.consensus_paths} caminos del modelo coinciden en derivación urgente (Self-Consistency, Wang et al. 2023).
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">
                          Consenso parcial:
                        </span>{" "}
                        {Math.round(
                          (result.consensus_agreement_ratio ?? 0) *
                            result.consensus_paths
                        )}
                        /{result.consensus_paths} caminos coinciden — se recomienda evaluación presencial adicional.
                      </>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 2. Differential diagnoses card */}
        <Card className="px-6 py-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/8 text-primary ring-1 ring-primary/15">
              <Brain className="size-4" strokeWidth={1.75} />
            </div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Diagnóstico diferencial
            </h2>
          </div>
          <div className="space-y-3">
            {differential.slice(0, 3).map((candidate, i) => (
              <motion.div
                key={candidate.diagnosis}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.25 }}
                className="rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-heading text-base font-semibold leading-tight text-foreground">
                      {candidate.diagnosis}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceBadgeClass(candidate.confidence)}`}
                  >
                    {confidenceLabel(candidate.confidence)}
                  </span>
                </div>

                {candidate.supporting_criteria.length > 0 && (
                  <div className="mb-2.5">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                      <Check className="size-3" strokeWidth={2.5} />
                      Criterios cumplidos
                    </p>
                    <ul className="space-y-1 pl-4">
                      {candidate.supporting_criteria.map((c) => (
                        <li
                          key={c}
                          className="text-sm leading-relaxed text-foreground/85"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.missing_criteria.length > 0 && (
                  <div className="mb-1">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <X className="size-3" strokeWidth={2.5} />
                      Criterios faltantes
                    </p>
                    <ul className="space-y-1 pl-4">
                      {candidate.missing_criteria.map((c) => (
                        <li
                          key={c}
                          className="text-sm leading-relaxed text-muted-foreground"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.icvd_reference && (
                  <p className="mt-2.5 text-xs italic text-muted-foreground">
                    {candidate.icvd_reference}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </Card>

        {/* 3. Clinical reasoning card */}
        <Card className="border-primary/15 bg-primary/[0.025] px-6 py-5 dark:bg-primary/[0.04]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
                <Sparkles className="size-4" strokeWidth={1.75} />
              </div>
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Razonamiento clínico
              </h2>
            </div>
            <Badge
              variant="outline"
              className="border-primary/20 bg-card font-mono text-[10px] tracking-wider uppercase text-primary"
            >
              Gemma 4 · Local
            </Badge>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {clinical_reasoning}
          </p>
        </Card>

        {/* 4. Next steps card */}
        <Card className="px-6 py-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/15">
              <ListChecks className="size-4" strokeWidth={1.75} />
            </div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Próximos pasos
            </h2>
          </div>
          <ol className="space-y-3">
            {next_steps.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
                className="flex items-start gap-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary tabular-nums ring-1 ring-primary/20">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm leading-relaxed text-foreground/90">
                  {step}
                </span>
              </motion.li>
            ))}
          </ol>
        </Card>

        {/* 5. Limitations card */}
        <Card className="bg-muted/40 px-6 py-5 ring-border/40">
          <div className="mb-2.5 flex items-center gap-2">
            <CircleAlert className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Limitaciones
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {limitations}
          </p>
        </Card>

        {/* 6. Disclaimer */}
        <Alert className="border-border/60 bg-card">
          <Info className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
            VertigoDx es una herramienta de{" "}
            <strong className="text-foreground">apoyo al diagnóstico</strong>, no un dispositivo médico aprobado. El diagnóstico definitivo y las decisiones terapéuticas son siempre responsabilidad del médico tratante.
          </AlertDescription>
        </Alert>

        {/* 7. Footer row */}
        <div className="flex flex-col items-start justify-between gap-4 pt-2 sm:flex-row sm:items-end">
          <div className="space-y-1 text-xs text-muted-foreground">
            {processing_time_ms != null && (
              <p className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-accent" />
                Procesado en{" "}
                <span className="tabular-nums font-mono text-foreground/80">
                  {(processing_time_ms / 1000).toFixed(1)}s
                </span>{" "}
                · 100% local · sin internet
              </p>
            )}
            {(result.model_used || result.generated_at || result.corpus_version) && (
              <p className="font-mono text-[10px] leading-tight opacity-70 tabular-nums">
                {result.model_used && <>Modelo: {result.model_used}</>}
                {result.model_used && result.generated_at && <> · </>}
                {result.generated_at && <>Generado: {result.generated_at}</>}
                {(result.model_used || result.generated_at) && result.corpus_version && <> · </>}
                {result.corpus_version && <>Corpus: {result.corpus_version}</>}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw className="mr-2 size-4" />
            Nueva evaluación
          </Button>
        </div>

      </div>
    </main>
  );
}
