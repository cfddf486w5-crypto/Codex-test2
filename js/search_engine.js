(function(){
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

  function buildBlob(item){
    const t = item.title || "";
    const c = item.content || "";
    const tags = (item.tags||[]).join(" ");
    const sym = (item.symptoms||[]).join(" ");
    const cau = (item.causes||[]).join(" ");
    const tes = (item.tests||[]).join(" ");
    const stp = (item.steps||[]).join(" ");
    return Utils.norm(`${item.id} ${item.type} ${t} ${tags} ${sym} ${cau} ${tes} ${stp} ${c}`);
  }

  function scoreItem(item, q, f){
    const query = Utils.norm(q);
    if(!query) return 0;

    if(f.type && item.type !== f.type) return 0;
    if(!vehicleMatch(item, f)) return 0;

    const dtc = Utils.detectDTC(query);
    const title = Utils.norm(item.title);
    const tags = (item.tags||[]).map(Utils.norm).join(" ");
    const blob = buildBlob(item);

    let score = 0;

    if(dtc){
      if(Utils.norm(item.id).includes(Utils.norm(dtc))) score += 50;
      if(title.includes(Utils.norm(dtc))) score += 50;
      if(item.type === "DTC") score += 10;
    }

    if(title.includes(query)) score += 18;
    if(tags.includes(query)) score += 12;
    if(blob.includes(query)) score += 6;

    const toks = Utils.tokenize(query);
    for(const w of toks){
      if(title.includes(w)) score += 6;
      else if(tags.includes(w)) score += 4;
      else if(blob.includes(w)) score += 2;
    }

    if(item.type === "TORQUE" && /couple|torque|nm|ft[- ]?lb/.test(query)) score += 8;
    if(item.type === "FLUID"  && /huile|fluid|coolant|antigel|atf|power steering|diff/.test(query)) score += 8;
    if(item.type === "PROC"   && /proc|etape|remplacer|installer|changer|nettoyer/.test(query)) score += 6;

    if(score < 10 && toks.length > 3) score -= 2;

    return Math.max(0, score);
  }

  function searchKB(kbItems, q, f, limit=10){
    const out = [];
    for(const it of (kbItems||[])){
      const s = scoreItem(it, q, f);
      if(s > 0) out.push({ item: it, score: s });
    }
    out.sort((a,b)=>b.score-a.score);
    return out.slice(0, limit);
  }

  function confidenceFromHits(hits){
    if(!hits.length) return { level:"Faible", value:0 };
    const top = hits[0].score;
    if(top >= 60) return { level:"Élevée", value: top };
    if(top >= 25) return { level:"Moyenne", value: top };
    return { level:"Faible", value: top };
  }

  window.SearchEngine = { searchKB, confidenceFromHits };
})();
