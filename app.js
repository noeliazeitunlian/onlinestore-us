(() => {
  const STORAGE_KEY = "genclases_custom_exercises";
  const SAVED_KEY = "genclases_saved_classes";

  let state = {
    discipline: "pilates",
    modality: null,
    equipment: "any",
    level: "intermedio",
    duration: 55,
  };

  let lastRender = null; // { objectiveId, objectiveLabel, populationId, populationLabel, result } de la clase mostrada actualmente

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const LEVEL_LABELS = { inicial: "Beginner", intermedio: "Intermediate", avanzado: "Advanced" };

  function getCustomExercises() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  }

  function saveCustomExercise(ex) {
    const all = getCustomExercises();
    all.push(ex);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    renderMyExercisesList();
  }

  function deleteCustomExercise(id) {
    const remaining = getCustomExercises().filter(ex => ex.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    renderMyExercisesList();
  }

  function renderMyExercisesList() {
    const list = $("#my-exercises-list");
    if (!list) return;
    const mine = getCustomExercises();

    const toggleBtn = $("#toggle-my-exercises");
    if (toggleBtn) toggleBtn.textContent = `🗂️ My own exercises (${mine.length})`;

    if (!mine.length) {
      list.innerHTML = `<p class="block-empty">You haven't added any exercises of your own yet.</p>`;
      return;
    }

    list.innerHTML = mine.map(ex => {
      const discLabel = ex.discipline === "pilates" ? "Pilates" : "Yoga";
      const modLabels = (ex.modality || []).map(id => MODALITIES[ex.discipline]?.find(m => m.id === id)?.label || id).join(", ");
      const levelLabels = (ex.level || []).map(id => LEVEL_LABELS[id] || id).join(", ");
      const blockName = BLOCKS.find(b => b.id === ex.moment)?.name || `Block ${ex.moment}`;
      const objLabels = (ex.objective || []).map(id => OBJECTIVES[ex.discipline]?.find(o => o.id === id)?.label || id).join(", ");
      const metaParts = [discLabel, modLabels, levelLabels, blockName, objLabels].filter(Boolean);
      return `
        <div class="saved-class-card">
          <div>
            <strong>${ex.name}</strong>
            <p class="saved-class-meta">${metaParts.join(" · ")}</p>
          </div>
          <div class="saved-class-actions">
            <button type="button" class="btn-mini btn-remove btn-delete-exercise" data-id="${ex.id}">✕ Remove</button>
          </div>
        </div>`;
    }).join("");
  }

  function allExercises() {
    return EXERCISES.concat(getCustomExercises());
  }

  // ---------- mis clases guardadas ----------
  function getSavedClasses() {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    } catch { return []; }
  }

  function persistSavedClasses(list) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  }

  function saveCurrentClass() {
    if (!lastRender) return;
    const saved = getSavedClasses();
    saved.unshift({
      id: "saved-" + Date.now(),
      savedAt: new Date().toISOString(),
      discipline: state.discipline,
      modality: state.modality,
      equipment: state.equipment,
      level: state.level,
      duration: state.duration,
      render: lastRender,
    });
    persistSavedClasses(saved);
    renderSavedClassesList();

    const btn = $("#btn-save-class");
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Saved ✓";
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  }

  function deleteSavedClass(id) {
    persistSavedClasses(getSavedClasses().filter(e => e.id !== id));
    renderSavedClassesList();
  }

  function openSavedClass(id) {
    const entry = getSavedClasses().find(e => e.id === id);
    if (!entry) return;

    state.discipline = entry.discipline;
    syncDisciplineButtons(state.discipline);
    refreshFormForDiscipline();

    state.modality = entry.modality;
    state.equipment = entry.equipment || "any";
    state.level = entry.level;
    state.duration = entry.duration;

    $$("#modality-group .pill").forEach(p => p.classList.toggle("is-active", p.dataset.value === state.modality));
    refreshEquipmentPills();
    $$("#level-group .pill").forEach(p => p.classList.toggle("is-active", p.dataset.value === state.level));
    $$("#duration-group .pill").forEach(p => p.classList.toggle("is-active", Number(p.dataset.value) === state.duration));
    $("#objective-select").value = entry.render.objectiveId;
    $("#population-select").value = entry.render.populationId;

    renderClass(entry.render);
    if (window.innerWidth < 900) {
      $("#output-panel").scrollIntoView({ behavior: "smooth" });
    }
  }

  function getRecentExerciseIds(count) {
    const ids = new Set();
    getSavedClasses().slice(0, count).forEach(entry => {
      entry.render.result.forEach(r => r.exercises.forEach(ex => ids.add(ex.id)));
    });
    return ids;
  }

  function renderSavedClassesList() {
    const list = $("#saved-classes-list");
    if (!list) return;
    const saved = getSavedClasses();

    const toggleBtn = $("#toggle-saved-classes");
    if (toggleBtn) toggleBtn.textContent = `📂 My saved classes (${saved.length})`;

    if (!saved.length) {
      list.innerHTML = `<p class="block-empty">You haven't saved any classes yet. Generate one and tap "☆ Save class".</p>`;
      return;
    }

    list.innerHTML = saved.map(entry => {
      const dateLabel = new Date(entry.savedAt).toLocaleDateString(navigator.language || "en-US", {
        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      const discLabel = entry.discipline === "pilates" ? "Pilates" : "Yoga";
      return `
        <div class="saved-class-card">
          <div>
            <strong>${entry.render.objectiveLabel}</strong>
            <p class="saved-class-meta">${discLabel} · ${entry.duration} min · ${dateLabel}</p>
          </div>
          <div class="saved-class-actions">
            <button type="button" class="btn-mini btn-open-saved" data-id="${entry.id}">Open</button>
            <button type="button" class="btn-mini btn-remove btn-delete-saved" data-id="${entry.id}">✕</button>
          </div>
        </div>`;
    }).join("");
  }

  // ---------- ilustraciones de posición (genéricas, decorativas) ----------
  function getPositionIcon(position) {
    const p = (position || "").toLowerCase();
    const has = (...words) => words.some(w => p.includes(w));
    const wrap = (inner) => `<svg viewBox="0 0 40 40" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

    if (has("supine", "lying face up")) {
      return wrap(`<circle cx="8" cy="20" r="3.4"/><path d="M11 20h14"/><path d="M25 20l6-5"/><path d="M25 20l6 3"/>`);
    }
    if (has("prone", "face down")) {
      return wrap(`<circle cx="8" cy="14" r="3.4"/><path d="M11 15h15"/><path d="M22 15l5 7"/><path d="M17 15l-3 8"/>`);
    }
    if (has("side")) {
      return wrap(`<circle cx="9" cy="16" r="3.4"/><path d="M12 17h13"/><path d="M22 17l6 6"/><path d="M17 17l1 8"/>`);
    }
    if (has("all fours")) {
      return wrap(`<circle cx="9" cy="14" r="3.2"/><path d="M12 15h16"/><path d="M14 15v9"/><path d="M26 15v9"/>`);
    }
    if (has("kneel", "on the knees")) {
      return wrap(`<circle cx="20" cy="8" r="3.4"/><path d="M20 11v10"/><path d="M20 21l-6 3v6"/><path d="M20 21l6 3v6"/><path d="M20 15l-6 3"/><path d="M20 15l6 3"/>`);
    }
    if (has("seated", "sitting", "sit ")) {
      return wrap(`<circle cx="20" cy="8" r="3.4"/><path d="M20 11v9"/><path d="M20 20l-7 2"/><path d="M20 20l7 2"/><path d="M13 22v6"/><path d="M27 22v6"/>`);
    }
    if (has("standing")) {
      return wrap(`<circle cx="20" cy="7" r="3.4"/><path d="M20 10v13"/><path d="M20 15l-6 4"/><path d="M20 15l6 4"/><path d="M20 23l-4 9"/><path d="M20 23l4 9"/>`);
    }
    return wrap(`<circle cx="20" cy="20" r="10"/><path d="M16 20a4 4 0 0 1 8 0"/>`);
  }

  const IMAGE_FALLBACKS = {
    pilates: {
      supino: "images/exercises/pilates-004.png",
      prono: "images/exercises/pilates-015.png",
      costado: "images/exercises/pilates-036.png",
      cuadrupedia: "images/exercises/pilates-001.png",
      rodillas: "images/exercises/pilates-018.png",
      sentada: "images/exercises/pilates-006.png",
      pie: "images/exercises/pilates-002.png",
      default: "images/exercises/pilates-019.png",
    },
    yoga: {
      supino: "images/exercises/yoga-003.png",
      prono: "images/exercises/yoga-006.png",
      costado: "images/exercises/yoga-007.png",
      cuadrupedia: "images/exercises/yoga-006.png",
      rodillas: "images/exercises/yoga-006.png",
      sentada: "images/exercises/yoga-002.png",
      pie: "images/exercises/yoga-009.png",
      default: "images/exercises/yoga-003.png",
    },
  };

  function getExerciseImage(ex) {
    if (ex.image) return ex.image;
    const p = (ex.position || "").toLowerCase();
    const images = IMAGE_FALLBACKS[ex.discipline] || IMAGE_FALLBACKS.pilates;
    if (p.includes("supine")) return images.supino;
    if (p.includes("prone")) return images.prono;
    if (p.includes("side")) return images.costado;
    if (p.includes("all fours")) return images.cuadrupedia;
    if (p.includes("kneel") || p.includes("on the knees")) return images.rodillas;
    if (p.includes("seated") || p.includes("sitting")) return images.sentada;
    if (p.includes("standing")) return images.pie;
    return images.default;
  }

  // ---------- coaching, progresión y adaptación por condición ----------
  // Si el ejercicio ya trae contenido cargado a mano (coaching/progression/adaptations en data.js),
  // se usa ese. Si no, se genera una versión razonable a partir de lo que sí existe (howTo/adaptation/avoid).
  function getCoaching(ex) {
    if (ex.coaching) return ex.coaching;
    return {
      verbal: ex.howTo || "Cue it in your own words, describing the specific action that needs to happen.",
      imagenMental: `Think of "${ex.name}" as one continuous, unbroken movement, without rushing the final stretch.`,
      tactil: "Ask permission and place a hand near the area that works hardest, so your student can direct their attention there.",
      pregunta: "At what point in the movement do you feel control slipping or extra tension creeping in?",
    };
  }

  // ---------- diferencias por nivel ----------
  // Un mismo ejercicio puede servir para varios niveles; lo que cambia es la dosis (series, repeticiones,
  // respiraciones), el ritmo, el rango, la carga/apoyo y la variante. Todo se arma a partir de los datos
  // del ejercicio, así aplica a toda la base (y a los ejercicios propios) sin cargar texto a mano.
  const isCalmMoment = (ex) => ex.moment === 1 || ex.moment === 6 || (ex.modality || []).includes("restaurativo");

  const LEVEL_DOSE = {
    inicial:    { reps: "6 to 8 reps",   breaths: "3 to 4 breaths", hold: "3 breaths",      tempo: "slow tempo, with a pause to reset between reps", range: "a smaller, comfortable range, prioritizing alignment", yogaTempo: "slow entry and exit, with a pause between sides" },
    intermedio: { reps: "8 to 10 reps",  breaths: "5 to 6 breaths", hold: "5 breaths",      tempo: "steady, controlled tempo",                                      range: "full range", yogaTempo: "continuous transitions, synced with the breath" },
    avanzado:   { reps: "10 to 12 reps", breaths: "6 to 8 breaths", hold: "6 to 8 breaths",  tempo: "flowing tempo, with a 2-count pause at the end of the range",  range: "full range, with a greater demand on control", yogaTempo: "flowing transitions, holding the pose actively through the last breath" },
  };

  // If the "how to cue it" text already has a range ("6 to 8 reps"), beginner takes the low end and advanced the high end.
  function levelAmount(ex, level) {
    const m = (ex.howTo || "").match(/(\d+)\s*to\s*(\d+)\s*(alternating reps|breath cycles|slow breaths|reps|breaths|cycles|circles|presses|rotations|exhales|rounds|bounces|reaches)(\s+per side)?/);
    if (m) {
      const [, lo, hi, rawUnit, perSide = ""] = m;
      const unit = rawUnit + perSide;
      if (level === "inicial") return `${lo} ${unit}`;
      if (level === "avanzado") return `${hi} ${unit}`;
      return `${lo} to ${hi} ${unit}`;
    }
    const dose = LEVEL_DOSE[level];
    if (isCalmMoment(ex)) return dose.breaths;
    return ex.discipline === "yoga" ? `hold for ${dose.hold}` : dose.reps;
  }

  function levelSetup(ex, level) {
    const modality = state.modality !== "mixta" && (ex.modality || []).includes(state.modality) ? state.modality : (ex.modality || [])[0];
    if (modality === "reformer") {
      if (level === "inicial") return "Medium or heavy springs: the carriage moves less and feels more stable.";
      if (level === "intermedio") return "Medium springs.";
      return (ex.objective || []).includes("tren-superior")
        ? "More spring to build strength, without losing scapular control."
        : "Lighter springs: the carriage gets less stable and demands more core control.";
    }
    if (modality === "mat") {
      if (level === "inicial") return "With a wider base of support: head down, knees bent or hands on the floor, depending on the position.";
      if (level === "intermedio") return "Standard version of the exercise.";
      return "With less support: longer levers (legs or arms extended) or without help from the hands.";
    }
    // yoga
    if (level === "inicial") return "Use props (blocks, a blanket or the wall) and go only as far as the first sensation of stretch.";
    if (level === "intermedio") return "Full pose, with props only if needed.";
    return isCalmMoment(ex)
      ? "Longer holds, releasing a little more with each exhale."
      : "No props, working toward the full expression of the pose and smoother transitions.";
  }

  const EQUIPMENT_BY_LEVEL = {
    band:          { inicial: "A long or low-resistance band.",                  avanzado: "Shorten the band or use a heavier one." },
    "magic-circle":{ inicial: "A gentle, sustained squeeze on the ring.",         avanzado: "A sustained squeeze with small pulses at the end of the range." },
    "soft-ball":   { inicial: "Use the ball as an alignment guide, with a gentle squeeze.", avanzado: "Constant pressure on the ball throughout the range." },
    fitball:       { inicial: "Feet wide apart on the floor for a wider base.", avanzado: "A narrower base or one foot lifted to add instability." },
    blocks:        { inicial: "Blocks at their tallest height and close to the body.",      avanzado: "Lower blocks, or no blocks if the range allows." },
    "foam-roller": { inicial: "Roller well supported, with a wide base.",              avanzado: "Fewer points of contact on the roller to add instability." },
  };

  // Stored progressions usually look like "entry version; progress by ...": the first
  // part is the beginner variation and the second the advanced one.
  function splitProgression(text) {
    if (!text) return null;
    const [first, ...rest] = text.split(/;\s*/);
    const easy = first.replace(/^easier variation:\s*/i, "");
    let hard = rest.join("; ").replace(/^to progress[^,]*,\s*/i, "");
    if (/doesn't need|does not need|no need|not required/i.test(hard + first)) hard = "";
    return { easy, hard };
  }

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  function getLevelGuide(ex, level = state.level) {
    const dose = LEVEL_DOSE[level] || LEVEL_DOSE.intermedio;
    const lines = [];
    lines.push(`${capitalize(levelAmount(ex, level))} · ${isCalmMoment(ex) ? (level === "inicial" ? "guided, unhurried breathing" : level === "avanzado" ? "longer holds" : "slow, steady breathing") : ex.discipline === "yoga" ? dose.yogaTempo : `${dose.tempo}, ${dose.range}`}.`);
    lines.push(levelSetup(ex, level));
    (ex.equipment || []).forEach(eq => {
      const tip = EQUIPMENT_BY_LEVEL[eq]?.[level];
      if (tip) lines.push(tip);
    });
    const prog = splitProgression(ex.progression);
    if (prog) {
      if (level === "inicial") lines.push(`Variation: ${prog.easy}.`);
      if (level === "intermedio" && prog.hard) lines.push(`Once it's steady, ${prog.hard}.`);
      if (level === "avanzado" && prog.hard) lines.push(/^progress/i.test(prog.hard) ? `${capitalize(prog.hard)}.` : `Progression: ${prog.hard}.`);
    }
    if (ex.level.length === 1 && ex.level[0] === level) lines.push(`Exercise designed specifically for the ${(LEVEL_LABELS[level] || level).toLowerCase()} level.`);
    return lines;
  }

  // series por nivel: inicial una menos, avanzado una más (salvo preparación y cierre, que no suman intensidad)
  function levelSeries(ex, level = state.level) {
    const base = ex.seriesDefault || 1;
    if (isCalmMoment(ex)) return base;
    if (level === "inicial") return Math.max(1, base - 1);
    if (level === "avanzado") return base + 1;
    return base;
  }

  // copia del ejercicio con la dosis del nivel: así cambiar series en una clase no modifica la base
  const withLevel = (ex) => ({ ...ex, seriesDefault: levelSeries(ex) });

  // mezcla priorizando los ejercicios propios del nivel elegido (los de un solo nivel salen más seguido
  // que los que sirven para los tres), para que inicial, intermedio y avanzado no traigan la misma clase
  function levelWeightedShuffle(pool) {
    return pool
      .map(ex => ({ ex, key: Math.pow(Math.random(), 1 / (4 - Math.min(3, (ex.level || []).length))) }))
      .sort((a, b) => b.key - a.key)
      .map(o => o.ex);
  }

  // Principio general de seguridad por condición + cómo aplicarlo en el ejercicio puntual.
  // Se usa como base para CUALQUIER ejercicio; si el ejercicio tiene "adaptations" cargado
  // a mano para esa condición, ese contenido específico tiene prioridad sobre este genérico.
  const CONDITION_GUIDANCE = {
    "Osteoporosis / osteopenia": {
      principle: "avoid spinal flexion combined with rotation, and any impact loading",
      suggestion: "work within a more neutral spinal range, without chasing maximum flexion or rotation, and use props that reduce the load on the joints",
    },
    "Lumbar disc herniation": {
      principle: "avoid deep lumbar flexion and forced rotation under load",
      suggestion: "reduce the forward-bending range, keep the spine closer to neutral and prioritize abdominal control over range of motion",
    },
    "Pregnancy / postpartum": {
      principle: "avoid lying face down, direct pressure on the belly and closed twists",
      suggestion: "adapt the position (side-lying, seated or standing as appropriate), lower the intensity and prioritize the breath over range of motion",
    },
    "Hip issues / hip replacement": {
      principle: "avoid end-range hip flexion, internal rotation or crossing the hip's midline",
      suggestion: "work within a smaller, comfortable range, adding props (blocks, a chair, the wall) that support the joint",
    },
    "Post knee surgery": {
      principle: "avoid deep knee flexion and pivoting under load on a bent knee",
      suggestion: "reduce the knee-bend range, work with a lighter load or extra support, and avoid any twisting with the foot planted",
    },
    "Hypermobility": {
      principle: "avoid chasing end range or locking the joints at the end of the movement",
      suggestion: "keep the movement within a controlled range, engaging the muscles instead of hanging on the end of the joint",
    },
    "Fibromyalgia": {
      principle: "avoid long holds, heavy loads or sudden changes of pace that can cause flare-ups",
      suggestion: "shorten the holds and lower the intensity, add pauses and let your student set the pace based on their energy that day",
    },
    "Pelvic floor dysfunction": {
      principle: "avoid holding the breath or creating high intra-abdominal pressure (Valsalva maneuver)",
      suggestion: "pair the effort with an active exhale and lower the intensity or range if there's a sense of downward pressure",
    },
  };

  function getAdaptationForCondition(ex, tag) {
    // 1) contenido específico cargado a mano para este ejercicio y esta condición puntual
    if (ex.adaptations && ex.adaptations[tag]) return ex.adaptations[tag];

    const guidance = CONDITION_GUIDANCE[tag];
    const taggedHere = (ex.avoid || []).includes(tag);

    // 2) el ejercicio ya trae una adaptación general y esta condición es la que la motiva
    const specificNote = taggedHere && ex.adaptation
      ? ` For this exercise specifically: ${ex.adaptation.charAt(0).toLowerCase()}${ex.adaptation.slice(1)}`
      : "";

    if (!guidance) {
      return ex.adaptation || "There's no specific modification on file; adjust the range and intensity to the individual, and if in doubt, check with your student's doctor or physical therapist.";
    }

    // 3) siempre generamos una adaptación aplicable a "este" ejercicio, combinando el
    // principio general de la condición con el nombre del ejercicio que se está mostrando
    return `With this condition, it's generally best to ${guidance.principle}. In "${ex.name}": ${guidance.suggestion}.${specificNote}`;
  }

  // ---------- render form options depending on discipline ----------
  function renderPillGroup(containerId, options, activeValue, multi = false) {
    const el = $(containerId);
    el.innerHTML = "";
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill" + ((multi ? false : opt.id === activeValue) ? " is-active" : "");
      btn.dataset.value = opt.id;
      btn.textContent = opt.label;
      el.appendChild(btn);
    });
  }

  function renderSelect(selectId, options) {
    const el = $(selectId);
    el.innerHTML = options.map(o => `<option value="${o.id}">${o.label}</option>`).join("");
  }

  // fitball, pelota blanda y bloques son solo de mat: no se ofrecen en una clase o ejercicio de reformer
  function equipmentForModality(modality) {
    return EQUIPMENT_OPTIONS.filter(e => !(e.matOnly && modality === "reformer"));
  }

  function refreshEquipmentPills() {
    const options = equipmentForModality(state.modality);
    if (!options.some(o => o.id === state.equipment)) state.equipment = "any";
    renderPillGroup("#equipment-group", options, state.equipment);
  }

  function refreshExEquipmentSelect() {
    const exModality = $("#ex-modality-group .pill.is-active")?.dataset.value;
    renderSelect("#ex-equipment-select", equipmentForModality(exModality).filter(e => e.id !== "any"));
  }

  function refreshFormForDiscipline() {
    const d = state.discipline;
    renderPillGroup("#modality-group", MODALITIES[d], null);
    state.modality = MODALITIES[d][0].id;
    $(`#modality-group .pill[data-value="${state.modality}"]`).classList.add("is-active");
    refreshEquipmentPills();

    renderSelect("#objective-select", OBJECTIVES[d]);
    renderSelect("#population-select", POPULATIONS);

    // exercise-add form groups: "mixta" no aplica a un ejercicio individual (ver filterPool)
    renderPillGroup("#ex-modality-group", MODALITIES[d].filter(m => m.id !== "mixta"), null);
    renderPillGroup("#ex-moment-group", BLOCKS.map(b => ({ id: b.id, label: `${b.id}. ${b.name}` })), null, true);
    renderPillGroup("#ex-objective-group", OBJECTIVES[d], null, true);
    renderPillGroup("#ex-avoid-group", AVOID_TAGS.map(t => ({ id: t, label: t })), null, true);
    refreshExEquipmentSelect();
  }

  // ---------- pill click handling (event delegation) ----------
  document.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    const group = pill.parentElement;
    const isMulti = group.classList.contains("multi");

    if (isMulti) {
      pill.classList.toggle("is-active");
    } else {
      Array.from(group.children).forEach(c => c.classList.remove("is-active"));
      pill.classList.add("is-active");
    }

    // sync state for main form
    if (group.id === "modality-group") {
      state.modality = pill.dataset.value;
      refreshEquipmentPills();
    }
    if (group.id === "ex-modality-group") refreshExEquipmentSelect();
    if (group.id === "equipment-group") state.equipment = pill.dataset.value;
    if (group.id === "level-group") state.level = pill.dataset.value;
    if (group.id === "duration-group") state.duration = Number(pill.dataset.value);
  });

  // ---------- discipline toggle (sincroniza la barra principal y la barra pegajosa) ----------
  function syncDisciplineButtons(discipline) {
    $$(".discipline-btn").forEach(b => {
      const active = b.dataset.discipline === discipline;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  $$(".discipline-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.discipline = btn.dataset.discipline;
      state.equipment = "any";
      syncDisciplineButtons(state.discipline);
      refreshFormForDiscipline();
      lastRender = null;
      $("#output-content").classList.add("hidden");
      $("#output-empty").classList.remove("hidden");
    });
  });

  // ---------- barra pegajosa: aparece cuando el hero sale de vista ----------
  const heroSentinel = document.getElementById("hero-sentinel");
  if (heroSentinel && "IntersectionObserver" in window) {
    const stickyObserver = new IntersectionObserver(([entry]) => {
      $("#sticky-bar").classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0 });
    stickyObserver.observe(heroSentinel);
  }

  // ---------- generate class ----------
  // "mixta" es un tipo de CLASE (combinar mat y reformer), no una etiqueta que un ejercicio
  // pueda tener a sí mismo: un ejercicio de piso es mat, uno sobre el carro es reformer, nunca ambos.
  // Por eso "mixta" se resuelve acá como comodín (trae cualquier modalidad) en vez de buscarse en ex.modality.
  // El elemento elegido nunca habilita otra modalidad: si no hay ejercicios de reformer con ese
  // elemento, el bloque queda vacío (con su aviso) en vez de mezclar ejercicios de mat.
  function filterPool(discipline, moment, modality, level, objective, populationId, excludeIds = new Set()) {
    const matchesModality = (ex) =>
      modality === "mixta" ||
      ex.modality.includes(modality);

    let pool = allExercises().filter(ex =>
      ex.discipline === discipline &&
      ex.moment === moment &&
      matchesModality(ex) &&
      ex.level.includes(level) &&
      (state.equipment === "any" || (state.equipment === "none" ? !(ex.equipment || []).length : (ex.equipment || []).includes(state.equipment))) &&
      !excludeIds.has(ex.id)
    );

    // población: solo ejercicios marcados como aptos para la población elegida (campo "population").
    // Es un filtro estricto, también en el último recurso: por seguridad nunca se cae a ejercicios no aptos.
    // Los ejercicios propios sin "population" se consideran aptos (los cargó la instructora).
    const fitsPopulation = (ex) =>
      !populationId || populationId === "general" ||
      (ex.population ? ex.population.includes(populationId)
        : !(populationId === "embarazo" && (ex.avoid || []).includes("Pregnancy / postpartum")));
    pool = pool.filter(fitsPopulation);

    // prefer matching objective, but fall back if empty
    const withObjective = pool.filter(ex => ex.objective.includes(objective));
    if (withObjective.length) return { pool: withObjective, fallback: false };
    if (pool.length) return { pool, fallback: true };

    // last resort: ignore level, manteniendo disciplina, bloque y elemento elegido
    const anyLevel = allExercises().filter(ex =>
      ex.discipline === discipline &&
      ex.moment === moment &&
      matchesModality(ex) &&
      (state.equipment === "any" || (state.equipment === "none" ? !(ex.equipment || []).length : (ex.equipment || []).includes(state.equipment))) &&
      fitsPopulation(ex) &&
      !excludeIds.has(ex.id)
    );
    return { pool: anyLevel, fallback: true };
  }

  function buildClass() {
    const objectiveId = $("#objective-select").value;
    const objectiveLabel = OBJECTIVES[state.discipline].find(o => o.id === objectiveId)?.label || objectiveId;
    const populationId = $("#population-select").value;
    const populationLabel = POPULATIONS.find(p => p.id === populationId)?.label || populationId;
    const includeWarmup = $("#include-warmup").checked;

    let blocksToUse = BLOCKS.filter(b => includeWarmup || !b.optional);
    const weightSum = blocksToUse.reduce((s, b) => s + b.weight, 0);

    const avoidRecent = $("#avoid-recent")?.checked;
    const recentIds = avoidRecent ? getRecentExerciseIds(3) : new Set();

    const result = blocksToUse.map(block => {
      const minutes = Math.max(3, Math.round((block.weight / weightSum) * state.duration));
      const { pool, fallback } = filterPool(state.discipline, block.id, state.modality, state.level, objectiveId, populationId, recentIds);
      const picked = levelWeightedShuffle(pool).slice(0, block.id === 3 ? 3 : 2).map(withLevel);
      return { block, minutes, exercises: picked, fallback };
    });

    renderClass({ objectiveId, objectiveLabel, populationId, populationLabel, result });
  }

  // ---------- extender clase sin repetir ejercicios ----------
  function extendClass() {
    if (!lastRender) return;
    state.duration += 20;

    const { objectiveId, objectiveLabel, populationId, populationLabel } = lastRender;
    const includeWarmup = $("#include-warmup").checked;

    const blocksToUse = BLOCKS.filter(b => includeWarmup || !b.optional);
    const weightSum = blocksToUse.reduce((s, b) => s + b.weight, 0);

    const usedIds = new Set(lastRender.result.flatMap(r => r.exercises.map(ex => ex.id)));

    const result = blocksToUse.map(block => {
      const minutes = Math.max(3, Math.round((block.weight / weightSum) * state.duration));
      const previous = lastRender.result.find(r => r.block.id === block.id);
      const extraCount = block.id === 3 ? 2 : 1;
      const { pool, fallback } = filterPool(state.discipline, block.id, state.modality, state.level, objectiveId, populationId, usedIds);
      const extras = levelWeightedShuffle(pool).slice(0, extraCount).map(withLevel);
      extras.forEach(ex => usedIds.add(ex.id));
      const exercises = (previous ? previous.exercises : []).concat(extras);
      return {
        block,
        minutes,
        exercises,
        fallback: previous ? previous.fallback : fallback,
        noExtra: !!previous && exercises.length > 0 && extras.length === 0,
      };
    });

    renderClass({ objectiveId, objectiveLabel, populationId, populationLabel, result });
  }

  // ---------- descargar clase en PDF ----------
  function downloadPDF() {
    const btn = $("#btn-pdf");
    if (!btn || typeof html2canvas === "undefined" || !window.jspdf) return;
    const original = btn.textContent;
    btn.textContent = "Generating…";
    btn.disabled = true;

    html2canvas($("#output-content"), { scale: 2, backgroundColor: "#FBF1EE" })
      .then(canvas => {
        const { jsPDF } = window.jspdf;
        const usesLetter = /^en-(US|CA)|^es-(US|MX)|^fr-CA/i.test(navigator.language || "en-US");
        const pdf = new jsPDF({ unit: "pt", format: usesLetter ? "letter" : "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL("image/png");

        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`class-${state.discipline}-${Date.now()}.pdf`);
      })
      .catch(() => alert("We couldn't generate the PDF. Please try again."))
      .finally(() => {
        btn.textContent = original;
        btn.disabled = false;
      });
  }

  // ---------- helpers de edición en vivo de la clase ----------
  function findEntry(blockId) {
    return lastRender.result.find(r => r.block.id === blockId);
  }

  function swapExercise(blockId, idx) {
    const entry = findEntry(blockId);
    if (!entry) return;
    const excludeIds = new Set(lastRender.result.flatMap(r => r.exercises.map(ex => ex.id)));
    const { pool } = filterPool(state.discipline, blockId, state.modality, state.level, lastRender.objectiveId, lastRender.populationId, excludeIds);
    const options = levelWeightedShuffle(pool);
    if (!options.length) {
      alert("There's no other exercise available to swap in with the current filters.");
      return;
    }
    entry.exercises[idx] = withLevel(options[0]);
    renderClass(lastRender);
  }

  function removeExercise(blockId, idx) {
    const entry = findEntry(blockId);
    if (!entry) return;
    entry.exercises.splice(idx, 1);
    renderClass(lastRender);
  }

  function quickAddExercise(blockId, name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const entry = findEntry(blockId);
    if (!entry) return;
    const ex = {
      id: "custom-" + Date.now(),
      discipline: state.discipline,
      name: trimmed,
      description: trimmed,
      position: "",
      modality: [state.modality],
      equipment: state.equipment === "any" ? [] : [state.equipment],
      level: [state.level],
      moment: blockId,
      objective: [lastRender.objectiveId],
      seriesDefault: 1,
    };
    saveCustomExercise(ex);
    entry.exercises.push(ex);
    renderClass(lastRender);
  }

  function changeSeries(blockId, idx, delta) {
    const entry = findEntry(blockId);
    if (!entry) return;
    const ex = entry.exercises[idx];
    if (!ex) return;
    ex.seriesDefault = Math.max(1, (ex.seriesDefault || 1) + delta);
    const el = $(`.exercise-card[data-block="${blockId}"][data-idx="${idx}"] .series-count`);
    if (el) el.textContent = `${ex.seriesDefault} ${ex.seriesDefault === 1 ? "set" : "sets"}`;
  }

  // ---------- gráfico real de reparto de tiempo por bloque ----------
  const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

  function renderTimeDonut(result) {
    const total = result.reduce((s, r) => s + r.minutes, 0) || 1;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = result.map((r, i) => {
      const frac = r.minutes / total;
      const segLen = frac * circumference;
      const dashoffset = -offset;
      offset += segLen;
      return `<circle cx="42" cy="42" r="${radius}" fill="none" stroke="${CHART_COLORS[i % CHART_COLORS.length]}" stroke-width="11" stroke-dasharray="${segLen} ${circumference - segLen}" stroke-dashoffset="${dashoffset}" />`;
    }).join("");

    const legend = result.map((r, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
        <span>${r.block.name} · ${r.minutes} min</span>
      </div>`).join("");

    return `
      <div class="time-donut-row">
        <svg viewBox="0 0 84 84" width="80" height="80" class="time-donut">
          <g transform="rotate(-90 42 42)">${segments}</g>
          <text x="42" y="45" text-anchor="middle" class="time-donut-total">${total}</text>
          <text x="42" y="57" text-anchor="middle" class="time-donut-unit">MIN</text>
        </svg>
        <div class="time-donut-legend">${legend}</div>
      </div>`;
  }

  // ---------- render de una tarjeta de ejercicio ----------
  function renderExerciseCard(ex, blockId, idx, isPrepOriented) {
    const coaching = getCoaching(ex);
    const levelLabel = LEVEL_LABELS[state.level] || state.level;
    const imageSrc = getExerciseImage(ex);

    return `
      <div class="exercise-card" data-block="${blockId}" data-idx="${idx}">
        <div class="exercise-illustration">
          <img src="${imageSrc}" alt="${ex.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="exercise-illustration-icon" style="display:none;">${getPositionIcon(ex.position)}</div>
        </div>
        <div class="exercise-body">
          <div class="exercise-title-row">
            <h5>${ex.name}</h5>
            ${ex.position ? `<span class="position">${ex.position}</span>` : ""}
            ${isPrepOriented ? `<span class="badge-prep">GOAL-FOCUSED PREP</span>` : ""}
          </div>
          <p class="exercise-desc">${ex.description}</p>

          <div class="level-guide">
            <span class="level-guide-title">${levelLabel} level</span>
            <ul>${getLevelGuide(ex).map(line => `<li>${line}</li>`).join("")}</ul>
          </div>

          <div class="exercise-chips">
            <button type="button" class="chip-btn toggle-coaching">How to cue it ▾</button>
            <button type="button" class="chip-btn toggle-adaptation">+ Modify for a condition ▾</button>
            ${(ex.avoid && ex.avoid.length) ? `<span class="chip warn">Avoid with: ${ex.avoid.join(", ")}</span>` : ""}
          </div>

          <div class="coaching-panel hidden">
            <div class="coaching-row"><span class="coaching-icon" aria-hidden="true">🗣️</span><div><strong>Verbal</strong><p>${coaching.verbal}</p></div></div>
            <div class="coaching-row"><span class="coaching-icon" aria-hidden="true">🖼️</span><div><strong>Imagery</strong><p>${coaching.imagenMental}</p></div></div>
            <div class="coaching-row"><span class="coaching-icon" aria-hidden="true">✋</span><div><strong>Hands-on</strong><p>${coaching.tactil}</p></div></div>
            <div class="coaching-row"><span class="coaching-icon" aria-hidden="true">❓</span><div><strong>Question</strong><p>${coaching.pregunta}</p></div></div>
          </div>

          <div class="adaptation-panel hidden">
            <p>Does a student need a modification? Tap the condition and I'll show you what to change. The class carries on as normal for everyone else:</p>
            <div class="condition-pills">
              ${AVOID_TAGS.map(tag => `<button type="button" class="pill-condition" data-tag="${tag}">${tag}</button>`).join("")}
            </div>
            <div class="condition-result hidden"></div>
          </div>

          <div class="exercise-controls">
            <div class="series-stepper">
              <button type="button" class="step-minus" aria-label="Remove a set">−</button>
              <span class="series-count">${ex.seriesDefault || 1} ${(ex.seriesDefault || 1) === 1 ? "set" : "sets"}</span>
              <button type="button" class="step-plus" aria-label="Add a set">+</button>
            </div>
            <button type="button" class="btn-mini btn-change">⇄ Swap</button>
            <button type="button" class="btn-mini btn-remove">✕ Remove</button>
          </div>
        </div>
      </div>`;
  }

  // ---------- modo clase en vivo (cronómetro por ejercicio) ----------
  let liveState = null; // { steps: [{block, ex}], index, seconds, timerId, paused }

  function buildLiveSteps() {
    const steps = [];
    lastRender.result.forEach(({ block, exercises }) => {
      exercises.forEach(ex => steps.push({ block, ex }));
    });
    return steps;
  }

  function updateLiveTimerDisplay() {
    const m = String(Math.floor(liveState.seconds / 60)).padStart(2, "0");
    const s = String(liveState.seconds % 60).padStart(2, "0");
    $("#live-timer").textContent = `${m}:${s}`;
  }

  function renderLiveStep() {
    const { steps, index } = liveState;
    const { block, ex } = steps[index];
    $("#live-progress").textContent = `Exercise ${index + 1} of ${steps.length}`;
    $("#live-block-name").textContent = `${block.id}. ${block.name}`;
    $("#live-ex-position").textContent = ex.position || "";
    $("#live-ex-name").textContent = ex.name;
    $("#live-ex-desc").textContent = ex.description || "";
    $("#live-ex-howto").textContent = `${getCoaching(ex).verbal} ${getLevelGuide(ex).join(" ")}`;

    liveState.seconds = 0;
    liveState.paused = false;
    $("#live-pause").textContent = "Pause";
    updateLiveTimerDisplay();
  }

  function startLiveTimer() {
    if (liveState.timerId) clearInterval(liveState.timerId);
    liveState.timerId = setInterval(() => {
      if (liveState.paused) return;
      liveState.seconds += 1;
      updateLiveTimerDisplay();
    }, 1000);
  }

  function startLiveMode() {
    if (!lastRender) return;
    const steps = buildLiveSteps();
    if (!steps.length) {
      alert("There are no exercises in this class yet to start live mode.");
      return;
    }
    liveState = { steps, index: 0, seconds: 0, timerId: null, paused: false };
    $("#live-mode").classList.remove("hidden");
    renderLiveStep();
    startLiveTimer();
  }

  function stopLiveMode() {
    if (liveState && liveState.timerId) clearInterval(liveState.timerId);
    liveState = null;
    $("#live-mode").classList.add("hidden");
  }

  function liveStep(delta) {
    if (!liveState) return;
    const next = liveState.index + delta;
    if (next < 0 || next >= liveState.steps.length) return;
    liveState.index = next;
    renderLiveStep();
  }

  $("#live-close").addEventListener("click", stopLiveMode);
  $("#live-prev").addEventListener("click", () => liveStep(-1));
  $("#live-next").addEventListener("click", () => liveStep(1));
  $("#live-pause").addEventListener("click", () => {
    if (!liveState) return;
    liveState.paused = !liveState.paused;
    $("#live-pause").textContent = liveState.paused ? "Resume" : "Pause";
  });

  function renderClass({ objectiveId, objectiveLabel, populationId, populationLabel, result }) {
    lastRender = { objectiveId, objectiveLabel, populationId, populationLabel, result };
    $("#output-empty").classList.add("hidden");
    const content = $("#output-content");
    content.classList.remove("hidden");

    const modLabel = MODALITIES[state.discipline].find(m => m.id === state.modality)?.label || state.modality;
    const levelLabel = LEVEL_LABELS[state.level];

    let html = `
      <div class="class-header">
        <p class="kicker">Class plan · ${state.discipline === "pilates" ? "Pilates" : "Yoga"}</p>
        <h3>${objectiveLabel}</h3>
        <div class="tag-row">
          <span class="tag">${modLabel}</span>
          <span class="tag">${levelLabel}</span>
          <span class="tag">${state.duration} min</span>
          <span class="tag">${populationLabel}</span>
          ${state.equipment !== "any" ? `<span class="tag">${EQUIPMENT_OPTIONS.find(e => e.id === state.equipment)?.label || state.equipment}</span>` : ""}
        </div>
        ${renderTimeDonut(result)}
        <div class="actions">
          <button type="button" class="btn-outline" id="btn-live">▶ Live class mode</button>
          <button type="button" class="btn-outline" id="btn-pdf">↓ Download PDF</button>
          <button type="button" class="btn-outline" id="btn-save-class">☆ Save class</button>
          <button type="button" class="btn-outline" id="btn-extend">+ 20 min, no repeats</button>
          <button type="button" class="btn-outline" id="btn-regenerate">↻ Regenerate class</button>
          <button type="button" class="btn-outline" id="btn-copy">⎘ Copy text</button>
        </div>
      </div>

      <div class="intent-box">
        <span class="label">Opening cue: today's intention</span>
        "Today we're going to work on ${objectiveLabel.toLowerCase()}. Before we start, take a moment to notice how you're arriving. Don't change anything, just notice."
      </div>
    `;

    result.forEach(({ block, minutes, exercises, fallback, noExtra }) => {
      html += `<div class="block">
        <div class="block-head">
          <div class="block-num">${block.id}</div>
          <div>
            <h4>${block.name}</h4>
            <p>${block.subtitle}</p>
          </div>
          <div class="block-time">${minutes} min</div>
        </div>`;

      if (!exercises.length) {
        html += populationId && populationId !== "general"
          ? `<p class="block-empty">There are no exercises in the library marked as suitable for ${populationLabel.toLowerCase()} in this block with this prop. Try another prop or add your own below.</p>`
          : `<p class="block-empty">There are no exercises for this combination in this block yet. Add some with "+ Add your own exercise" or with the field below.</p>`;
      } else {
        if (fallback) {
          html += `<p class="block-empty">Showing similar exercises (there's no exact match for this goal/level in this block yet).</p>`;
        }
        if (noExtra) {
          html += `<p class="block-empty">There are no more new exercises to add to this block without repeating.</p>`;
        }
        exercises.forEach((ex, idx) => {
          const isPrepOriented = !!block.optional && !fallback && ex.objective.includes(objectiveId);
          html += renderExerciseCard(ex, block.id, idx, isPrepOriented);
        });
      }

      html += `
        <div class="quick-add-row">
          <input type="text" class="quick-add-input" placeholder="Add your own exercise to this block...">
          <button type="button" class="btn-mini btn-quick-add" data-block="${block.id}">+ Add</button>
        </div>
      </div>`;
    });

    html += `
      <div class="intent-box" style="background:var(--gold-soft); color:var(--bordo-deep);">
        <span class="label">Closing cue: say it in the last 30 seconds</span>
        "Today we worked on ${objectiveLabel.toLowerCase()}. Next class, we'll keep building on this foundation."
      </div>
    `;

    content.innerHTML = html;

    $("#btn-regenerate").addEventListener("click", buildClass);
    $("#btn-extend").addEventListener("click", extendClass);
    $("#btn-pdf").addEventListener("click", downloadPDF);
    $("#btn-live").addEventListener("click", startLiveMode);
    $("#btn-save-class").addEventListener("click", saveCurrentClass);
    $("#btn-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(content.innerText).then(() => {
        const b = $("#btn-copy");
        const original = b.textContent;
        b.textContent = "Copied ✓";
        setTimeout(() => b.textContent = original, 1500);
      });
    });
  }

  // ---------- interacción dentro de una tarjeta de ejercicio (delegado, se registra una sola vez) ----------
  $("#output-content").addEventListener("click", (e) => {
    const quickAddBtn = e.target.closest(".btn-quick-add");
    if (quickAddBtn) {
      const row = quickAddBtn.closest(".quick-add-row");
      const input = row.querySelector(".quick-add-input");
      quickAddExercise(Number(quickAddBtn.dataset.block), input.value);
      return;
    }

    const card = e.target.closest(".exercise-card");
    if (!card) return;
    const blockId = Number(card.dataset.block);
    const idx = Number(card.dataset.idx);

    if (e.target.closest(".toggle-coaching")) {
      card.querySelector(".coaching-panel").classList.toggle("hidden");
      return;
    }
    if (e.target.closest(".toggle-adaptation")) {
      card.querySelector(".adaptation-panel").classList.toggle("hidden");
      return;
    }
    const conditionPill = e.target.closest(".pill-condition");
    if (conditionPill) {
      const panel = card.querySelector(".adaptation-panel");
      panel.querySelectorAll(".pill-condition").forEach(p => p.classList.remove("is-active"));
      conditionPill.classList.add("is-active");
      const entry = findEntry(blockId);
      const ex = entry.exercises[idx];
      const resultBox = panel.querySelector(".condition-result");
      resultBox.textContent = getAdaptationForCondition(ex, conditionPill.dataset.tag);
      resultBox.classList.remove("hidden");
      return;
    }
    if (e.target.closest(".step-minus")) { changeSeries(blockId, idx, -1); return; }
    if (e.target.closest(".step-plus")) { changeSeries(blockId, idx, 1); return; }
    if (e.target.closest(".btn-change")) { swapExercise(blockId, idx); return; }
    if (e.target.closest(".btn-remove")) { removeExercise(blockId, idx); return; }
  });

  $("#class-form").addEventListener("submit", (e) => {
    e.preventDefault();
    buildClass();
    if (window.innerWidth < 900) {
      $("#output-panel").scrollIntoView({ behavior: "smooth" });
    }
  });

  // ---------- add own exercise ----------
  $("#toggle-add-exercise").addEventListener("click", () => {
    $("#exercise-form").classList.toggle("hidden");
  });

  $("#exercise-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const getMultiValues = (id) => $$(`${id} .pill.is-active`).map(p => p.dataset.value);

    const modality = getMultiValues("#ex-modality-group");
    const level = getMultiValues("#ex-level-group");
    const moments = getMultiValues("#ex-moment-group").map(Number);
    const objective = getMultiValues("#ex-objective-group");
    const avoid = getMultiValues("#ex-avoid-group");
    const equipment = $("#ex-equipment-select")?.value || "none";

    if (!modality.length || !level.length || !moments.length) {
      alert("Choose at least one style, one level and one class block.");
      return;
    }

    // un ejercicio propio puede aplicar a varios momentos: guardamos una entrada por momento
    moments.forEach((moment, idx) => {
      saveCustomExercise({
        id: "custom-" + Date.now() + "-" + idx,
        discipline: state.discipline,
        name: $("#ex-name").value.trim(),
        description: $("#ex-description").value.trim(),
        position: $("#ex-position").value.trim(),
        modality, level, moment, objective, avoid,
        equipment: equipment === "none" ? [] : [equipment],
        seriesDefault: 3,
      });
    });

    alert("Exercise saved. It's now available in the generator.");
    e.target.reset();
    $$("#exercise-form .pill.is-active").forEach(p => p.classList.remove("is-active"));
    refreshExEquipmentSelect();
    $("#exercise-form").classList.add("hidden");
  });

  // ---------- mis clases guardadas: toggle + interacciones ----------
  $("#toggle-saved-classes").addEventListener("click", () => {
    $("#saved-classes-panel").classList.toggle("hidden");
  });

  $("#saved-classes-list").addEventListener("click", (e) => {
    const openBtn = e.target.closest(".btn-open-saved");
    if (openBtn) { openSavedClass(openBtn.dataset.id); return; }
    const deleteBtn = e.target.closest(".btn-delete-saved");
    if (deleteBtn) { deleteSavedClass(deleteBtn.dataset.id); return; }
  });

  // ---------- mis ejercicios propios: toggle + interacciones ----------
  $("#toggle-my-exercises").addEventListener("click", () => {
    $("#my-exercises-panel").classList.toggle("hidden");
  });

  $("#my-exercises-list").addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete-exercise");
    if (deleteBtn) { deleteCustomExercise(deleteBtn.dataset.id); }
  });

  // ---------- init ----------
  refreshFormForDiscipline();
  renderSavedClassesList();
  renderMyExercisesList();
})();