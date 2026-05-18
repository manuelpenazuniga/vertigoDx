"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuestionWizard } from "@/components/QuestionWizard";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ResultPanel } from "@/components/ResultPanel";
import { OfflineBadge } from "@/components/OfflineBadge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { QUESTIONS } from "@/lib/questions";
import { streamDiagnose } from "@/lib/api";
import type { DiagnosticResult } from "@/lib/types";

export default function DiagnosePage() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stagesSeen, setStagesSeen] = useState<string[]>([]);

  const handleAnswer = (field: string, value: string | boolean) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setStagesSeen([]);
    try {
      const stages: string[] = [];
      const data = await streamDiagnose(payload, (event) => {
        stages.push(event.stage);
        setStagesSeen([...stages]);
      });
      setResult(data);
    } catch {
      alert("Hubo un error al procesar el diagnóstico.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setResponses({});
    setResult(null);
    setStagesSeen([]);
  };

  if (result) {
    return (
      <>
        <OfflineBadge />
        <ResultPanel result={result} onRestart={reset} />
      </>
    );
  }

  const progressValue = (step / QUESTIONS.length) * 100;

  return (
    <main className="min-h-screen bg-background py-12">
      <OfflineBadge />

      <div className="container mx-auto max-w-2xl px-4">
        {/* Back link + page header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {Math.min(step + 1, QUESTIONS.length)}/{QUESTIONS.length}
          </span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Evaluación clínica
              </h1>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(progressValue)}%
              </span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>

          {!loading && (
            <Card className="min-h-[420px] px-6 py-6">
              <QuestionWizard
                step={step}
                responses={responses}
                onAnswer={handleAnswer}
                onComplete={handleSubmit}
                onBack={handleBack}
                loading={false}
              />
            </Card>
          )}

          {loading && (
            <Card className="min-h-[420px] px-7 py-7">
              <PipelineProgress stagesSeen={stagesSeen} loading={loading} />
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
