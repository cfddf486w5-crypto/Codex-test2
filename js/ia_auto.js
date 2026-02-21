(async function(){
  const els = {
    kbStatus: document.getElementById("kbStatus"),
    netPill: document.getElementById("netPill"),
    btnInstall: document.getElementById("btnInstall"),
    btnReloadKB: document.getElementById("btnReloadKB"),

    tabs: Array.from(document.querySelectorAll(".tab")),
    panes: {
      search: document.getElementById("tab-search"),
      guided: document.getElementById("tab-guided"),
      fav: document.getElementById("tab-fav"),
      settings: document.getElementById("tab-settings"),
    },

    qInput: document.getElementById("qInput"),
    btnAnalyze: document.getElementById("btnAnalyze"),
    btnClear: document.getElementById("btnClear"),
    btnCopyAnswer: document.getElementById("btnCopyAnswer"),
    btnExportCSV: document.getElementById("btnExportCSV"),
    btnExportPrintPack: document.getElementById("btnExportPrintPack"),
    btnPrint: document.getElementById("btnPrint"),
    btnFavorite: document.getElementById("btnFavorite"),
    answerBox: document.getElementById("answerBox"),
    results: document.getElementById("results"),
    qQuick: document.getElementById("qQuick"),
    btnQuick: document.getElementById("btnQuick"),
    history: document.getElementById("history"),
    btnClearHistory: document.getElementById("btnClearHistory"),

    fType: document.getElementById("fType"),
    fMake: document.getElementById("fMake"),
    fModel: document.getElementById("fModel"),
    fYear: document.getElementById("fYear"),
    fEngine: document.getElementById("fEngine"),
    optStrictSources: document.getElementById("optStrictSources"),
    optShowConfidence: document.getElementById("optShowConfidence"),

    dropZone: document.getElementById("dropZone"),
    btnResetToBundled: document.getElementById("btnResetToBundled"),
    btnClearLocalKB: document.getElementById("btnClearLocalKB"),
    excelFile: document.getElementById("excelFile"),
    btnImportExcel: document.getElementById("btnImportExcel"),
    btnPwaRefresh: document.getElementById("btnPwaRefresh"),
    btnPwaClear: document.getElementById("btnPwaClear"),

    flowSelect: document.getElementById("flowSelect"),
    btnStartFlow: document.getElementById("btnStartFlow"),
    btnResetFlow: document.getElementById("btnResetFlow"),
    flowUI: document.getElementById("flowUI"),
    btnFlowExport: document.getElementById("btnFlowExport"),
    btnFlowFavorite: document.getElementById("btnFlowFavorite"),

    favList: document.getElementById("favList"),
    btnExportFav: document.getElementById("btnExportFav"),
    btnClearFav: document.getElementById("btnClearFav"),
  };

  const LS_HIST = "DL_AUTO_HIST_V2";
  const LS_FAV  = "DL_AUTO_FAV_V2";

  let KB = { meta:{}, items:[] };
  let FLOWS = null;
  let ACTIVE_FLOW = null;
  let FLOW_STATE = null;

  function setNetPill(){
    const online = navigator.onLine;
    els.netPill.textContent = online ? "Online" : "Offline";
    els.netPill.className = "pill " + (online ? "ok" : "bad");
  }

  function getFilters(){
    return {
      type: els.fType.value.trim(),
      make: els.fMake.value.trim(),
      model: els.fModel.value.trim(),
      year: Utils.safeInt(els.fYear.value.trim(), null),
      engine: els.fEngine.value.trim()
    };
  }

  async function loadKB(){
    const local = KBStore.loadLocalKB();
    if(local?.items?.length){
      const v = KBValidate.validateKB(local);
      if(!v.ok) throw new Error("KB locale invalide: " + v.errors.join(" | "));
      KB = local;
      return {source:"local", count:KB.items.length};
    }
    const bundled = await KBStore.loadBundledKB();
    const v2 = KBValidate.validateKB(bundled);
    if(!v2.ok) throw new Error("KB incluse invalide: " + v2.errors.join(" | "));
    KB = bundled;
    return {source:"bundled", count:KB.items.length};
  }

  function saveHistory(q, ans, sources, meta){
    const hist = loadHistory();
    hist.unshift({ ts: Date.now(), q, ans, sources, meta });
    localStorage.setItem(LS_HIST, JSON.stringify(hist.slice(0,25)));
  }
  function loadHistory(){ try{return JSON.parse(localStorage.getItem(LS_HIST)||"[]");}catch{return [];} }
  function clearHistory(){ localStorage.removeItem(LS_HIST); }

  function saveFavorite(entry){
    const fav = loadFavorites();
    fav.unshift(entry);
    localStorage.setItem(LS_FAV, JSON.stringify(fav.slice(0,100)));
  }
  function loadFavorites(){ try{return JSON.parse(localStorage.getItem(LS_FAV)||"[]");}catch{return [];} }
  function clearFavorites(){ localStorage.removeItem(LS_FAV); }

  function renderHistory(){
    const hist = loadHistory();
    els.history.innerHTML = "";
    if(!hist.length){ els.history.innerHTML = `<div class="muted">Aucun historique.</div>`; return; }

    for(const h of hist){
      const d = new Date(h.ts);
      const card = document.createElement("div");
      card.className = "hist-item";
      card.innerHTML = `
        <div><strong>${Utils.escapeHtml(h.q)}</strong></div>
        <div class="muted">${Utils.escapeHtml(d.toLocaleString())}</div>
        <div class="muted">Sources: ${(h.sources||[]).map(s=>`<span class="badge">${Utils.escapeHtml(s)}</span>`).join(" ")}</div>
        <div class="row">
          <button class="btn btn-ghost" data-act="reuse">Réutiliser</button>
          <button class="btn btn-ghost" data-act="copy">Copier</button>
          <button class="btn btn-ghost" data-act="export">CSV</button>
        </div>
      `;
      card.querySelector('[data-act="reuse"]').addEventListener("click", ()=>{
        els.qInput.value = h.q;
        els.answerBox.textContent = h.ans;
      });
      card.querySelector('[data-act="copy"]').addEventListener("click", ()=>Utils.copyToClipboard(h.ans));
      card.querySelector('[data-act="export"]').addEventListener("click", ()=>{
        ExportReport.exportCSVReport({ title:"Historique IA Auto", question:h.q, answer:h.ans, sources:h.sources, meta:h.meta });
      });
      els.history.appendChild(card);
    }
  }

  function renderFavorites(){
    const fav = loadFavorites();
    els.favList.innerHTML = "";
    if(!fav.length){ els.favList.innerHTML = `<div class="muted">Aucun favori.</div>`; return; }

    for(const f of fav){
      const d = new Date(f.ts);
      const card = document.createElement("div");
      card.className = "hist-item";
      card.innerHTML = `
        <div><strong>${Utils.escapeHtml(f.title || "Favori")}</strong></div>
        <div class="muted">${Utils.escapeHtml(d.toLocaleString())}</div>
        <div class="muted">${Utils.escapeHtml((f.q||"").slice(0,120))}</div>
        <div class="row">
          <button class="btn btn-ghost" data-act="open">Ouvrir</button>
          <button class="btn btn-ghost" data-act="copy">Copier</button>
        </div>
      `;
      card.querySelector('[data-act="open"]').addEventListener("click", ()=>{
        switchTab("search");
        els.qInput.value = f.q || "";
        els.answerBox.textContent = f.ans || "";
      });
      card.querySelector('[data-act="copy"]').addEventListener("click", ()=>Utils.copyToClipboard(f.ans||""));
      els.favList.appendChild(card);
    }
  }

  function renderResults(hits){
    els.results.innerHTML = "";
    if(!hits.length){ els.results.innerHTML = `<div class="muted">Aucun résultat.</div>`; return; }

    for(const h of hits){
      const it = h.item;
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-title">${Utils.escapeHtml(it.title)} <span class="badge">${Utils.escapeHtml(it.type)}</span></div>
        <div class="badges">${(it.tags||[]).slice(0,10).map(t=>`<span class="badge">${Utils.escapeHtml(t)}</span>`).join("")}</div>
        <div class="muted" style="margin-top:8px">ID: ${Utils.escapeHtml(it.id)} • Score: ${h.score}</div>
        <div class="result-actions">
          <button class="btn btn-ghost" data-act="view">Voir</button>
          <button class="btn btn-ghost" data-act="use">Utiliser</button>
        </div>
      `;

      card.querySelector('[data-act="view"]').addEventListener("click", ()=>{
        alert(`${it.title}\n\n${it.content || ""}`);
      });
      card.querySelector('[data-act="use"]').addEventListener("click", ()=>{
        const q = els.qInput.value.trim() || "Analyse basée sur une source sélectionnée";
        const f = getFilters();
        const mini = [{ item: it, score: 999 }];
        const ans = makeAnswer(q, mini, f);
        els.answerBox.textContent = ans.text;
        saveHistory(q, ans.text, ans.sources, ans.meta);
        renderHistory();
      });

      els.results.appendChild(card);
    }
  }

  function makeAnswer(question, hits, f){
    const strict = !!els.optStrictSources.checked;
    const showConf = !!els.optShowConfidence.checked;
    const conf = SearchEngine.confidenceFromHits(hits);

    if(!question.trim()){
      return { text:"Écris une question (DTC, symptôme, modèle/année…).", sources:[], meta:{confidence:conf} };
    }
    if(!hits.length){
      if(strict){
        return {
          text:[
            "Réponse refusée (mode strict): aucune source trouvée.",
            "",
            "Ajoute un détail:",
            "- Code DTC (P0xxx),",
            "- Symptôme exact,",
            "- Marque/Modèle/Année/Moteur.",
          ].join("\n"),
          sources:[],
          meta:{confidence:conf, strict:true}
        };
      }
      return {
        text:[
          "Aucun résultat direct trouvé.",
          "",
          "Suggestions:",
          "- essaie un code DTC (ex: P0171)",
          "- ou un mot clé (MAF, vacuum, fuel trim, O2)",
          "- ou un symptôme (ralenti instable, hesitation)."
        ].join("\n"),
        sources:[],
        meta:{confidence:conf}
      };
    }

    const top = hits[0].item;
    const sources = hits.map(h=>h.item.id);

    const lines = [];
    lines.push(`Question: ${question}`);
    lines.push(`Date: ${Utils.nowISO()}`);
    lines.push(`Filtres: type=${f.type||"Tous"} | make=${f.make||"*"} | model=${f.model||"*"} | year=${f.year??"*"} | engine=${f.engine||"*"}`);
    if(showConf) lines.push(`Confiance: ${conf.level} (score=${conf.value})`);
    lines.push("");

    lines.push(`Résumé: ${top.title} (${top.type})`);
    lines.push("");

    const dangerous = /airbag|srs|haute tension|hv|hybride|ev|carburant|fuel line/.test(Utils.norm(question));
    if(dangerous){
      lines.push("⚠️ Sécurité: intervention potentiellement dangereuse. Si doute, référer à un technicien qualifié.");
      lines.push("");
    }

    if(top.symptoms?.length){
      lines.push("Symptômes:");
      for(const s of top.symptoms) lines.push(`- ${s}`);
      lines.push("");
    }
    if(top.causes?.length){
      lines.push("Causes probables (ordre):");
      for(const c of top.causes) lines.push(`- ${c}`);
      lines.push("");
    }
    if(top.tests?.length){
      lines.push("Tests rapides:");
      for(const t of top.tests) lines.push(`- ${t}`);
      lines.push("");
    }
    if(top.steps?.length){
      lines.push("Procédure:");
      let i=1; for(const st of top.steps) lines.push(`${i++}. ${st}`);
      lines.push("");
    }
    if(top.specs){
      lines.push("Spécifications:");
      const sp = top.specs;
      const unit = sp.unit ? ` ${sp.unit}` : "";
      const val = (sp.value!=null) ? `${sp.value}${unit}` : "";
      lines.push(`- ${val}${sp.note ? " — "+sp.note : ""}`);
      lines.push("");
    }
    if(top.content){
      lines.push("Notes:");
      lines.push(top.content);
      lines.push("");
    }

    lines.push(`Sources: ${sources.join(", ")}`);
    return { text: lines.join("\n"), sources, meta:{confidence:conf, topId:top.id} };
  }

  function switchTab(name){
    els.tabs.forEach(t=>{
      t.classList.toggle("active", t.dataset.tab===name);
    });
    Object.entries(els.panes).forEach(([k,p])=>{
      p.classList.toggle("active", k===name);
    });
  }

  function setupTabs(){
    els.tabs.forEach(t=>{
      t.addEventListener("click", ()=>switchTab(t.dataset.tab));
    });
  }

  function setupDropZone(){
    els.dropZone.addEventListener("dragover", (e)=>e.preventDefault());
    els.dropZone.addEventListener("drop", async (e)=>{
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if(!file) return;
      const text = await file.text();
      try{
        const json = JSON.parse(text);
        const v = KBValidate.validateKB(json);
        if(!v.ok) throw new Error(v.errors.join(" | "));
        KBStore.saveLocalKB(json);
        KB = json;
        els.kbStatus.textContent = `KB: local • ${KB.items.length} items`;
        alert(`KB importée: ${KB.items.length} items`);
      }catch(err){
        alert("Erreur import: " + err.message);
      }
    });
  }

  async function importExcelToKB(){
    if(typeof XLSX === "undefined"){
      alert("SheetJS manquant. Ajoute vendor/xlsx.full.min.js et décommente le script.");
      return;
    }
    const file = els.excelFile.files?.[0];
    if(!file){ alert("Choisis un fichier Excel."); return; }

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type:"array" });

    const items = [];
    for(const name of wb.SheetNames){
      const type = name.toUpperCase().trim();
      const ws = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
      for(const r of rows){
        const id = String(r.id || r.ID || "").trim();
        if(!id) continue;
        const tags = String(r.tags || r.TAGS || "").split(",").map(s=>s.trim()).filter(Boolean);
        items.push({
          id,
          type: ["DTC","PROC","TORQUE","FLUID","PART","NOTE"].includes(type) ? type : "NOTE",
          title: String(r.title || r.TITLE || "").trim(),
          tags,
          vehicle: {
            make: String(r.make || "*").trim() || "*",
            model: String(r.model || "*").trim() || "*",
            yearFrom: parseInt(r.yearFrom || 0,10) || 0,
            yearTo: parseInt(r.yearTo || 9999,10) || 9999,
            engine: String(r.engine || "*").trim() || "*"
          },
          content: String(r.content || r.CONTENT || "").trim()
        });
      }
    }

    const kb = { meta:{version:"excel-import-1", updated: Utils.nowISO(), source:"Excel import"}, items };
    const v = KBValidate.validateKB(kb);
    if(!v.ok){ alert("Import Excel invalide: " + v.errors.join(" | ")); return; }

    KBStore.saveLocalKB(kb);
    KB = kb;
    els.kbStatus.textContent = `KB: local(excel) • ${KB.items.length} items`;
    alert(`Import OK: ${KB.items.length} items`);
  }

  async function initGuided(){
    FLOWS = await GuidedDiag.loadFlowsBundled();
    els.flowSelect.innerHTML = "";
    for(const fl of (FLOWS.flows||[])){
      const opt = document.createElement("option");
      opt.value = fl.id;
      opt.textContent = fl.title;
      els.flowSelect.appendChild(opt);
    }
  }

  function startFlow(){
    const id = els.flowSelect.value;
    ACTIVE_FLOW = (FLOWS.flows||[]).find(x=>x.id===id);
    if(!ACTIVE_FLOW) return;
    FLOW_STATE = { flowId:id, nodeId: ACTIVE_FLOW.start, answers:[] };
    GuidedDiag.saveState(FLOW_STATE);
    renderFlow();
  }

  function renderFlow(){
    if(!ACTIVE_FLOW || !FLOW_STATE){
      els.flowUI.innerHTML = `<div class="muted">Aucun flow actif.</div>`;
      return;
    }
    GuidedDiag.renderFlowUI(els.flowUI, ACTIVE_FLOW, FLOW_STATE, (opt)=>{
      FLOW_STATE.answers.push({ node: FLOW_STATE.nodeId, pick: opt.label, tags: opt.tags||[] });
      FLOW_STATE.nodeId = opt.next;
      GuidedDiag.saveState(FLOW_STATE);
      renderFlow();
    });
  }

  function resetFlow(){
    ACTIVE_FLOW = null;
    FLOW_STATE = null;
    GuidedDiag.clearState();
    els.flowUI.innerHTML = `<div class="muted">Réinitialisé.</div>`;
  }

  function exportFlowReport(){
    if(!ACTIVE_FLOW || !FLOW_STATE) return;
    const node = ACTIVE_FLOW.nodes[FLOW_STATE.nodeId];
    const sources = (node?.kbHints)||[];
    const answer = [
      `Flow: ${ACTIVE_FLOW.title}`,
      `Date: ${Utils.nowISO()}`,
      "",
      "Réponses:",
      ...FLOW_STATE.answers.map(a=>`- ${a.pick}`)
    ].join("\n") + (node?.content ? `\n\nConclusion:\n${node.content}` : "");

    ExportReport.exportCSVReport({
      title: `Diagnostic guidé — ${ACTIVE_FLOW.title}`,
      question: "Guided Flow",
      answer,
      sources,
      meta: { flowId: ACTIVE_FLOW.id, nodeId: FLOW_STATE.nodeId }
    });
  }

  function setupEvents(){
    els.btnAnalyze.addEventListener("click", ()=>{
      const q = els.qInput.value;
      const f = getFilters();
      const hits = SearchEngine.searchKB(KB.items, q, f, 12);
      renderResults(hits);
      const ans = makeAnswer(q, hits, f);
      els.answerBox.textContent = ans.text;
      saveHistory(q, ans.text, ans.sources, ans.meta);
      renderHistory();
    });
    els.btnQuick.addEventListener("click", ()=>{
      const q = els.qQuick.value;
      const f = getFilters();
      const hits = SearchEngine.searchKB(KB.items, q, f, 20);
      renderResults(hits);
    });
    els.btnClear.addEventListener("click", ()=>{
      els.qInput.value = "";
      els.answerBox.textContent = "";
      els.results.innerHTML = "";
    });
    els.btnCopyAnswer.addEventListener("click", ()=>Utils.copyToClipboard(els.answerBox.textContent||""));
    els.btnExportCSV.addEventListener("click", ()=>{
      ExportReport.exportCSVReport({
        title:"Rapport IA Automobile",
        question: els.qInput.value.trim(),
        answer: els.answerBox.textContent.trim(),
        sources: (els.answerBox.textContent.includes("Sources:") ? [] : []),
        meta: { kbCount: KB.items.length }
      });
    });
    els.btnExportPrintPack.addEventListener("click", ()=>{
      ExportReport.exportPrintPack({
        title:"Rapport IA Automobile",
        question: els.qInput.value.trim(),
        answer: els.answerBox.textContent.trim(),
        sources: [],
        meta: { kbCount: KB.items.length }
      });
    });
    els.btnPrint.addEventListener("click", ()=>window.print());
    els.btnFavorite.addEventListener("click", ()=>{
      const q = els.qInput.value.trim();
      const ans = els.answerBox.textContent.trim();
      if(!ans) return;
      saveFavorite({ ts:Date.now(), title:q.slice(0,40)||"Favori", q, ans });
      renderFavorites();
      alert("Favori ajouté.");
    });

    els.btnClearHistory.addEventListener("click", ()=>{
      clearHistory();
      renderHistory();
    });

    els.btnReloadKB.addEventListener("click", async ()=>{
      const info = await loadKB();
      els.kbStatus.textContent = `KB: ${info.source} • ${info.count} items`;
      alert(`KB rechargée: ${info.source} • ${info.count} items`);
    });
    els.btnResetToBundled.addEventListener("click", async ()=>{
      KBStore.clearLocalKB();
      const info = await loadKB();
      els.kbStatus.textContent = `KB: ${info.source} • ${info.count} items`;
      alert("OK. KB incluse active.");
    });
    els.btnClearLocalKB.addEventListener("click", ()=>{
      KBStore.clearLocalKB();
      alert("KB locale supprimée.");
    });

    els.btnImportExcel.addEventListener("click", importExcelToKB);

    els.btnStartFlow.addEventListener("click", startFlow);
    els.btnResetFlow.addEventListener("click", resetFlow);
    els.btnFlowExport.addEventListener("click", exportFlowReport);
    els.btnFlowFavorite.addEventListener("click", ()=>{
      if(!ACTIVE_FLOW || !FLOW_STATE) return;
      saveFavorite({
        ts: Date.now(),
        title: `Flow: ${ACTIVE_FLOW.title}`,
        q: `Flow ${ACTIVE_FLOW.id}`,
        ans: JSON.stringify(FLOW_STATE, null, 2)
      });
      renderFavorites();
      alert("Flow favori ajouté.");
    });

    els.btnExportFav.addEventListener("click", ()=>{
      Utils.downloadJSON(`favoris_ia_auto_${Date.now()}.json`, loadFavorites());
    });
    els.btnClearFav.addEventListener("click", ()=>{
      clearFavorites();
      renderFavorites();
    });

    els.btnPwaRefresh.addEventListener("click", async ()=>{
      if(navigator.serviceWorker?.controller){
        alert("Cache mis à jour au prochain reload. Recharge la page.");
      }else{
        alert("Service worker non actif. Recharge / installe PWA.");
      }
    });
    els.btnPwaClear.addEventListener("click", async ()=>{
      if("caches" in window){
        await PWA.clearAllCaches();
        alert("Caches supprimés.");
      }
    });

    window.addEventListener("online", setNetPill);
    window.addEventListener("offline", setNetPill);
  }

  async function init(){
    setNetPill();
    setupTabs();
    setupDropZone();

    PWA.hookInstallButton(els.btnInstall);
    await PWA.registerSW();

    const info = await loadKB();
    els.kbStatus.textContent = `KB: ${info.source} • ${info.count} items`;

    await initGuided();
    renderHistory();
    renderFavorites();

    els.answerBox.textContent =
      `KB chargée (${info.source}) — items: ${info.count}\n\nExemples:\n- P0171\n- MAF sale\n- couple serrage étrier\n- huile transmission ATF`;

    setupEvents();
  }

  await init();
})();
