"use client";

import { useState } from "react";
import { QuestionWizard } from "@/components/QuestionWizard";
import { ResultPanel } from "@/components/ResultPanel";
import { OfflineBadge } from "@/components/OfflineBadge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { postDiagnose } from "@/lib/api";
import type { DiagnosticResult } from "@/lib/types";

export default function DiagnosePage() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnswer = (field: string, value: string | boolean) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const data = await postDiagnose(payload);
      setResult(data);
    } catch (error) {
      alert("Hubo un error al procesar el diagnóstico.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setResponses({});
    setResult(null);
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto flex flex-col space-y-8">
      <OfflineBadge />
      
      {!result && (
        <div className="space-y-4 mt-8">
          <Progress value={(step / 10) * 100} />
          <Card className="p-6 min-h-[400px]">
            <QuestionWizard
              step={step}
              responses={responses}
              onAnswer={handleAnswer}
              onComplete={() => handleSubmit(responses)}
              onBack={handleBack}
              loading={loading}
            />
          </Card>
        </div>
      )}

      {result && <ResultPanel result={result} onRestart={reset} />}
    </main>
  );
}
