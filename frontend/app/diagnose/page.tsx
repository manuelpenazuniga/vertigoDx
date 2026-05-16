"use client";

import { useState } from "react";
import { QuestionWizard } from "@/components/QuestionWizard";
import { ResultPanel } from "@/components/ResultPanel";
import { OfflineBadge } from "@/components/OfflineBadge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

export default function DiagnosePage() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnswer = (field: string, value: any) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (payload: any) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error en el diagnóstico");
      const data = await res.json();
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
              loading={loading}
            />
          </Card>
        </div>
      )}

      {result && <ResultPanel result={result} onRestart={reset} />}
    </main>
  );
}
