"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

type Props = {
  /** Stages seen so far, in arrival order. Pass the names emitted by the backend. */
  stagesSeen: string[];
  /** True if the request is still in flight. */
  loading: boolean;
};

const STAGE_LABELS: Record<string, string> = {
  rules: "Reglas ICVD aplicadas",
  triage: "Triaje de causa central calculado",
  rag: "Criterios ICVD recuperados",
  model_loading: "Cargando modelo pesado (alta criticidad)",
  reasoning: "Gemma 4 razonando",
  complete: "Diagnóstico listo",
};

const STAGE_ORDER = ["rules", "triage", "rag", "reasoning", "complete"] as const;

function buildDisplayStages(stagesSeen: string[]): string[] {
  const stages: string[] = [...STAGE_ORDER];
  if (stagesSeen.includes("model_loading")) {
    const ragIdx = stages.indexOf("rag");
    stages.splice(ragIdx + 1, 0, "model_loading");
  }
  return stages;
}

function getStageState(
  stage: string,
  displayStages: string[],
  stagesSeen: string[],
  loading: boolean,
): "done" | "active" | "pending" {
  const stageIdx = displayStages.indexOf(stage);
  const seen = stagesSeen.includes(stage);

  if (!seen) return "pending";

  const hasLaterStageSeen = stagesSeen.some(
    (s) => displayStages.indexOf(s) > stageIdx,
  );

  if (hasLaterStageSeen) return "done";

  if (!loading && stage === "complete") return "done";
  if (loading) return "active";

  return "done";
}

function getStageLabel(stage: string, isHeavyModel: boolean): string {
  if (stage === "reasoning" && isHeavyModel) {
    return "Gemma 4 (26B) razonando — caso de alta criticidad";
  }
  return STAGE_LABELS[stage] ?? stage;
}

export function PipelineProgress({ stagesSeen, loading }: Props) {
  const displayStages = buildDisplayStages(stagesSeen);
  const isHeavyModel = stagesSeen.includes("model_loading");

  return (
    <div>
      <h3 className="mb-5 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Pipeline de diagnóstico
      </h3>
      <div className="relative space-y-0">
        {/* Vertical connector line behind icons */}
        <div
          className="absolute left-3 top-3 bottom-3 w-px bg-border/60"
          aria-hidden
        />

        <AnimatePresence mode="popLayout">
          {displayStages.map((stage) => {
            const state = getStageState(stage, displayStages, stagesSeen, loading);
            const label = getStageLabel(stage, isHeavyModel);

            return (
              <motion.div
                key={stage}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
                className="relative flex items-start gap-3 py-2.5"
              >
                {/* Icon column with background to mask the connector line */}
                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border/60">
                  {state === "done" && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      className="flex size-full items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30"
                    >
                      <Check className="size-3 text-accent" strokeWidth={3} />
                    </motion.div>
                  )}
                  {state === "active" && (
                    <div className="flex size-full items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
                      <Loader2 className="size-3 animate-spin text-primary" strokeWidth={2.5} />
                    </div>
                  )}
                  {state === "pending" && (
                    <div className="size-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>

                {/* Label column */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium leading-tight transition-colors ${
                      state === "done"
                        ? "text-foreground"
                        : state === "active"
                          ? "text-primary"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {label}
                    {state === "active" && (
                      <span className="ml-0.5 inline-block animate-pulse">…</span>
                    )}
                  </p>

                  {stage === "reasoning" && state === "active" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums"
                    >
                      Modelo: {isHeavyModel ? "gemma4:26b-a4b-it-q4_K_M" : "gemma4:e4b"} · Local
                    </motion.p>
                  )}

                  {stage === "model_loading" && state === "active" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-0.5 text-[11px] text-muted-foreground"
                    >
                      Cargando ~17 GB en memoria · Esto puede tardar 30+ segundos
                    </motion.p>
                  )}

                  {stage === "rag" && state === "done" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-0.5 text-[11px] text-muted-foreground"
                    >
                      3 criterios ICVD recuperados
                    </motion.p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
