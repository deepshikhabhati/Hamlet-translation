/**
 * Hamlet Translation Analysis v1.5 - Product Visual System
 * Pure Vanilla JavaScript implementation with dynamic JSON integration
 */

// Dimensions as specified
const DIMENSIONS = [
  { key: "semantic", name: "Semantic", short: "Semantic" },
  { key: "emotion", name: "Emotion", short: "Emotion" },
  { key: "metaphor_imagery", name: "Metaphor / imagery", short: "Metaphor" },
  { key: "tone", name: "Tone", short: "Tone" },
  { key: "character_voice", name: "Character voice", short: "Voice" },
  { key: "wordplay", name: "Wordplay", short: "Wordplay" },
  { key: "cultural_archaic", name: "Cultural / archaic", short: "Cultural" },
  { key: "omissions_additions", name: "Omissions / additions", short: "Omissions" }
];

const VERSIONS = [
  { key: "human_german", name: "Human DE", short: "Human" },
  { key: "ai_german", name: "AI DE", short: "AI" },
  { key: "context_ai_german", name: "Context AI DE", short: "Context AI" }
];

// App State
const state = {
  data: null,
  page: "read", // 'read' | 'heatmap' | 'queue'
  selectedAct: 1,
  selectedSceneId: null,
  selectedDimension: "semantic",
  filter: "all", // 'all' | 'diff' | 'review'
  studyMode: "rec", // 'rec' | 'spread' | 'flags' | 'ctx' | 'low'
  speechStripOpen: false,
  activeDialogueId: null,
  activeInspectorDim: "semantic",
  activeLinkedSpanId: null,
  heatmapMode: "cmp", // 'cmp' | 'human_german' | 'ai_german' | 'context_ai_german' | 'eff'
  heatmapAct: "all",
  heatmapMax: "all",
  queueStatus: "open", // 'open' | 'done' | 'all'
  queueIssue: "all",
  validations: {} // dialogueId: { verdict, classification, comment, reviewer }
};

// Unicode Code-point slice utility (avoids UTF-16 surrogate pair mismatch)
function codePointSlice(text, start, end) {
  if (!text) return "";
  return Array.from(text).slice(start, end).join("");
}

function codePointLength(text) {
  if (!text) return 0;
  return Array.from(text).length;
}

// Score Color Styling
function getScoreClass(val) {
  if (val === null || val === undefined || isNaN(val)) return "score-cell-na";
  if (val < 60) return "score-band-1";
  if (val < 85) return "score-band-2";
  if (val < 93) return "score-band-3";
  if (val < 97) return "score-band-4";
  return "score-band-5";
}

function formatScore(val) {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  return typeof val === "number" ? (Math.round(val * 10) / 10).toString() : String(val);
}

// Miniature Comparison Range Bar SVG
function renderComparisonSvg(h, a, c, minVal = 80, maxVal = 100, width = 150) {
  const clamp = (v) => Math.max(minVal, Math.min(maxVal, v));
  const px = (v) => Math.round(Math.max(0, Math.min(width, (clamp(v) - minVal) / (maxVal - minVal) * width)) * 10) / 10;
  
  const valid = [h, a, c].filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) {
    return `<svg width="${width}" height="26" viewBox="0 0 ${width} 26" style="display:block">
      <line x1="0" y1="13" x2="${width}" y2="13" stroke="#D8DCE3" stroke-width="1"></line>
    </svg>`;
  }

  const minS = Math.min(...valid);
  const maxS = Math.max(...valid);
  const minX = px(minS);
  const maxX = px(maxS);
  const hX = h !== null && !isNaN(h) ? px(h) : -99;
  const aX = a !== null && !isNaN(a) ? px(a) - 3.25 : -99;
  const cX = c !== null && !isNaN(c) ? px(c) : -99;
  const tick = width / 2;
  const hY = 5, aY = 9.75, cY = 21;
  const cPts = `${cX},${cY - 3.75} ${cX + 3.75},${cY} ${cX},${cY + 3.75} ${cX - 3.75},${cY}`;
  const spread = Math.round((maxS - minS) * 10) / 10;

  return `
    <svg width="${width}" height="26" viewBox="0 0 ${width} 26" role="img" aria-label="Human: ${formatScore(h)}, AI: ${formatScore(a)}, Context AI: ${formatScore(c)} (Spread: ${spread})" style="display:block; overflow:visible">
      <line x1="0" y1="13" x2="${width}" y2="13" stroke="#D8DCE3" stroke-width="1"></line>
      <line x1="${tick}" y1="9" x2="${tick}" y2="17" stroke="#C3C8D1" stroke-width="1"></line>
      <line x1="${minX}" y1="13" x2="${maxX}" y2="13" stroke="#9AA6BA" stroke-width="3" stroke-linecap="round"></line>
      ${h !== null && !isNaN(h) ? `<circle cx="${hX}" cy="${hY}" r="3.5" fill="#B8500A" stroke="#FBFBFC" stroke-width="1"></circle>` : ''}
      ${a !== null && !isNaN(a) ? `<rect x="${aX}" y="${aY}" width="6.5" height="6.5" fill="#384152" stroke="#FBFBFC" stroke-width="1"></rect>` : ''}
      ${c !== null && !isNaN(c) ? `<polygon points="${cPts}" fill="#2F5FA8" stroke="#FBFBFC" stroke-width="1"></polygon>` : ''}
    </svg>
  `;
}

// Load JSON Dataset
async function loadDataset() {
  const candidateUrls = ["./hamlet_ui_analysis.json", "./src/hamlet_ui_analysis.json"];
  let loadedData = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        loadedData = await response.json();
        console.log(`Loaded dataset from ${url}`);
        break;
      }
    } catch (e) {
      console.warn(`Failed loading from ${url}:`, e);
    }
  }

  if (!loadedData) {
    console.error("Failed to load hamlet_ui_analysis.json");
    document.getElementById("app-container").innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--warn-ink);">
        <h2>Unable to load translation analysis dataset</h2>
        <p>Ensure <code>hamlet_ui_analysis.json</code> is accessible in the server root.</p>
      </div>
    `;
    return;
  }

  // Process data & initialize state
  state.data = processDataset(loadedData);
  if (state.data.acts.length > 0) {
    state.selectedAct = state.data.acts[0].act;
    if (state.data.acts[0].scenes.length > 0) {
      state.selectedSceneId = state.data.acts[0].scenes[0].scene_id;
    }
  }

  initApp();
}

// Process dataset and compute weighted aggregates & review counts
function processDataset(raw) {
  const processed = JSON.parse(JSON.stringify(raw));

  processed.acts.forEach((act) => {
    act.scenes.forEach((scene) => {
      // Compute dimension scores for each translation if not explicitly present
      scene.computedScores = {};
      scene.unitsCount = {};
      scene.reviewCount = 0;

      VERSIONS.forEach((v) => {
        scene.computedScores[v.key] = {};
        scene.unitsCount[v.key] = {};

        DIMENSIONS.forEach((dim) => {
          let totalWeight = 0;
          let weightedSum = 0;
          let applicableCount = 0;

          scene.dialogues.forEach((d) => {
            const analysis = d.analysis && d.analysis[v.key] && d.analysis[v.key][dim.key];
            if (analysis && analysis.applicable && analysis.score !== null && analysis.score !== undefined) {
              const enLen = codePointLength(d.texts.english);
              totalWeight += enLen;
              weightedSum += Number(analysis.score) * enLen;
              applicableCount++;
            }
          });

          scene.unitsCount[v.key][dim.key] = applicableCount;
          scene.computedScores[v.key][dim.key] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
        });
      });

      // Count review flags in scene
      let flags = 0;
      scene.dialogues.forEach((d) => {
        let diagHasReview = false;
        VERSIONS.forEach((v) => {
          DIMENSIONS.forEach((dim) => {
            const analysis = d.analysis && d.analysis[v.key] && d.analysis[v.key][dim.key];
            if (analysis) {
              if (analysis.needs_review) diagHasReview = true;
              if (analysis.evidence) {
                analysis.evidence.forEach((ev) => {
                  if (ev.verified === false) diagHasReview = true;
                });
              }
            }
          });
        });
        if (diagHasReview) flags++;
      });
      scene.reviewCount = flags;

      // Extract semantic scores for dashboard
      const hSem = scene.computedScores.human_german.semantic;
      const aSem = scene.computedScores.ai_german.semantic;
      const cSem = scene.computedScores.context_ai_german.semantic;
      const validSem = [hSem, aSem, cSem].filter((s) => s !== null && !isNaN(s));

      scene.semanticScores = {
        h: hSem,
        a: aSem,
        c: cSem,
        spread: validSem.length > 0 ? Math.round((Math.max(...validSem) - Math.min(...validSem)) * 10) / 10 : 0,
        lowest: validSem.length > 0 ? Math.min(...validSem) : 100
      };
    });
  });

  return processed;
}

// Get All Scenes across acts
function getAllScenes() {
  const scenes = [];
  if (!state.data || !state.data.acts) return scenes;
  state.data.acts.forEach((act) => {
    act.scenes.forEach((sc) => scenes.push(sc));
  });
  return scenes;
}

function getCurrentScene() {
  const all = getAllScenes();
  return all.find((s) => s.scene_id === state.selectedSceneId) || all[0];
}

// Compute Ranking Heuristic for "Study First"
function computeSceneRankings(scenes, mode) {
  if (scenes.length === 0) return [];

  const spreads = scenes.map((s) => s.semanticScores.spread);
  const reviews = scenes.map((s) => s.reviewCount);
  const lowest = scenes.map((s) => s.semanticScores.lowest);

  const minSpread = Math.min(...spreads), maxSpread = Math.max(...spreads);
  const minRev = Math.min(...reviews), maxRev = Math.max(...reviews);
  const minLow = Math.min(...lowest), maxLow = Math.max(...lowest);

  return scenes.slice().sort((a, b) => {
    if (mode === "spread") return b.semanticScores.spread - a.semanticScores.spread;
    if (mode === "flags") return b.reviewCount - a.reviewCount;
    if (mode === "ctx") {
      const effA = Math.abs((a.semanticScores.c || 0) - (a.semanticScores.a || 0));
      const effB = Math.abs((b.semanticScores.c || 0) - (b.semanticScores.a || 0));
      return effB - effA;
    }
    if (mode === "low") return a.semanticScores.lowest - b.semanticScores.lowest;

    // Recommended Heuristic
    const normSpreadA = maxSpread > minSpread ? (a.semanticScores.spread - minSpread) / (maxSpread - minSpread) : 0;
    const normRevA = maxRev > minRev ? (a.reviewCount - minRev) / (maxRev - minRev) : 0;
    const normLowA = maxLow > minLow ? (maxLow - a.semanticScores.lowest) / (maxLow - minLow) : 0;
    const scoreA = 0.4 * normSpreadA + 0.35 * normRevA + 0.25 * normLowA;

    const normSpreadB = maxSpread > minSpread ? (b.semanticScores.spread - minSpread) / (maxSpread - minSpread) : 0;
    const normRevB = maxRev > minRev ? (b.reviewCount - minRev) / (maxRev - minRev) : 0;
    const normLowB = maxLow > minLow ? (maxLow - b.semanticScores.lowest) / (maxLow - minLow) : 0;
    const scoreB = 0.4 * normSpreadB + 0.35 * normRevB + 0.25 * normLowB;

    return scoreB - scoreA;
  });
}

// Initialize Application UI
function initApp() {
  setupNavigation();
  setupFilterControls();
  setupValidationForm();
  renderApp();
}

// Navigation event bindings
function setupNavigation() {
  // Top Header Views
  document.getElementById("nav-btn-read").addEventListener("click", () => switchPage("read"));
  document.getElementById("nav-btn-heatmap").addEventListener("click", () => switchPage("heatmap"));
  document.getElementById("nav-btn-queue").addEventListener("click", () => switchPage("queue"));

  // Study Sort Dropdown
  document.getElementById("study-sort-select").addEventListener("change", (e) => {
    state.studyMode = e.target.value;
    const hints = {
      rec: "Combines how far apart the three versions are, how many phrases need review, and the lowest score.",
      spread: "Scenes where Human, AI and Context AI scores are furthest apart.",
      flags: "Scenes with the most phrases flagged for expert review.",
      ctx: "Scenes where adding dramatic context changed the AI translation most.",
      low: "Scenes where at least one translation preserves the least."
    };
    document.getElementById("study-mode-hint").textContent = hints[state.studyMode] || "";
    renderStudyFirst();
  });

  // Speech Strip Preview Toggle
  const stripToggle = document.getElementById("speech-strip-toggle");
  stripToggle.addEventListener("click", () => {
    state.speechStripOpen = !state.speechStripOpen;
    stripToggle.setAttribute("aria-expanded", state.speechStripOpen ? "true" : "false");
    document.getElementById("speech-strip-chev").style.transform = state.speechStripOpen ? "rotate(90deg)" : "rotate(0deg)";
    document.getElementById("speech-strip-toggle-label").textContent = state.speechStripOpen ? "Hide dialogue previews" : "Show dialogue previews";
    document.getElementById("speech-strip-content").style.display = state.speechStripOpen ? "block" : "none";
  });

  // Dimension Dropdown in Reading Section
  document.getElementById("dimension-select").addEventListener("change", (e) => {
    state.selectedDimension = e.target.value;
    state.activeInspectorDim = e.target.value;
    renderDimensionMatrix();
    renderParallelReading();
    if (state.activeDialogueId) renderInspector();
  });

  // Inspector Dimension Dropdown
  document.getElementById("insp-dim-select").addEventListener("change", (e) => {
    state.selectedDimension = e.target.value;
    state.activeInspectorDim = e.target.value;
    document.getElementById("dimension-select").value = e.target.value;
    renderDimensionMatrix();
    renderParallelReading();
    renderInspector();
  });

  // Inspector Close Button
  document.getElementById("insp-close-btn").addEventListener("click", () => {
    state.activeDialogueId = null;
    document.getElementById("inspector-panel").style.display = "none";
    updateAnalysisLevel(3);
    renderParallelReading();
  });

  // Heatmap Controls
  document.querySelectorAll("#heatmap-mode-group .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#heatmap-mode-group .filter-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      state.heatmapMode = btn.dataset.hmMode;
      renderHeatmap();
    });
  });

  document.getElementById("heatmap-act-select").addEventListener("change", (e) => {
    state.heatmapAct = e.target.value;
    renderHeatmap();
  });

  document.getElementById("heatmap-highlight-select").addEventListener("change", (e) => {
    state.heatmapMax = e.target.value;
    renderHeatmap();
  });

  // Queue Controls
  document.querySelectorAll("#queue-status-group .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#queue-status-group .filter-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      state.queueStatus = btn.dataset.qStatus;
      renderValidationQueue();
    });
  });

  document.getElementById("queue-issue-select").addEventListener("change", (e) => {
    state.queueIssue = e.target.value;
    renderValidationQueue();
  });

  // Tooltip mouseleave
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ev-span")) {
      clearLinkedSpans();
    }
  });
}

function setupFilterControls() {
  document.querySelectorAll("#filter-btn-group .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filter-btn-group .filter-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      state.filter = btn.dataset.filter;
      renderParallelReading();
    });
  });
}

function setupValidationForm() {
  let valTarget = "ai_german";
  let valVerdict = null;

  document.querySelectorAll("#val-target-bar .val-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#val-target-bar .val-pill-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      valTarget = btn.dataset.target;
    });
  });

  document.querySelectorAll("#val-verdict-bar .val-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#val-verdict-bar .val-pill-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      valVerdict = btn.dataset.verdict;
    });
  });

  document.getElementById("expert-validation-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.activeDialogueId) return;

    const classification = document.getElementById("val-classification").value;
    const comment = document.getElementById("val-comment").value;
    const reviewer = document.getElementById("val-reviewer").value;

    state.validations[state.activeDialogueId] = {
      target: valTarget,
      verdict: valVerdict || "Reviewed",
      classification,
      comment,
      reviewer,
      timestamp: new Date().toISOString()
    };

    const statusEl = document.getElementById("val-save-status");
    statusEl.textContent = `Saved for ${state.activeDialogueId}`;
    statusEl.style.display = "inline";
    setTimeout(() => { statusEl.style.display = "none"; }, 3000);

    updateQueueBadges();
    renderValidationQueue();
  });
}

function switchPage(page) {
  state.page = page;
  document.querySelectorAll(".nav-tab-btn").forEach((b) => b.removeAttribute("aria-current"));
  
  if (page === "read") {
    document.getElementById("nav-btn-read").setAttribute("aria-current", "page");
    document.getElementById("view-read").style.display = "block";
    document.getElementById("view-heatmap").style.display = "none";
    document.getElementById("view-queue").style.display = "none";
  } else if (page === "heatmap") {
    document.getElementById("nav-btn-heatmap").setAttribute("aria-current", "page");
    document.getElementById("view-read").style.display = "none";
    document.getElementById("view-heatmap").style.display = "block";
    document.getElementById("view-queue").style.display = "none";
    renderHeatmap();
  } else if (page === "queue") {
    document.getElementById("nav-btn-queue").setAttribute("aria-current", "page");
    document.getElementById("view-read").style.display = "none";
    document.getElementById("view-heatmap").style.display = "none";
    document.getElementById("view-queue").style.display = "block";
    renderValidationQueue();
  }
}

function renderApp() {
  updateQueueBadges();
  renderTocActTabs();
  renderSceneTable();
  renderSpeechPreviewList();
  renderStudyFirst();
  renderBreadcrumbs();
  renderDimensionMatrix();
  renderParallelReading();
}

function updateQueueBadges() {
  const queueItems = collectValidationQueueItems();
  const reviewedCount = queueItems.filter((q) => state.validations[q.dialogue_id]).length;
  const openCount = queueItems.length - reviewedCount;
  
  const badge = document.getElementById("nav-queue-badge");
  badge.textContent = openCount;

  document.getElementById("queue-tab-open").textContent = `Open (${openCount})`;
  document.getElementById("queue-tab-done").textContent = `Reviewed (${reviewedCount})`;
  document.getElementById("queue-tab-all").textContent = `All (${queueItems.length})`;
  
  const progressText = `${reviewedCount} of ${queueItems.length} flagged items reviewed`;
  document.getElementById("queue-progress-text").textContent = progressText;
  const pct = queueItems.length > 0 ? (reviewedCount / queueItems.length) * 100 : 0;
  document.getElementById("queue-progress-fill").style.width = `${pct}%`;
}

// Render Act navigation tabs
function renderTocActTabs() {
  const container = document.getElementById("act-tab-group");
  container.innerHTML = "";

  const actCount = state.data.acts.length;
  const sceneCount = getAllScenes().length;
  document.getElementById("toc-acts-scenes-count").textContent = `${actCount} act${actCount > 1 ? 's' : ''}, ${sceneCount} scene${sceneCount > 1 ? 's' : ''}`;

  state.data.acts.forEach((act) => {
    const isCurrent = act.act === state.selectedAct;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "act-tab-btn";
    btn.setAttribute("aria-pressed", isCurrent ? "true" : "false");
    btn.innerHTML = `Act ${act.act}`;
    
    btn.addEventListener("click", () => {
      state.selectedAct = act.act;
      if (act.scenes.length > 0) {
        state.selectedSceneId = act.scenes[0].scene_id;
      }
      renderTocActTabs();
      renderSceneTable();
      renderBreadcrumbs();
      renderDimensionMatrix();
      renderParallelReading();
      renderSpeechPreviewList();
    });

    container.appendChild(btn);
  });
}

// Render Scene comparison table
function renderSceneTable() {
  const container = document.getElementById("scene-table-rows");
  container.innerHTML = "";

  const act = state.data.acts.find((a) => a.act === state.selectedAct) || state.data.acts[0];
  if (!act) return;

  const allScenes = getAllScenes();
  const ranked = computeSceneRankings(allScenes, "rec");

  act.scenes.forEach((scene) => {
    const isCurrent = scene.scene_id === state.selectedSceneId;
    const rankIdx = ranked.findIndex((s) => s.scene_id === scene.scene_id);
    const studyRank = rankIdx >= 0 && rankIdx < 5 ? `Study #${rankIdx + 1}` : "";

    const h = scene.semanticScores.h;
    const a = scene.semanticScores.a;
    const c = scene.semanticScores.c;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "scene-row-btn rowbtn";
    row.setAttribute("aria-current", isCurrent ? "true" : "false");

    row.innerHTML = `
      <span style="display:flex; flex-direction:column; line-height:1.25">
        <span style="font-weight:600">Scene ${scene.scene_number || scene.scene_id}</span>
        ${studyRank ? `<span style="font-size:11px; font-weight:600; color:var(--accent-ink)">${studyRank}</span>` : ''}
      </span>
      <span style="color:var(--ink-2); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${scene.title || 'Act ' + act.act + ', Scene ' + scene.scene_number}</span>
      <div>
        ${renderComparisonSvg(h, a, c, 80, 100, 150)}
      </div>
      <span class="score-cell ${getScoreClass(h)}">${formatScore(h)}</span>
      <span class="score-cell ${getScoreClass(a)}">${formatScore(a)}</span>
      <span class="score-cell ${getScoreClass(c)}">${formatScore(c)}</span>
      <span style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600">${scene.semanticScores.spread}</span>
      <span style="text-align:right; font-variant-numeric:tabular-nums">${scene.reviewCount}</span>
    `;

    row.addEventListener("click", () => {
      state.selectedSceneId = scene.scene_id;
      renderSceneTable();
      renderBreadcrumbs();
      renderDimensionMatrix();
      renderParallelReading();
      renderSpeechPreviewList();
    });

    container.appendChild(row);
  });
}

// Render collapsible Speech preview list
function renderSpeechPreviewList() {
  const container = document.getElementById("speech-preview-list");
  container.innerHTML = "";

  const scene = getCurrentScene();
  if (!scene || !scene.dialogues) return;

  const previewItems = scene.dialogues.slice(0, 10);
  previewItems.forEach((d, i) => {
    const li = document.createElement("li");
    li.className = "speech-preview-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "speech-preview-btn rowbtn";
    
    // Check if dialogue has review
    let hasRev = false;
    VERSIONS.forEach((v) => {
      const ana = d.analysis && d.analysis[v.key] && d.analysis[v.key][state.selectedDimension];
      if (ana && ana.needs_review) hasRev = true;
    });

    btn.innerHTML = `
      <span style="font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; width:18px; flex:none">${i + 1}</span>
      <span style="display:flex; flex-direction:column; min-width:0; width:100%">
        <span style="font-size:12px; font-weight:600; color:var(--ink-2); display:flex; justify-content:space-between">
          <span>${d.speaker}</span>
          ${hasRev ? `<span style="font-size:11px; color:var(--warn-ink)">Review</span>` : ''}
        </span>
        <span style="font-family:'Source Serif 4', serif; font-size:14px; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${d.texts.english}</span>
      </span>
    `;

    btn.addEventListener("click", () => {
      openInspector(d.dialogue_id);
    });

    li.appendChild(btn);
    container.appendChild(li);
  });
}

// Render Study-First recommendations panel
function renderStudyFirst() {
  const container = document.getElementById("study-first-list");
  container.innerHTML = "";

  const allScenes = getAllScenes();
  const ranked = computeSceneRankings(allScenes, state.studyMode);
  const top5 = ranked.slice(0, 5);

  top5.forEach((scene, i) => {
    const isCurrent = scene.scene_id === state.selectedSceneId;
    const h = scene.semanticScores.h;
    const a = scene.semanticScores.a;
    const c = scene.semanticScores.c;

    // Reason description
    const mn = Math.min(...[h, a, c].filter((v) => v !== null && !isNaN(v)));
    const who = h === mn ? "Human" : a === mn ? "AI" : "Context AI";
    let reasonText = `${scene.semanticScores.spread}-pt spread, ${scene.reviewCount} to review, ${who} lowest`;
    if (state.studyMode === "spread") reasonText = `Scores ${scene.semanticScores.spread} points apart`;
    if (state.studyMode === "flags") reasonText = `${scene.reviewCount} phrases flagged for review`;
    if (state.studyMode === "ctx") reasonText = `Context AI ${c - a >= 0 ? '+' : ''}${Math.round((c - a) * 10) / 10} against AI`;
    if (state.studyMode === "low") reasonText = `Lowest: ${who} at ${mn}`;

    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-row-btn rowbtn";
    btn.setAttribute("aria-current", isCurrent ? "true" : "false");

    btn.innerHTML = `
      <span style="font-weight:600; font-variant-numeric:tabular-nums; color:var(--accent-ink)">${i + 1}</span>
      <span style="display:flex; flex-direction:column; line-height:1.3; min-width:0">
        <span style="font-weight:600; font-size:14px">${scene.title || scene.scene_id}</span>
        <span style="font-size:12px; color:var(--muted)">${reasonText}</span>
      </span>
      <div>
        ${renderComparisonSvg(h, a, c, 80, 100, 120)}
      </div>
    `;

    btn.addEventListener("click", () => {
      state.selectedAct = scene.act;
      state.selectedSceneId = scene.scene_id;
      renderApp();
    });

    li.appendChild(btn);
    container.appendChild(li);
  });
}

// Render Breadcrumbs and Analysis Levels
function renderBreadcrumbs() {
  const container = document.getElementById("breadcrumb-nav");
  container.innerHTML = "";

  const scene = getCurrentScene();
  const act = state.data.acts.find((a) => a.act === state.selectedAct) || state.data.acts[0];

  const crumbs = [
    { label: "Hamlet", action: () => { renderApp(); } },
    { label: `Act ${act.act}`, action: () => { renderApp(); } },
    { label: `Scene ${scene.scene_number || scene.scene_id}`, current: !state.activeDialogueId, action: () => { state.activeDialogueId = null; document.getElementById("inspector-panel").style.display = "none"; renderApp(); } }
  ];

  if (state.activeDialogueId) {
    const diag = scene.dialogues.find((d) => d.dialogue_id === state.activeDialogueId);
    crumbs.push({ label: `${diag ? diag.speaker : ''} (${state.activeDialogueId})`, current: true });
  }

  crumbs.forEach((crumb, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "crumb-separator";
      sep.textContent = "/";
      container.appendChild(sep);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "crumb-btn";
    if (crumb.current) {
      btn.setAttribute("aria-current", "page");
    }
    btn.textContent = crumb.label;
    if (crumb.action) {
      btn.addEventListener("click", crumb.action);
    }
    container.appendChild(btn);
  });

  updateAnalysisLevel(state.activeDialogueId ? 4 : 1);
}

function updateAnalysisLevel(level) {
  document.querySelectorAll(".level-step").forEach((el) => el.classList.remove("active"));
  for (let i = 1; i <= level; i++) {
    const el = document.getElementById(`lvl-l${i}`);
    if (el) el.classList.add("active");
  }
}

// Render Dimension Score Matrix
function renderDimensionMatrix() {
  const container = document.getElementById("dimension-matrix-rows");
  container.innerHTML = "";

  const scene = getCurrentScene();
  if (!scene) return;

  document.getElementById("scene-heading-title").textContent = scene.title || `Act ${scene.act}, Scene ${scene.scene_number}`;
  const dCount = scene.dialogues ? scene.dialogues.length : 0;
  document.getElementById("scene-heading-desc").textContent = `${dCount} dialogues analyzed (${dCount > 0 ? scene.dialogues[0].dialogue_id + ' to ' + scene.dialogues[dCount - 1].dialogue_id : ''}).`;

  DIMENSIONS.forEach((dim) => {
    const isSelected = dim.key === state.selectedDimension;
    const h = scene.computedScores.human_german[dim.key];
    const a = scene.computedScores.ai_german[dim.key];
    const c = scene.computedScores.context_ai_german[dim.key];

    const unitsHuman = scene.unitsCount.human_german[dim.key] || 0;
    const unitsAI = scene.unitsCount.ai_german[dim.key] || 0;
    const unitsCtx = scene.unitsCount.context_ai_german[dim.key] || 0;
    const maxUnits = Math.max(unitsHuman, unitsAI, unitsCtx);
    const isLow = maxUnits < 4;

    const ctxEffect = (c !== null && a !== null) ? Math.round((c - a) * 10) / 10 : null;
    let effFormatted = "N/A";
    let effColor = "var(--muted)";
    if (ctxEffect !== null) {
      effFormatted = (ctxEffect > 0 ? `+${ctxEffect}` : `${ctxEffect}`);
      effColor = ctxEffect > 0 ? "#1E6B3A" : ctxEffect < 0 ? "var(--warn-ink)" : "var(--ink-2)";
    }

    const row = document.createElement("button");
    row.type = "button";
    row.className = "matrix-row-btn rowbtn";
    row.setAttribute("aria-pressed", isSelected ? "true" : "false");

    row.innerHTML = `
      <span style="font-weight:${isSelected ? '600' : '500'}">${dim.name}</span>
      <div>
        ${renderComparisonSvg(h, a, c, 60, 100, 130)}
      </div>
      <span class="score-cell ${getScoreClass(h)}">${formatScore(h)}</span>
      <span class="score-cell ${getScoreClass(a)}">${formatScore(a)}</span>
      <span class="score-cell ${getScoreClass(c)}">${formatScore(c)}</span>
      <span style="text-align:right; font-size:13px; font-variant-numeric:tabular-nums; ${isLow ? 'color:var(--warn-ink); font-weight:600' : 'color:var(--muted)'}">
        ${maxUnits}/${dCount}${isLow ? ' low' : ''}
      </span>
      <span style="text-align:right; padding-right:8px; font-weight:600; font-variant-numeric:tabular-nums; color:${effColor}">
        ${effFormatted}
      </span>
    `;

    row.addEventListener("click", () => {
      state.selectedDimension = dim.key;
      state.activeInspectorDim = dim.key;
      document.getElementById("dimension-select").value = dim.key;
      renderDimensionMatrix();
      renderParallelReading();
      if (state.activeDialogueId) renderInspector();
    });

    container.appendChild(row);
  });
}

// Segmenter: Slices text into exact Unicode code-point non-overlapping spans
function buildHighlightedSegments(text, spanList, versionKey, dialogueId, dimKey) {
  const container = document.createElement("span");
  container.className = "literary-text";

  if (!text) {
    const italic = document.createElement("span");
    italic.style.color = "var(--muted)";
    italic.style.fontStyle = "italic";
    italic.textContent = "[No text in translation]";
    container.appendChild(italic);
    return container;
  }

  const codePoints = Array.from(text);
  const textLength = codePoints.length;

  if (!spanList || spanList.length === 0) {
    container.appendChild(document.createTextNode(text));
    return container;
  }

  // Find all boundary cut points
  const cutPoints = new Set([0, textLength]);
  spanList.forEach((sp) => {
    const s = Math.max(0, Math.min(textLength, sp.start));
    const e = Math.max(0, Math.min(textLength, sp.end));
    cutPoints.add(s);
    cutPoints.add(e);
  });

  const sortedCuts = Array.from(cutPoints).sort((a, b) => a - b);

  for (let i = 0; i < sortedCuts.length - 1; i++) {
    const start = sortedCuts[i];
    const end = sortedCuts[i + 1];
    if (start >= end) continue;

    const segmentText = codePoints.slice(start, end).join("");
    // Find active spans covering this slice
    const active = spanList.filter((sp) => sp.start <= start && sp.end >= end);

    if (active.length === 0) {
      container.appendChild(document.createTextNode(segmentText));
    } else {
      const primary = active[0];
      const spanEl = document.createElement("span");
      spanEl.className = "ev-span";
      spanEl.textContent = segmentText;

      const st = (primary.status || "Preserved").toLowerCase();
      if (primary.isSource) {
        spanEl.classList.add("ev-span-source-cue");
      } else {
        if (st.includes("preserv")) spanEl.classList.add("ev-span-preserved");
        else if (st.includes("chang")) spanEl.classList.add("ev-span-changed");
        else if (st.includes("lost")) spanEl.classList.add("ev-span-lost");
        else if (st.includes("add")) spanEl.classList.add("ev-span-added");
        else spanEl.classList.add("ev-span-preserved");
      }

      if (primary.needs_review) {
        spanEl.classList.add("ev-span-review");
      }

      // Unique ID for linking
      const spanLinkId = `${dialogueId}_${primary.evidenceIndex || 0}`;
      spanEl.dataset.linkId = spanLinkId;
      spanEl.dataset.dialogueId = dialogueId;
      spanEl.dataset.version = versionKey;
      spanEl.dataset.dim = dimKey;

      if (state.activeLinkedSpanId === spanLinkId) {
        spanEl.classList.add("ev-span-active-link");
      }

      // Hover Tooltip events
      spanEl.addEventListener("mouseenter", (e) => showTooltip(e, primary, versionKey, dimKey));
      spanEl.addEventListener("mouseleave", hideTooltip);

      // Click to link & inspect
      spanEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLinkedSpan(spanLinkId, dialogueId);
      });

      container.appendChild(spanEl);
    }
  }

  return container;
}

// Render Read the scene (5-column parallel comparison)
function renderParallelReading() {
  const container = document.getElementById("parallel-reading-rows");
  container.innerHTML = "";

  const scene = getCurrentScene();
  if (!scene || !scene.dialogues) return;

  const dimKey = state.selectedDimension;
  let visibleCount = 0;

  scene.dialogues.forEach((d) => {
    // Check filter criteria
    let isDiff = false;
    let needsRev = false;

    VERSIONS.forEach((v) => {
      const ana = d.analysis && d.analysis[v.key] && d.analysis[v.key][dimKey];
      if (ana) {
        if (ana.needs_review) needsRev = true;
        const st = (ana.status || "").toLowerCase();
        if (st.includes("chang") || st.includes("lost") || st.includes("add")) isDiff = true;
        if (ana.evidence) {
          ana.evidence.forEach((ev) => {
            const evSt = (ev.status || "").toLowerCase();
            if (evSt.includes("chang") || evSt.includes("lost") || evSt.includes("add")) isDiff = true;
            if (ev.verified === false) needsRev = true;
          });
        }
      }
    });

    if (state.filter === "diff" && !isDiff) return;
    if (state.filter === "review" && !needsRev) return;
    visibleCount++;

    const isInspected = state.activeDialogueId === d.dialogue_id;
    const rowEl = document.createElement("div");
    rowEl.style.display = "contents";

    // Collect source spans across all 3 translations for this dimension
    const sourceSpans = [];
    VERSIONS.forEach((v) => {
      const ana = d.analysis && d.analysis[v.key] && d.analysis[v.key][dimKey];
      if (ana && ana.evidence) {
        ana.evidence.forEach((ev, evIdx) => {
          if (ev.source_span) {
            sourceSpans.push({
              start: ev.source_span.start,
              end: ev.source_span.end,
              status: ev.status,
              isSource: true,
              evidence: ev,
              evidenceIndex: evIdx,
              needs_review: ana.needs_review || ev.verified === false,
              explanation: ev.explanation || ana.explanation,
              confidence: ana.confidence,
              score: ana.score
            });
          }
        });
      }
    });

    // 1. Speech Column
    const colSpeech = document.createElement("div");
    colSpeech.className = "speech-col-cell";
    if (isInspected) colSpeech.style.background = "var(--accent-soft)";

    colSpeech.innerHTML = `
      <span class="speech-speaker">${d.speaker}</span>
      <span class="speech-id">${d.dialogue_id}</span>
      <button type="button" class="inspect-btn press" aria-pressed="${isInspected ? 'true' : 'false'}">Inspect</button>
    `;

    colSpeech.querySelector(".inspect-btn").addEventListener("click", () => {
      openInspector(d.dialogue_id);
    });
    rowEl.appendChild(colSpeech);

    // 2. English Column
    const colEnglish = document.createElement("div");
    colEnglish.className = "text-col-cell";
    if (isInspected) colEnglish.style.background = "var(--accent-soft)";
    colEnglish.appendChild(buildHighlightedSegments(d.texts.english, sourceSpans, "english", d.dialogue_id, dimKey));
    rowEl.appendChild(colEnglish);

    // 3, 4, 5. German Translation Columns
    VERSIONS.forEach((v) => {
      const colVer = document.createElement("div");
      colVer.className = "text-col-cell";
      if (isInspected) colVer.style.background = "var(--accent-soft)";

      const ana = d.analysis && d.analysis[v.key] && d.analysis[v.key][dimKey];
      const targetSpans = [];

      if (ana && ana.evidence) {
        ana.evidence.forEach((ev, evIdx) => {
          if (ev.target_span) {
            targetSpans.push({
              start: ev.target_span.start,
              end: ev.target_span.end,
              status: ev.status || ana.status,
              isSource: false,
              evidence: ev,
              evidenceIndex: evIdx,
              needs_review: ana.needs_review || ev.verified === false,
              explanation: ev.explanation || ana.explanation,
              confidence: ana.confidence,
              score: ana.score
            });
          }
        });
      }

      // Status chip
      const statusText = ana ? (ana.applicable ? (ana.status || "Preserved") : "Not Applicable") : "N/A";
      const chipClass = getStatusChipClass(statusText);
      const isFlagged = ana && (ana.needs_review || (ana.evidence && ana.evidence.some(e => e.verified === false)));

      const chipEl = document.createElement("span");
      chipEl.className = `status-chip ${chipClass} ${isFlagged ? 'chip-review-flag' : ''}`;
      chipEl.textContent = statusText;
      colVer.appendChild(chipEl);

      const targetText = d.texts[v.key];
      colVer.appendChild(buildHighlightedSegments(targetText, targetSpans, v.key, d.dialogue_id, dimKey));

      rowEl.appendChild(colVer);
    });

    container.appendChild(rowEl);
  });

  document.getElementById("read-evidence-summary").textContent = `Showing ${visibleCount} of ${scene.dialogues.length} dialogues`;
  document.getElementById("reading-no-rows").style.display = visibleCount === 0 ? "block" : "none";
}

function getStatusChipClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("preserv")) return "chip-preserved";
  if (s.includes("chang")) return "chip-changed";
  if (s.includes("lost")) return "chip-lost";
  if (s.includes("add")) return "chip-added";
  return "chip-na";
}

// Bidirectional Link Highlighting
function toggleLinkedSpan(spanLinkId, dialogueId) {
  if (state.activeLinkedSpanId === spanLinkId) {
    clearLinkedSpans();
  } else {
    state.activeLinkedSpanId = spanLinkId;
    document.querySelectorAll(".ev-span").forEach((span) => {
      if (span.dataset.linkId === spanLinkId) {
        span.classList.add("ev-span-active-link");
      } else {
        span.classList.remove("ev-span-active-link");
      }
    });
  }
}

function clearLinkedSpans() {
  state.activeLinkedSpanId = null;
  document.querySelectorAll(".ev-span").forEach((s) => s.classList.remove("ev-span-active-link"));
}

// Tooltip display
function showTooltip(e, spanData, versionKey, dimKey) {
  const tt = document.getElementById("evidence-tooltip");
  const dim = DIMENSIONS.find((d) => d.key === dimKey) || { name: dimKey };
  const ver = VERSIONS.find((v) => v.key === versionKey) || { name: versionKey === "english" ? "English source" : versionKey };

  document.getElementById("tt-dimension").textContent = dim.name;
  document.getElementById("tt-version").textContent = ver.name;

  const stChip = document.getElementById("tt-status");
  stChip.className = `status-chip ${getStatusChipClass(spanData.status)}`;
  stChip.textContent = spanData.status || "Preserved";

  document.getElementById("tt-score").textContent = spanData.score !== undefined ? `Score: ${formatScore(spanData.score)}` : "";
  document.getElementById("tt-confidence").textContent = spanData.confidence !== undefined ? `Conf: ${spanData.confidence}` : "";

  const ev = spanData.evidence;
  const quoteHtml = ev ? `<strong>Quote:</strong> “${ev.source_quote || ''}” → “${ev.target_quote || ''}”` : "";
  document.getElementById("tt-quotes").innerHTML = quoteHtml;

  document.getElementById("tt-explanation").textContent = spanData.explanation || (ev ? ev.explanation : "No additional explanation");

  tt.classList.add("visible");
  const rect = e.target.getBoundingClientRect();
  tt.style.left = `${Math.min(window.innerWidth - 330, Math.max(10, rect.left))}px`;
  tt.style.top = `${rect.bottom + 8}px`;
}

function hideTooltip() {
  document.getElementById("evidence-tooltip").classList.remove("visible");
}

// Open Evidence Inspector
function openInspector(dialogueId) {
  state.activeDialogueId = dialogueId;
  const panel = document.getElementById("inspector-panel");
  panel.style.display = "flex";

  renderBreadcrumbs();
  renderInspector();
  renderParallelReading();
}

function renderInspector() {
  const scene = getCurrentScene();
  if (!scene) return;

  const diag = scene.dialogues.find((d) => d.dialogue_id === state.activeDialogueId);
  if (!diag) return;

  const dimKey = state.activeInspectorDim || state.selectedDimension;
  const dim = DIMENSIONS.find((d) => d.key === dimKey) || { name: dimKey };

  document.getElementById("insp-where").textContent = `${diag.dialogue_id} (${scene.title || scene.scene_id})`;
  document.getElementById("insp-speaker").textContent = diag.speaker;
  document.getElementById("insp-dimension").textContent = dim.name;
  document.getElementById("insp-dim-select").value = dimKey;

  // Check applicability
  const anyApplicable = VERSIONS.some((v) => {
    const ana = diag.analysis && diag.analysis[v.key] && diag.analysis[v.key][dimKey];
    return ana && ana.applicable;
  });
  document.getElementById("insp-applicable").textContent = anyApplicable ? "Yes" : "Not applicable — no evidence for this dimension";

  // Check review alert
  let hasReview = false;
  let reviewText = "";
  VERSIONS.forEach((v) => {
    const ana = diag.analysis && diag.analysis[v.key] && diag.analysis[v.key][dimKey];
    if (ana && ana.needs_review) {
      hasReview = true;
      reviewText = `${v.name} flagged: ${ana.explanation || 'Requires expert assessment'}`;
    }
    if (ana && ana.evidence) {
      ana.evidence.forEach((ev) => {
        if (ev.verified === false) {
          hasReview = true;
          reviewText = `Unverified evidence pair: “${ev.source_quote}” → “${ev.target_quote}”`;
        }
      });
    }
  });

  const reviewAlertEl = document.getElementById("insp-review-alert");
  if (hasReview) {
    reviewAlertEl.style.display = "block";
    document.getElementById("insp-review-text").textContent = reviewText;
  } else {
    reviewAlertEl.style.display = "none";
  }

  // Version rows
  const versionsList = document.getElementById("insp-versions-list");
  versionsList.innerHTML = "";

  // English source row
  const enRow = document.createElement("div");
  enRow.className = "insp-version-row";
  enRow.innerHTML = `
    <div class="insp-version-row-head">
      <span class="insp-version-name">English source</span>
      <span class="status-chip" style="background:var(--ink); color:var(--on-dark); font-size:11px">Source</span>
    </div>
    <span style="font-family:'Source Serif 4', serif; font-size:15px; line-height:1.5">${diag.texts.english}</span>
  `;
  versionsList.appendChild(enRow);

  let collectiveExpl = "";
  const evItemsContainer = document.getElementById("insp-evidence-items");
  evItemsContainer.innerHTML = "";

  VERSIONS.forEach((v) => {
    const ana = diag.analysis && diag.analysis[v.key] && diag.analysis[v.key][dimKey];
    const isApp = ana && ana.applicable;
    const scoreVal = isApp ? formatScore(ana.score) : "N/A";
    const statusVal = isApp ? (ana.status || "Preserved") : "Not Applicable";
    const chipCls = getStatusChipClass(statusVal);

    if (ana && ana.explanation && !collectiveExpl) {
      collectiveExpl = ana.explanation;
    }

    const row = document.createElement("div");
    row.className = "insp-version-row";
    row.innerHTML = `
      <div class="insp-version-row-head">
        <span class="insp-version-name">${v.name} (Score: ${scoreVal}, Conf: ${ana ? ana.confidence : 'N/A'})</span>
        <span class="status-chip ${chipCls}" style="font-size:11px">${statusVal}</span>
      </div>
      <span lang="de" style="font-family:'Source Serif 4', serif; font-size:15px; line-height:1.5">${diag.texts[v.key] || '[No translation]'}</span>
    `;
    versionsList.appendChild(row);

    // Evidence pairs
    if (ana && ana.evidence && ana.evidence.length > 0) {
      ana.evidence.forEach((ev) => {
        const item = document.createElement("div");
        item.style.padding = "6px 8px";
        item.style.background = "var(--surface-2)";
        item.style.borderRadius = "4px";
        item.innerHTML = `
          <div style="font-weight:600; font-size:12px; color:var(--ink-2); margin-bottom:2px">
            ${v.name}: “${ev.source_quote}” → “${ev.target_quote}”
            <span class="status-chip ${getStatusChipClass(ev.status)}" style="font-size:10px; line-height:16px; margin-left:6px">${ev.status}</span>
            ${ev.verified === false ? `<span style="font-size:10px; color:var(--warn-ink); margin-left:4px">Unverified</span>` : ''}
          </div>
          <div style="font-size:12px; color:var(--muted)">${ev.explanation || ''}</div>
          <div style="font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; margin-top:2px">
            Offsets: src [${ev.source_span ? ev.source_span.start + '-' + ev.source_span.end : 'none'}], tgt [${ev.target_span ? ev.target_span.start + '-' + ev.target_span.end : 'none'}]
          </div>
        `;
        evItemsContainer.appendChild(item);
      });
    }
  });

  if (evItemsContainer.children.length === 0) {
    evItemsContainer.innerHTML = `<span style="color:var(--muted); font-size:13px">${anyApplicable ? 'No exact evidence offsets extracted for this dimension.' : 'Not applicable — no evidence for this dimension.'}</span>`;
  }

  document.getElementById("insp-expl-text").textContent = collectiveExpl || (anyApplicable ? "No detailed explanation recorded." : "Not applicable — no evidence for this dimension.");

  // Pre-fill validation form if already validated
  const existingVal = state.validations[diag.dialogue_id];
  if (existingVal) {
    document.getElementById("val-classification").value = existingVal.classification || "No correction";
    document.getElementById("val-comment").value = existingVal.comment || "";
    document.getElementById("val-reviewer").value = existingVal.reviewer || "";
  } else {
    document.getElementById("val-classification").value = "No correction";
    document.getElementById("val-comment").value = "";
    document.getElementById("val-reviewer").value = "";
  }
}

// Render Evidence Heatmap
function renderHeatmap() {
  const container = document.getElementById("heatmap-rows-container");
  container.innerHTML = "";

  const actFilter = state.heatmapAct;
  const highlightFilter = state.heatmapMax;
  const isCmp = state.heatmapMode === "cmp";
  const isEff = state.heatmapMode === "eff";

  // Axis row
  document.getElementById("heatmap-axis-row").style.display = isCmp ? "grid" : "none";

  // Title and legend
  const legendScale = document.getElementById("heatmap-legend-scale");
  legendScale.innerHTML = "";

  if (isCmp) {
    document.getElementById("heatmap-legend-title").textContent = "Each cell: the three translations on a 60 to 100 line.";
    const scales = ["0-3 pts spread", "4-7", "8-12", "13+"];
    const colors = ["#F3F4F7", "#E4E7EC", "#D2D7DF", "#BEC5D0"];
    scales.forEach((s, idx) => {
      legendScale.innerHTML += `<span style="padding:1px 6px; border-radius:4px; font-weight:600; font-variant-numeric:tabular-nums; font-size:11px; background:${colors[idx]}; color:#1A1F2B">${s}</span>`;
    });
  } else if (isEff) {
    document.getElementById("heatmap-legend-title").textContent = "Context effect: Context AI minus AI";
    const scales = [
      { l: "-6 or less", bg: "#F2C4D3", fg: "#5C0F2B" },
      { l: "-5 to -1", bg: "#F9E1E9", fg: "#6E1A37" },
      { l: "0", bg: "#E9ECF1", fg: "#2A303C" },
      { l: "+1 to +5", bg: "#DCEFD9", fg: "#1E5631" },
      { l: "+6 or more", bg: "#BEE2B8", fg: "#15401F" }
    ];
    scales.forEach((s) => {
      legendScale.innerHTML += `<span style="padding:1px 6px; border-radius:4px; font-weight:600; font-variant-numeric:tabular-nums; font-size:11px; background:${s.bg}; color:${s.fg}">${s.l}</span>`;
    });
  } else {
    const ver = VERSIONS.find((v) => v.key === state.heatmapMode) || { name: state.heatmapMode };
    document.getElementById("heatmap-legend-title").textContent = `${ver.name} scores against English, 0 to 100:`;
    const scales = [
      { l: "below 60", bg: "#F2C4D3", fg: "#5C0F2B" },
      { l: "60-84", bg: "#F9E1E9", fg: "#6E1A37" },
      { l: "85-92", bg: "#E9ECF1", fg: "#2A303C" },
      { l: "93-96", bg: "#DCEFD9", fg: "#1E5631" },
      { l: "97-100", bg: "#BEE2B8", fg: "#15401F" }
    ];
    scales.forEach((s) => {
      legendScale.innerHTML += `<span style="padding:1px 6px; border-radius:4px; font-weight:600; font-variant-numeric:tabular-nums; font-size:11px; background:${s.bg}; color:${s.fg}">${s.l}</span>`;
    });
  }

  // Populate Act dropdown
  const actSelect = document.getElementById("heatmap-act-select");
  if (actSelect.options.length <= 1) {
    state.data.acts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = String(a.act);
      opt.textContent = `Act ${a.act}`;
      actSelect.appendChild(opt);
    });
  }

  state.data.acts.forEach((act) => {
    if (actFilter !== "all" && actFilter !== String(act.act)) return;

    // Act Header
    const actHead = document.createElement("div");
    actHead.style.padding = "12px 4px 4px";
    actHead.style.fontSize = "12px";
    actHead.style.fontWeight = "600";
    actHead.style.letterSpacing = "0.06em";
    actHead.style.textTransform = "uppercase";
    actHead.style.color = "var(--ink-2)";
    actHead.style.borderBottom = "1px solid var(--line)";
    actHead.textContent = `Act ${act.act}`;
    container.appendChild(actHead);

    act.scenes.forEach((scene) => {
      const row = document.createElement("div");
      row.className = "heatmap-scene-row";

      // 1. Scene Button
      const scBtn = document.createElement("button");
      scBtn.type = "button";
      scBtn.className = "rowbtn";
      scBtn.style.cssText = "display:flex; flex-direction:column; align-items:flex-start; border:0; background:transparent; font:inherit; color:var(--ink); text-align:left; padding:4px; min-height:44px; cursor:pointer; border-radius:4px";
      scBtn.innerHTML = `
        <span style="font-weight:600; font-size:14px">${scene.title || scene.scene_id}</span>
        <span style="font-size:12px; color:var(--muted)">Act ${act.act}, Scene ${scene.scene_number || scene.scene_id}</span>
      `;
      scBtn.addEventListener("click", () => {
        state.selectedAct = act.act;
        state.selectedSceneId = scene.scene_id;
        switchPage("read");
        renderApp();
      });
      row.appendChild(scBtn);

      // 8 Dimensions cells
      DIMENSIONS.forEach((dim) => {
        const h = scene.computedScores.human_german[dim.key];
        const a = scene.computedScores.ai_german[dim.key];
        const c = scene.computedScores.context_ai_german[dim.key];

        const cellBtn = document.createElement("button");
        cellBtn.type = "button";
        cellBtn.className = "press";
        cellBtn.style.cssText = "height:38px; border:0; border-radius:4px; font:inherit; cursor:pointer; padding:0 4px; display:flex; align-items:center; justify-content:center";

        if (isCmp) {
          if (h === null && a === null && c === null) {
            cellBtn.innerHTML = `<span style="color:var(--muted); font-size:11px">N/A</span>`;
            cellBtn.style.background = "transparent";
            cellBtn.style.border = "1px dashed var(--line)";
          } else {
            const valid = [h, a, c].filter((v) => v !== null && !isNaN(v));
            const spread = valid.length > 0 ? Math.max(...valid) - Math.min(...valid) : 0;
            const bg = spread < 4 ? "#F3F4F7" : spread < 8 ? "#E4E7EC" : spread < 13 ? "#D2D7DF" : "#BEC5D0";
            cellBtn.style.background = bg;
            cellBtn.innerHTML = renderComparisonSvg(h, a, c, 60, 100, 90);
          }
        } else if (isEff) {
          const eff = (c !== null && a !== null) ? Math.round((c - a) * 10) / 10 : null;
          if (eff === null) {
            cellBtn.textContent = "N/A";
            cellBtn.style.background = "transparent";
            cellBtn.style.border = "1px dashed var(--line)";
            cellBtn.style.color = "var(--muted)";
          } else {
            const effText = eff > 0 ? `+${eff}` : `${eff}`;
            cellBtn.textContent = effText;
            cellBtn.style.fontWeight = "600";
            cellBtn.style.fontSize = "13px";
            cellBtn.style.fontVariantNumeric = "tabular-nums";
            if (eff < -5) { cellBtn.style.background = "#F2C4D3"; cellBtn.style.color = "#5C0F2B"; }
            else if (eff < 0) { cellBtn.style.background = "#F9E1E9"; cellBtn.style.color = "#6E1A37"; }
            else if (eff === 0) { cellBtn.style.background = "#E9ECF1"; cellBtn.style.color = "#2A303C"; }
            else if (eff <= 5) { cellBtn.style.background = "#DCEFD9"; cellBtn.style.color = "#1E5631"; }
            else { cellBtn.style.background = "#BEE2B8"; cellBtn.style.color = "#15401F"; }
          }
        } else {
          // Specific version score
          const val = scene.computedScores[state.heatmapMode][dim.key];
          cellBtn.textContent = formatScore(val);
          cellBtn.className += ` ${getScoreClass(val)}`;
          cellBtn.style.fontSize = "13px";
        }

        // Highlight filter fade
        if (highlightFilter !== "all" && !isEff) {
          const checkVal = isCmp ? Math.min(h ?? 100, a ?? 100, c ?? 100) : scene.computedScores[state.heatmapMode][dim.key];
          if (checkVal !== null && checkVal >= Number(highlightFilter)) {
            cellBtn.style.opacity = "0.25";
          }
        }

        cellBtn.addEventListener("click", () => {
          state.selectedAct = act.act;
          state.selectedSceneId = scene.scene_id;
          state.selectedDimension = dim.key;
          state.activeInspectorDim = dim.key;
          switchPage("read");
          renderApp();
        });

        row.appendChild(cellBtn);
      });

      // Review count column
      const flagsSpan = document.createElement("span");
      flagsSpan.style.cssText = "text-align:right; font-variant-numeric:tabular-nums; padding-right:6px";
      flagsSpan.textContent = scene.reviewCount;
      row.appendChild(flagsSpan);

      container.appendChild(row);
    });
  });
}

// Collect validation queue items from dataset
function collectValidationQueueItems() {
  const items = [];
  if (!state.data) return items;

  state.data.acts.forEach((act) => {
    act.scenes.forEach((scene) => {
      scene.dialogues.forEach((diag) => {
        VERSIONS.forEach((v) => {
          DIMENSIONS.forEach((dim) => {
            const ana = diag.analysis && diag.analysis[v.key] && diag.analysis[v.key][dim.key];
            if (!ana) return;

            let isCandidate = false;
            let issueType = "Needs review flag";
            let priority = 2; // Medium

            if (ana.needs_review) {
              isCandidate = true;
              issueType = "Needs review flag";
              priority = 3; // High
            }

            if (ana.evidence) {
              const unv = ana.evidence.filter((e) => e.verified === false);
              if (unv.length > 0) {
                isCandidate = true;
                issueType = "Unverified evidence";
                priority = 3;
              }
            }

            if (ana.confidence !== undefined && ana.confidence < 0.85) {
              isCandidate = true;
              issueType = "Low confidence";
              priority = 2;
            }

            if (ana.score !== null && ana.score !== undefined && ana.score < 70) {
              isCandidate = true;
              issueType = "Score below 70";
              priority = 1; // Low
            }

            if (isCandidate) {
              items.push({
                dialogue_id: diag.dialogue_id,
                speaker: diag.speaker,
                act: act.act,
                scene_id: scene.scene_id,
                scene_title: scene.title || `Act ${act.act}, Scene ${scene.scene_number}`,
                english: diag.texts.english,
                versionKey: v.key,
                versionName: v.name,
                dimKey: dim.key,
                dimName: dim.name,
                score: ana.score,
                confidence: ana.confidence,
                issueType,
                priority,
                explanation: ana.explanation
              });
            }
          });
        });
      });
    });
  });

  return items;
}

// Render Validation Queue
function renderValidationQueue() {
  const container = document.getElementById("queue-rows-container");
  container.innerHTML = "";

  const allItems = collectValidationQueueItems();
  const filtered = allItems.filter((item) => {
    const isReviewed = !!state.validations[item.dialogue_id];
    if (state.queueStatus === "open" && isReviewed) return false;
    if (state.queueStatus === "done" && !isReviewed) return false;

    if (state.queueIssue === "needs_review" && item.issueType !== "Needs review flag") return false;
    if (state.queueIssue === "unverified" && item.issueType !== "Unverified evidence") return false;
    if (state.queueIssue === "low_confidence" && item.issueType !== "Low confidence") return false;
    if (state.queueIssue === "low_score" && item.issueType !== "Score below 70") return false;

    return true;
  });

  document.getElementById("queue-empty-msg").style.display = filtered.length === 0 ? "block" : "none";

  filtered.forEach((q) => {
    const isReviewed = !!state.validations[q.dialogue_id];
    const reviewData = state.validations[q.dialogue_id];

    const row = document.createElement("div");
    row.className = "queue-row";

    const priColor = q.priority === 3 ? "color:var(--warn-ink); font-weight:600" : q.priority === 2 ? "color:var(--ink-2); font-weight:600" : "color:var(--muted)";
    const priLabel = q.priority === 3 ? "High" : q.priority === 2 ? "Medium" : "Low";

    row.innerHTML = `
      <span style="font-size:13px; ${priColor}">${priLabel}</span>
      <span style="display:flex; flex-direction:column; line-height:1.3">
        <span style="font-weight:600; font-size:14px">${q.scene_title}</span>
        <span style="font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums">${q.dialogue_id}</span>
      </span>
      <span style="font-family:'Source Serif 4', serif; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${q.english}</span>
      <span style="font-size:14px">${q.dimName}</span>
      <span style="font-size:13px; color:var(--ink-2)">
        ${q.issueType}
        <span style="display:block; font-size:12px; color:var(--muted)">${q.versionName}</span>
      </span>
      <span style="font-size:13px; ${isReviewed ? 'color:#14513F; font-weight:600' : 'color:var(--ink-2)'}">
        ${isReviewed ? 'Reviewed: ' + reviewData.verdict : 'Open'}
      </span>
      <button type="button" class="press" style="font:inherit; font-size:13px; font-weight:600; min-height:38px; padding:0 14px; border-radius:6px; border:1px solid var(--ink); background:var(--surface); color:var(--ink); cursor:pointer; white-space:nowrap">
        ${isReviewed ? 'View' : 'Review'}
      </button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      state.selectedAct = q.act;
      state.selectedSceneId = q.scene_id;
      state.selectedDimension = q.dimKey;
      state.activeInspectorDim = q.dimKey;
      state.activeDialogueId = q.dialogue_id;
      switchPage("read");
      renderApp();
      openInspector(q.dialogue_id);
    });

    container.appendChild(row);
  });
}

// Start app on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  loadDataset();
});
