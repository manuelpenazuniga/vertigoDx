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
  const [internalStep, setInternalStep] = useState(step);

  const question = QUESTIONS[internalStep];

  const [currentValue, setCurrentValue] = useState<
    string | boolean | undefined
  >(
    question
      ? (responses[question.field] as string | boolean | undefined)
      : undefined
  );

  useEffect(() => {
    setInternalStep(step);
  }, [step]);

  useEffect(() => {
    const q = QUESTIONS[internalStep];
    if (q) {
      setCurrentValue(responses[q.field] as string | boolean | undefined);
    }
  }, [internalStep, responses]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={1.75} />
        <p className="font-heading text-lg font-medium">Analizando con Gemma 4</p>
        <p className="text-center text-sm text-muted-foreground">
          Aplicando criterios ICVD · Calculando triaje · Generando razonamiento
        </p>
      </div>
    );
  }

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
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={internalStep}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1"
        >
          {/* Step counter */}
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pregunta {internalStep + 1} <span className="opacity-60">de</span>{" "}
            {QUESTIONS.length}
          </p>

          {/* Question title */}
          <h2 className="mt-2 font-heading text-2xl font-semibold leading-snug tracking-tight text-foreground">
            {question.title}
          </h2>

          {/* Optional description */}
          {question.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {question.description}
            </p>
          )}

          {/* Single-select: RadioGroup */}
          {question.type === "single" && question.options && (
            <RadioGroup
              value={typeof currentValue === "string" ? currentValue : ""}
              onValueChange={(val: string) => setCurrentValue(val)}
              className="mt-6 space-y-2.5"
            >
              {question.options.map((opt) => {
                const isSelected = currentValue === opt.value;
                return (
                  <label
                    key={opt.value}
                    htmlFor={`${question.field}-${opt.value}`}
                    data-state={isSelected ? "checked" : "unchecked"}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 transition-all
                      border-border bg-card
                      hover:border-primary/40 hover:bg-primary/5
                      data-[state=checked]:border-primary data-[state=checked]:bg-primary/8 data-[state=checked]:ring-2 data-[state=checked]:ring-primary/15
                      has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40"
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`${question.field}-${opt.value}`}
                    />
                    <Label
                      htmlFor={`${question.field}-${opt.value}`}
                      className="flex-1 cursor-pointer text-sm font-normal leading-relaxed text-foreground group-data-[state=checked]:font-medium"
                    >
                      {opt.label}
                    </Label>
                  </label>
                );
              })}
            </RadioGroup>
          )}

          {/* Boolean: two large buttons */}
          {question.type === "boolean" && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant={currentValue === false ? "default" : "outline"}
                className="h-20 text-base font-medium"
                onClick={() => setCurrentValue(false)}
              >
                No
              </Button>
              <Button
                variant={currentValue === true ? "default" : "outline"}
                className="h-20 text-base font-medium"
                onClick={() => setCurrentValue(true)}
              >
                Sí
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
        {internalStep > 0 ? (
          <Button variant="ghost" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 size-4" />
            Atrás
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleNext}
          disabled={currentValue === undefined}
          className="px-5"
        >
          {isLastStep ? (
            "Diagnosticar"
          ) : (
            <>
              Siguiente
              <ChevronRight className="ml-1 size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
