"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Info,
  ListChecks,
  RotateCcw,
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
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 border-green-300 border";
  }
  if (confidence === "media") {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-300 border";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-300 border";
}

export function ResultPanel({ result, onRestart }: Props) {
  const { stroke_alert, differential, clinical_reasoning, next_steps, limitations, processing_time_ms } = result;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">

        {/* 1. Stroke alert — conditional, visually dominant */}
        {stroke_alert.triggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950 border-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-700 dark:text-red-300 text-lg font-bold">
                🚨 ALERTA — Sospecha de causa central
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300 space-y-1 mt-2">
                <p className="font-semibold">Urgencia: {stroke_alert.urgency.toUpperCase()}</p>
                <p>{stroke_alert.reason}</p>
                {stroke_alert.score_hints != null && (
                  <p className="text-sm">Score HINTS-adaptado: {stroke_alert.score_hints}</p>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 2. Differential diagnoses card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold">Diagnóstico diferencial</h2>
          </div>
          <div className="space-y-4">
            {differential.slice(0, 3).map((candidate, i) => (
              <motion.div
                key={candidate.diagnosis}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-medium text-base">
                    {i + 1}. {candidate.diagnosis}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${confidenceBadgeClass(candidate.confidence)}`}>
                    {candidate.confidence}
                  </span>
                </div>

                {candidate.supporting_criteria.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                      ✓ Criterios cumplidos:
                    </p>
                    <ul className="space-y-0.5">
                      {candidate.supporting_criteria.map((c) => (
                        <li key={c} className="text-sm text-green-700 dark:text-green-400">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.missing_criteria.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      ✗ Criterios faltantes:
                    </p>
                    <ul className="space-y-0.5">
                      {candidate.missing_criteria.map((c) => (
                        <li key={c} className="text-sm text-amber-700 dark:text-amber-400">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.icvd_reference && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    {candidate.icvd_reference}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </Card>

        {/* 3. Clinical reasoning card */}
        <Card className="p-6 border-blue-200 bg-blue-50/30 dark:bg-blue-950/30">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold">Razonamiento clínico</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              Gemma 4 · Local
            </Badge>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {clinical_reasoning}
          </p>
        </Card>

        {/* 4. Next steps card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold">Próximos pasos</h2>
          </div>
          <ol className="space-y-3">
            {next_steps.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed pt-0.5">{step}</span>
              </motion.li>
            ))}
          </ol>
        </Card>

        {/* 5. Limitations card */}
        <Card className="p-6 bg-slate-100/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Limitaciones</h2>
          </div>
          <p className="text-sm text-muted-foreground">{limitations}</p>
        </Card>

        {/* 6. Disclaimer */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            VertigoDx es una herramienta de <strong>apoyo al diagnóstico</strong>, no un dispositivo médico aprobado. El diagnóstico definitivo y las decisiones terapéuticas son siempre responsabilidad del médico tratante.
          </AlertDescription>
        </Alert>

        {/* 7. Footer row */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {processing_time_ms != null && (
              <p className="text-xs text-muted-foreground">
                Procesado en {(processing_time_ms / 1000).toFixed(1)}s · 100% local · sin internet
              </p>
            )}
          </div>
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Nueva evaluación
          </Button>
        </div>

      </div>
    </main>
  );
}
