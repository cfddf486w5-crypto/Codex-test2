(async function(){
  const els = {
    qInput: document.getElementById("qInput"),
    btnAnalyze: document.getElementById("btnAnalyze"),
    btnClear: document.getElementById("btnClear"),
    btnCopyAnswer: document.getElementById("btnCopyAnswer"),
    btnExportCSV: document.getElementById("btnExportCSV"),
    btnPrint: document.getElementById("btnPrint"),
    btnFavorite: document.getElementById("btnFavorite"),
    btnReloadKB: document.getElementById("btnReloadKB"),
    btnResetToBundled: document.getElementById("btnResetToBundled"),
    btnClearLocalKB: document.getElementById("btnClearLocalKB"),
    fType: document.getElementById("fType"),
    fMake: document.getElementById("fMake"),
    fModel: document.getElementById("fModel"),
    fYear: document.getElementById("fYear"),
    fEngine: document.getElementById("fEngine"),
    answerBox: document.getElementById("answerBox"),
    results: document.getElementById("results"),
    history: document.getElementById("history"),
    dropZone: document.getElementById("dropZone"),
  };

  const LS_HIST = "DL_AUTO_KB_HIST_V1";
  const LS_FAV  = "DL_AUTO_KB_FAV_V1";

  let KB = { meta:{}, items:[] };

  function getFilters(){
    return {
      type: els.fType.value.trim(),
      make: els.fMake.value.trim(),
      model: els.fModel.value.trim(),
      year: Utils.safeInt(els.fYear.value.trim(), null),
      engine: els.fEngine.value.trim()
    };
  }

  function vehicleMatch(item, f){
    const v = item.vehicle || {};
    const make = (v.make ?? "*").toString();
    const model= (v.model?? "*").toString();
    const engine=(v.engine??"*").toString();
    const yFrom = Number.isFinite(v.yearFrom) ? v.yearFrom : 0;
    const yTo   = Number.isFinite(v.yearTo)   ? v.yearTo   : 9999;

    const fMake = f.make ? Utils.norm(f.make) : null;
    const fModel= f.model? Utils.norm(f.model): null;
    const fEngine=f.engine?Utils.norm(f.engine): null;

    if(fMake && make !== "*" && Utils.norm(make) !== fMake) return false;
    if(fModel && model !== "*" && Utils.norm(model) !== fModel) return false;
    if(fEngine && engine !== "*" && Utils.norm(engine) !== fEngine) return false;

    if(f.year != null){
      if(!(f.year >= yFrom && f.year <= yTo)) return false;
    }
    return true;
  }

  function scoreItem(item, q, f){
    const query = Utils.norm(q);
    if(!query) return 0;

    if(f.type && item.type !== f.type) return 0;
    if(!vehicleMatch(item, f)) return 0;

    const title = Utils.norm(item.title);
    const content = Utils.norm(item.content);
    const tags = (item.tags || []).map(Utils.norm).join(" ");
    const blob = `${title} ${tags} ${content}`;

    let score = 0;

    if(item.type === "TORQUE" && /couple|torque|nm|ft[- ]?lb/.test(query)) score += 2;
    if(item.type === "FLUID"  && /huile|fluid|coolant|antigel|atf|power steering/.test(query)) score += 2;

    if(title.includes(query)) score += 6;
    if(tags.includes(query)) score += 4;
    if(content.includes(query)) score += 2;

    const words = query.split(/\s+/).filter(w=>w.length>=3);
    for(const w of words){
      if(title.includes(w)) score += 3;
      else if(tags.includes(w)) score += 2;
      else if(blob.includes(w)) score += 1;
    }

    const dtc = query.match(/\b[pcbu]\d{4}\b/i)?.[0];
    if(dtc && Utils.norm(item.id).includes(Utils.norm(dtc))) score += 8;
    if(dtc && Utils.norm(item.title).includes(Utils.norm(dtc))) score += 8;

    return score;
  }

  function search(q, f, limit=10){
    const out = [];
    for(const item of (KB.items || [])){
      const s = scoreItem(item, q, f);
      if(s > 0) out.push({ item, score:s });
    }
    out.sort((a,b)=>b.score-a.score);
    return out.slice(0, limit);
  }

  function templateAnswer(question, hits, f){
    if(!question.trim()) return "Écris une question (ex: P0171, symptôme, modèle/année/moteur).";
    if(!hits.length) return [
      "Aucun résultat trouvé.",
      "",
      "Astuce:",
      "- Essaie un code DTC (ex: P0171)",
      "- Ou un symptôme (ex: 'ralenti instable', 'perte de puissance')",
      "- Ou un mot clé (MAF, vacuum leak, fuel trim, etc.)"
    ].join("\n");

    const top = hits[0].item;
    const sources = hits.map(h=>h.item.id);

    const lines = [];
    lines.push(`Question: ${question}`);
    lines.push(`Date: ${Utils.nowISO()}`);
    lines.push(`Filtres: type=${f.type||"Tous"} | make=${f.make||"*"} | model=${f.model||"*"} | year=${f.year??"*"} | engine=${f.engine||"*"}`);
    lines.push("");
    lines.push(`Résumé: ${top.title} (${top.type})`);
    lines.push("");

    if(top.symptoms?.length){
      lines.push("Symptômes fréquents:");
      for(const s of top.symptoms) lines.push(`- ${s}`);
      lines.push("");
    }
    if(top.causes?.length){
      lines.push("Causes probables (ordre recommandé):");
      for(const c of top.causes) lines.push(`- ${c}`);
      lines.push("");
    }
    if(top.tests?.length){
      lines.push("Tests rapides / vérifications:");
      for(const t of top.tests) lines.push(`- ${t}`);
      lines.push("");
    }
    if(top.steps?.length){
      lines.push("Procédure / étapes:");
      let i=1;
      for(const st of top.steps) lines.push(`${i++}. ${st}`);
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
    return lines.join("\n");
  }

  function renderResults(hits){
    els.results.innerHTML = "";
    if(!hits.length){
      els.results.innerHTML = `<div class="muted">Aucun résultat.</div>`;
      return;
    }
    for(const h of hits){
      const it = h.item;
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-title">${escapeHtml(it.title)} <span class="badge">${escapeHtml(it.type)}</span></div>
        <div class="badges">${(it.tags||[]).slice(0,8).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="muted" style="margin-top:8px">ID: ${escapeHtml(it.id)} • Score: ${h.score}</div>
        <div class="result-actions">
          <button class="btn btn-ghost" data-act="use" data-id="${escapeAttr(it.id)}">Utiliser comme source</button>
          <button class="btn btn-ghost" data-act="view" data-id="${escapeAttr(it.id)}">Voir</button>
        </div>
      `;
      card.addEventListener("click", (e)=>{
        const btn = e.target?.closest("button");
        if(!btn) return;
        const act = btn.getAttribute("data-act");
        const id = btn.getAttribute("data-id");
        const found = (KB.items||[]).find(x=>x.id===id);
        if(!found) return;

        if(act==="view"){
          alert(`${found.title}\n\n${found.content || ""}`);
        }
        if(act==="use"){
          const q = els.qInput.value.trim();
          const f = getFilters();
          const mini = [{item:found, score:999}];
          const ans = templateAnswer(q || "Analyse basée sur une source sélectionnée", mini, f);
          els.answerBox.textContent = ans;
          saveHistory(q || "(source sélectionnée)", ans);
          renderHistory();
        }
      });
      els.results.appendChild(card);
    }
  }

  function saveHistory(q, ans){
    const hist = loadHistory();
    hist.unshift({ ts: Date.now(), q, ans });
    localStorage.setItem(LS_HIST, JSON.stringify(hist.slice(0,20)));
  }

  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(LS_HIST) || "[]"); }
    catch { return []; }
  }

  function renderHistory(){
    const hist = loadHistory();
    els.history.innerHTML = "";
    if(!hist.length){
      els.history.innerHTML = `<div class="muted">Aucun historique.</div>`;
      return;
    }
    for(const h of hist){
      const d = new Date(h.ts);
      const card = document.createElement("div");
      card.className = "hist-item";
      card.innerHTML = `
        <div><strong>${escapeHtml(h.q)}</strong></div>
        <div class="muted">${escapeHtml(d.toLocaleString())}</div>
        <div class="row">
          <button class="btn btn-ghost" data-act="reuse">Réutiliser</button>
          <button class="btn btn-ghost" data-act="copy">Copier</button>
        </div>
      `;
      card.querySelector('[data-act="reuse"]').addEventListener("click", ()=>{
        els.qInput.value = h.q;
        els.answerBox.textContent = h.ans;
      });
      card.querySelector('[data-act="copy"]').addEventListener("click", ()=>{
        Utils.copyToClipboard(h.ans);
      });
      els.history.appendChild(card);
    }
  }

  function loadFavorites(){
    try { return JSON.parse(localStorage.getItem(LS_FAV) || "[]"); }
    catch { return []; }
  }
  function saveFavorite(entry){
    const fav = loadFavorites();
    fav.unshift(entry);
    localStorage.setItem(LS_FAV, JSON.stringify(fav.slice(0,50)));
  }

  function exportCSVReport(){
    const ans = els.answerBox.textContent.trim();
    const q = els.qInput.value.trim();
    const rows = [
      ["date", Utils.nowISO()],
      ["question", q],
      ["answer", ans.replace(/\n/g, " \\n ")]
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    Utils.downloadText(`rapport_ia_auto_${Date.now()}.csv`, csv, "text/csv");
  }

  function escapeHtml(s){
    return (s??"").toString()
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function escapeAttr(s){
    return escapeHtml(s).replaceAll('"',"&quot;");
  }

  async function loadKB(){
    const local = KBStore.loadLocalKB();
    if(local && Array.isArray(local.items)){
      KB = local;
      return { source:"local", count: KB.items.length };
    }
    KB = await KBStore.loadBundledKB();
    return { source:"bundled", count: KB.items.length };
  }

  async function init(){
    const info = await loadKB();
    els.answerBox.textContent = `KB chargée (${info.source}) — items: ${info.count}\n\nExemples:\n- P0171\n- MAF sale\n- couple serrage étrier\n- huile transmission ATF`;
    renderHistory();

    els.btnAnalyze.addEventListener("click", ()=>{
      const q = els.qInput.value;
      const f = getFilters();
      const hits = search(q, f, 10);
      renderResults(hits);
      const ans = templateAnswer(q, hits, f);
      els.answerBox.textContent = ans;
      saveHistory(q, ans);
      renderHistory();
    });

    els.btnClear.addEventListener("click", ()=>{
      els.qInput.value = "";
      els.results.innerHTML = "";
      els.answerBox.textContent = "";
    });

    els.btnCopyAnswer.addEventListener("click", ()=>{
      Utils.copyToClipboard(els.answerBox.textContent || "");
    });

    els.btnExportCSV.addEventListener("click", exportCSVReport);

    els.btnPrint.addEventListener("click", ()=>{
      window.print();
    });

    els.btnFavorite.addEventListener("click", ()=>{
      const q = els.qInput.value.trim();
      const ans = els.answerBox.textContent.trim();
      if(!ans) return;
      saveFavorite({ ts:Date.now(), q, ans });
      alert("Ajouté aux favoris (local).");
    });

    els.btnReloadKB.addEventListener("click", async ()=>{
      const info = await loadKB();
      alert(`KB rechargée (${info.source}) — items: ${info.count}`);
    });

    els.dropZone.addEventListener("dragover", (e)=>{ e.preventDefault(); });
    els.dropZone.addEventListener("drop", async (e)=>{
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if(!file) return;
      const text = await file.text();
      try{
        const json = JSON.parse(text);
        if(!json.items || !Array.isArray(json.items)) throw new Error("Format invalide: items[] manquant");
        KBStore.saveLocalKB(json);
        KB = json;
        alert(`KB importée: ${json.items.length} items`);
      }catch(err){
        alert("Erreur import: " + err.message);
      }
    });

    els.btnResetToBundled.addEventListener("click", async ()=>{
      KBStore.clearLocalKB();
      const info = await loadKB();
      alert(`OK. KB incluse active — items: ${info.count}`);
    });

    els.btnClearLocalKB.addEventListener("click", ()=>{
      KBStore.clearLocalKB();
      alert("KB locale supprimée.");
    });
  }

  await init();
})();
