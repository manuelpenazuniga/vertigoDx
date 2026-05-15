# Corpus ICVD para RAG — VertigoDx

Extractos clave de criterios ICVD de la Bárány Society y algoritmos de triaje
validados, formateados para retrieval semántico. Cada sección es un chunk
independiente delimitado por `## `.

---

## BPPV del canal posterior

Criterios ICVD de la Bárány Society 2015 para Vértigo Posicional Paroxístico
Benigno del canal posterior — diagnóstico Definido (todos):

- A. Episodios recurrentes de vértigo posicional, provocados al acostarse o
  girar en cama en posición supina.
- B. Duración del vértigo posicional menor a 1 minuto.
- C. Nistagmo posicional torsional-vertical hacia arriba (geotrópico hacia el
  oído afectado), con latencia 1-2 segundos, evocado por la maniobra de
  Dix-Hallpike.
- D. No atribuible a otra enfermedad.

Tratamiento: maniobra de Epley o maniobra de Semont. Tasa de éxito 80-95% en
1-3 sesiones. NO requiere medicación antivertiginosa crónica.

---

## Enfermedad de Ménière

Criterios ICVD de la Bárány Society 2015 para Enfermedad de Ménière Definida
(todos):

- A. Dos o más episodios espontáneos de vértigo, cada uno con duración
  20 minutos – 12 horas.
- B. Hipoacusia neurosensorial de baja-media frecuencia documentada
  audiométricamente en el oído afectado en al menos una ocasión antes, durante
  o después de un episodio de vértigo.
- C. Síntomas auditivos fluctuantes (hipoacusia, tinnitus o plenitud aural)
  en el oído afectado.
- D. No mejor explicado por otro diagnóstico vestibular.

Comorbilidad: aproximadamente 30% de pacientes con Enfermedad de Ménière
también cumplen criterios de Migraña Vestibular. La codificación dual está
explícitamente permitida.

---

## Migraña Vestibular

Criterios ICVD Bárány / IHS 2012 para Migraña Vestibular Definida (todos):

- A. Al menos 5 episodios de síntomas vestibulares moderados-severos, con
  duración 5 minutos – 72 horas.
- B. Historia actual o pasada de migraña con o sin aura según ICHD.
- C. Al menos una característica migrañosa en ≥ 50% de los episodios
  vestibulares:
    - cefalea con ≥ 2 de: localización unilateral, calidad pulsátil,
      intensidad moderada o severa, agravamiento con actividad física rutinaria;
    - fotofobia y fonofobia;
    - aura visual.
- D. No mejor explicado por otro diagnóstico vestibular ni ICHD.

---

## Algoritmo HINTS+

Algoritmo bedside descrito por Kattah et al. (Stroke 2009), aplicable
exclusivamente en Síndrome Vestibular Agudo (vértigo continuo > 24 horas con
nistagmo).

- HI · Head Impulse Test — NORMAL en stroke central; ANORMAL en neuritis
  vestibular periférica.
- N  · Nystagmus — dirección cambiante con la mirada → patrón CENTRAL.
- TS · Test of Skew — desviación vertical presente → patrón CENTRAL.
- +  · Hipoacusia súbita unilateral → infarto AICA hasta demostrar lo contrario.

Sensibilidad para stroke vestibular: 96-100%. Especificidad: 96%. SUPERIOR a
MRI temprana (MRI con DWI tiene solo 47% de sensibilidad en las primeras
24-48 horas para infartos pequeños de fosa posterior).

Limitación crítica: requiere ejecución por profesional entrenado. Falsos
negativos son frecuentes cuando lo realiza un médico no familiarizado.

---

## STANDING

Algoritmo de 4 pasos para servicio de urgencia, validado por Vanni et al.
(Acad Emerg Med 2014) en 1.517 pacientes con dizziness agudo:

1. Diferenciar nistagmo central (multidireccional, vertical puro o torsional)
   de periférico.
2. En vértigo posicional: aplicar Dix-Hallpike.
3. En síndrome vestibular agudo: aplicar HINTS.
4. Evaluar marcha (ataxia troncal).

Sensibilidad 95%, especificidad 87% para causa central. La variante STANDING-M
(Ronchetti 2025) reduce TC innecesario del 67% al 48% y estancia hospitalaria
de 339 a 271 minutos. Funciona incluso sin nistagmo presente.

---

## Banderas Rojas Críticas

Síntesis basada en Carmona & Kaski (Eur J Neurol 2023) y Newman-Toker GRACE-3
(Acad Emerg Med 2023).

1. Ataxia troncal grado 3 (no puede sentarse sin caer): especificidad 100%
   para causa central; sensibilidad 63.5% global, 100% para infarto AICA.
2. HINTS+ central (HI normal, nistagmo cambiante, skew positivo): stroke
   hasta descartar.
3. Cefalea o cervicalgia nueva en paciente joven (< 55 años) con vértigo:
   considerar disección arterial vertebral.
4. Hipoacusia súbita unilateral con vértigo: infarto AICA hasta descartar.
5. Vértigo + diplopia / disartria / disfagia / hemiparesia: stroke troncal.
6. Episodios troncoencefálicos transitorios previos: AIT vertebrobasilar.

Aproximadamente 15% de strokes vestibulares no presentan nistagmo — la
marcha es la única ventana clínica en esos casos.

---

## Framework TiTrATE

Newman-Toker & Edlow (Neurol Clin 2015) — cambio paradigmático que reemplaza
la pregunta clásica "¿qué tipo de mareo?" (demostradamente imprecisa) por
"TIMING + TRIGGERS" seguido de examen dirigido.

Categorías:

- t-EVS (Triggered Episodic Vestibular Syndrome): BPPV, PPV ortostático.
- s-EVS (Spontaneous EVS): Migraña Vestibular, Ménière, AIT vertebrobasilar.
- t-AVS (Triggered Acute VS): trauma, exposición tóxica.
- s-AVS (Spontaneous AVS): neuritis vestibular, stroke.

Aplicar HINTS en s-AVS. Aplicar Dix-Hallpike en t-EVS. Base conceptual de
GRACE-3 (Edlow et al., Acad Emerg Med 2023).

---

## Maniobras Diagnósticas para BPPV

### Maniobra de Dix-Hallpike (canal posterior)

Paciente sentado en la camilla. Girar la cabeza 45° hacia el oído sospechoso.
Acostar rápidamente con la cabeza colgando 20-30° del borde. Mantener 30-60 s
observando nistagmo. Latencia típica 1-5 s. Nistagmo torsional-vertical hacia
arriba (geotrópico hacia el oído inferior). Repetir hacia el otro lado.

### Roll Test (canal horizontal — si Dix-Hallpike negativo pero historia
sugerente)

Paciente supino con cabeza levantada 30°. Girar rápidamente la cabeza 90°
hacia un lado y observar nistagmo. Retornar a posición neutra. Girar al otro
lado. Geotrópico (hacia abajo) sugiere canalitiasis; apogeotrópico
(hacia arriba) sugiere cupulolitiasis.

### Maniobra de Epley (tratamiento BPPV canal posterior)

Cinco posiciones secuenciales que llevan los otoconios del canal posterior
hacia el utrículo. Cada posición se mantiene 30-60 s o hasta que cese el
nistagmo. Tasa de éxito 80-95% en 1-3 sesiones.

---

## Tratamiento Empírico Inicial

- **BPPV**: maniobra de Epley. Evitar antivertiginosos crónicos.
- **Migraña Vestibular**: tratamiento abortivo con triptán si crisis;
  profiláctico con propranolol o topiramato si frecuencia > 2 al mes.
- **Ménière agudo**: antihistamínicos H1 (cinarizina), antieméticos.
  Crónico: dieta hiposódica, betahistina (evidencia débil), diuréticos.
- **Sospecha de causa central**: NO usar antieméticos sedantes
  (dimenhidrinato, prometazina) que enmascaran el déficit neurológico.
  Derivar inmediatamente.
