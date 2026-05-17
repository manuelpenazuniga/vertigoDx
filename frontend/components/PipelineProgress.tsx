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

/** Canonical pipeline order. model_loading is optional and inserted dynamically. */
const STAGE_ORDER = ["rules", "triage", "rag", "reasoning", "complete"] as const;

/**
 * Build the display list of stages. If model_loading has been seen, splice
 * it between rag and reasoning. This way non-stroke cases show 5 rows and
 * stroke cases show 6.
 */
function buildDisplayStages(stagesSeen: string[]): string[] {
  const stages: string[] = [...STAGE_ORDER];
  if (stagesSeen.includes("model_loading")) {
    const ragIdx = stages.indexOf("rag");
    stages.splice(ragIdx + 1, 0, "model_loading");
  }
  return stages;
}

/**
 * Determine the visual state of each stage.
 *
 * DEFENSIVE ORDERING: We use the canonical display list positions rather than
 * arrival order from the network. A stage is "done" if any stage appearing
 * later in the canonical order has also been seen. This handles the (unlikely)
 * case where a slow network reorders SSE frames — e.g. rag arriving before
 * triage. The last seen stage (by canonical position) while loading=true is
 * the "active" one. Everything after it is "pending".
 */
function getStageState(
  stage: string,
  displayStages: string[],
  stagesSeen: string[],
  loading: boolean,
): "done" | "active" | "pending" {
  const stageIdx = displayStages.indexOf(stage);
  const seen = stagesSeen.includes(stage);

  if (!seen) return "pending";

  // Find the highest canonical index among all seen stages.
  let maxSeenIdx = -1;
  for (const s of stagesSeen) {
    const idx = displayStages.indexOf(s);
    if (idx > maxSeenIdx) maxSeenIdx = idx;
  }

  // If a stage later than this one has been seen, this stage is done.
  const hasLaterStageSeen = stagesSeen.some(
    (s) => displayStages.indexOf(s) > stageIdx,
  );

  if (hasLaterStageSeen) return "done";

  // This is the latest seen stage.
  if (!loading && stage === "complete") return "done";
  if (loading) return "active";

  // loading=false but not complete — edge case, treat as done.
  return "done";
}

/**
 * Get the label for a stage, with special handling for reasoning when
 * model_loading has been seen (stroke case → heavy 26B model).
 */
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
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
        Pipeline de diagnóstico
      </h3>
      <AnimatePresence mode="popLayout">
        {displayStages.map((stage) => {
          const state = getStageState(stage, displayStages, stagesSeen, loading);
          const label = getStageLabel(stage, isHeavyModel);

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-3 py-2"
            >
              {/* Icon column */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-0.5">
                {state === "done" && (
                  <motion.div
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check className="w-5 h-5 text-emerald-500" />
                  </motion.div>
                )}
                {state === "active" && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </motion.div>
                )}
                {state === "pending" && (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                )}
              </div>

              {/* Label column */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-tight ${
                    state === "done"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : state === "active"
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {label}
                  {state === "active" && "..."}
                </p>

                {/* Subline for reasoning stage when active */}
                {stage === "reasoning" && state === "active" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    Modelo: {isHeavyModel ? "gemma4:26b-a4b-it-q4_K_M" : "gemma4:e4b"} · Local
                  </motion.p>
                )}

                {/* Subline for model_loading when active */}
                {stage === "model_loading" && state === "active" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    Cargando ~17 GB en memoria · Esto puede tardar 30+ segundos
                  </motion.p>
                )}

                {/* RAG subline when done — show chunk count */}
                {stage === "rag" && state === "done" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground mt-0.5"
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
  );
}
