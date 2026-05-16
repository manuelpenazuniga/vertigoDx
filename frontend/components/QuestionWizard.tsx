"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QUESTIONS } from "@/lib/questions";

type QuestionWizardProps = {
  step: number;
  responses: Record<string, string | boolean>;
  onAnswer: (field: string, value: string | boolean) => void;
  onComplete: (responses: Record<string, unknown>) => void;
  loading: boolean;
  onBack?: () => void;
};

export function QuestionWizard({
  step,
  responses,
  onAnswer,
  onComplete,
  loading,
  onBack,
}: QuestionWizardProps) {
  // Internal step tracking — the parent may not bump `step` on every
  // onAnswer call. When the parent starts managing step externally,
  // the useEffect below will keep this in sync.
  const [internalStep, setInternalStep] = useState(step);

  const question = QUESTIONS[internalStep];

  const [currentValue, setCurrentValue] = useState<
    string | boolean | undefined
  >(
    question
      ? (responses[question.field] as string | boolean | undefined)
      : undefined
  );

  // Sync with parent's step prop when it changes
  useEffect(() => {
    setInternalStep(step);
  }, [step]);

  // Reset currentValue when the active step changes — handles both
  // forward navigation and back-then-forward where a prior answer
  // should pre-select.
  useEffect(() => {
    const q = QUESTIONS[internalStep];
    if (q) {
      setCurrentValue(responses[q.field] as string | boolean | undefined);
    }
  }, [internalStep, responses]);

  // Loading state: full-card spinner, hiding the question UI entirely
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Analizando con Gemma 4...</p>
        <p className="text-sm text-muted-foreground text-center">
          Aplicando criterios ICVD · Calculando triaje · Generando razonamiento
        </p>
      </div>
    );
  }

  // Defensive: out-of-range step
  if (!question) return null;

  const isLastStep = internalStep === QUESTIONS.length - 1;

  function handleNext() {
    if (currentValue === undefined) return;
    const merged = { ...responses, [question.field]: currentValue };
    if (isLastStep) {
      onComplete(merged);
    } else {
      onAnswer(question.field, currentValue);
      setInternalStep((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (internalStep === 0) return;
    onBack?.();
    setInternalStep((prev) => prev - 1);
  }

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={internalStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {/* Step counter */}
          <p className="text-sm text-muted-foreground mb-1">
            Pregunta {internalStep + 1} de {QUESTIONS.length}
          </p>

          {/* Question title */}
          <h2 className="text-2xl font-semibold">{question.title}</h2>

          {/* Optional description */}
          {question.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {question.description}
            </p>
          )}

          {/* Single-select: RadioGroup */}
          {question.type === "single" && question.options && (
            <RadioGroup
              value={typeof currentValue === "string" ? currentValue : ""}
              onValueChange={(val: string) => setCurrentValue(val)}
              className="mt-6 space-y-3"
            >
              {question.options.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`${question.field}-${opt.value}`}
                  className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`${question.field}-${opt.value}`}
                  />
                  <Label
                    htmlFor={`${question.field}-${opt.value}`}
                    className="cursor-pointer flex-1"
                  >
                    {opt.label}
                  </Label>
                </label>
              ))}
            </RadioGroup>
          )}

          {/* Boolean: two large buttons */}
          {question.type === "boolean" && (
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                variant={currentValue === false ? "default" : "outline"}
                className="h-20 text-base"
                onClick={() => setCurrentValue(false)}
              >
                No
              </Button>
              <Button
                variant={currentValue === true ? "default" : "outline"}
                className="h-20 text-base"
                onClick={() => setCurrentValue(true)}
              >
                Sí
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        {internalStep > 0 ? (
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atrás
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleNext}
          disabled={currentValue === undefined}
        >
          {isLastStep ? (
            "Diagnosticar"
          ) : (
            <>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
