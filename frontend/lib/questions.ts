// Canonical 10-question list for the VertigoDx diagnostic wizard.
//
// Each question's `field` maps 1:1 to a key in the backend's PatientResponses
// schema (backend/app/schemas.py). Each option's `value` must exactly match
// the corresponding Python Enum value — the backend will reject otherwise.
//
// Labels are in Spanish (the clinical UX language). Do not translate the
// option values; those are wire-protocol constants.

export type QuestionOption = { value: string; label: string };

export type Question = {
  field: string;
  title: string;
  description?: string;
  type: "single" | "boolean";
  options?: QuestionOption[];
};

export const QUESTIONS: Question[] = [
  {
    field: "episode_duration",
    title: "¿Cuánto dura cada episodio de vértigo?",
    description: "Considere el episodio típico, no el más largo.",
    type: "single",
    options: [
      { value: "under_1min", label: "Menos de 1 minuto" },
      { value: "1_to_2min", label: "Entre 1 y 2 minutos" },
      { value: "2min_to_1h", label: "Entre 2 minutos y 1 hora" },
      { value: "1_to_24h", label: "Entre 1 y 24 horas" },
      { value: "over_24h", label: "Más de 24 horas (continuo)" },
    ],
  },
  {
    field: "trigger",
    title: "¿Qué desencadena el vértigo?",
    type: "single",
    options: [
      { value: "position_change", label: "Cambio de posición (girarse en cama, agacharse)" },
      { value: "head_movement", label: "Movimientos de cabeza" },
      { value: "spontaneous", label: "Espontáneo, sin desencadenante claro" },
      { value: "loud_sound", label: "Ruido fuerte o cambio de presión" },
    ],
  },
  {
    field: "hearing_status",
    title: "¿Hay síntomas auditivos asociados?",
    description: "Hipoacusia, tinnitus o plenitud aural.",
    type: "single",
    options: [
      { value: "fluctuating", label: "Sí, fluctuante (varía entre episodios)" },
      { value: "permanent", label: "Sí, permanente" },
      { value: "none", label: "No, sin síntomas auditivos" },
    ],
  },
  {
    field: "migraine_history",
    title: "¿Historia de migraña o cefalea con foto / fonofobia?",
    type: "single",
    options: [
      { value: "frequent", label: "Sí, frecuente (≥ 2 al mes)" },
      { value: "occasional", label: "Ocasional" },
      { value: "none", label: "No" },
    ],
  },
  {
    field: "nausea_vomiting",
    title: "¿Hubo náusea o vómito?",
    type: "single",
    options: [
      { value: "vomiting", label: "Sí, con vómito" },
      { value: "nausea_only", label: "Solo náusea" },
      { value: "none", label: "No" },
    ],
  },
  {
    field: "age_bracket",
    title: "Edad del paciente",
    type: "single",
    options: [
      { value: "under_40", label: "Menos de 40 años" },
      { value: "40_60", label: "40 – 60 años" },
      { value: "60_75", label: "60 – 75 años" },
      { value: "over_75", label: "Más de 75 años" },
    ],
  },
  {
    field: "onset",
    title: "¿Cómo fue el inicio del cuadro?",
    type: "single",
    options: [
      { value: "sudden", label: "Súbito (en menos de 1 minuto)" },
      { value: "progressive", label: "Progresivo (minutos a horas)" },
      { value: "chronic", label: "Crónico (días a semanas)" },
    ],
  },
  {
    field: "gait",
    title: "¿Puede caminar y mantenerse sentado?",
    type: "single",
    options: [
      { value: "normal", label: "Camina sin problemas" },
      { value: "unstable", label: "Marcha inestable pero camina" },
      { value: "cant_sit", label: "No puede sentarse sin caer (ataxia severa)" },
    ],
  },
  {
    field: "neuro_red_flags",
    title: "¿Hay síntomas neurológicos focales?",
    description:
      "Cefalea nueva, visión doble, debilidad en una extremidad, dificultad para hablar, asimetría facial.",
    type: "boolean",
  },
  {
    field: "cv_risk",
    title: "Factores de riesgo cardiovascular",
    description:
      "HTA, diabetes, tabaquismo, fibrilación auricular, ACV previo, dislipidemia.",
    type: "single",
    options: [
      { value: "none", label: "Ninguno conocido" },
      { value: "1_to_2", label: "1 o 2 factores" },
      { value: "3_or_more", label: "3 o más factores" },
    ],
  },
];
