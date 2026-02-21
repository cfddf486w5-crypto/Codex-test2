(function(){
  const LS_KEY = "DL_AUTO_KB_JSON_V2";

  async function fetchJson(path){
    const res = await fetch(path, { cache:"no-store" });
    if(!res.ok) throw new Error(`Impossible de charger ${path}`);
    return await res.json();
  }

  function faqToKBItems(faqRows){
    return (faqRows || []).map((row)=>({
      id: `indago_faq_${String(row.id).padStart(3, "0")}`,
      type: "NOTE",
      title: `[FAQ ${row.id}] ${row.question}`,
      tags: ["faq", "wms", "indago", ...(row.categorie ? [row.categorie.toLowerCase()] : [])],
      vehicle: {
        make: "INDAGO",
        model: "WMS",
        yearFrom: 2018,
        yearTo: 9999,
        engine: "platform"
      },
      content: `Catégorie: ${row.categorie}\nQ: ${row.question}\nR: ${row.reponse}`
    }));
  }

  async function loadBundledKB(){
    const [baseKB, faqRows] = await Promise.all([
      fetchJson("./data/auto_kb.json"),
      fetchJson("./data/indago_faq_200.json")
    ]);
    const faqItems = faqToKBItems(faqRows);
    return {
      ...baseKB,
      meta: {
        ...(baseKB.meta || {}),
        source: `${baseKB?.meta?.source || "auto_kb"} + Indago FAQ 200`
      },
      items: [...(baseKB.items || []), ...faqItems]
    };
  }
  function loadLocalKB(){
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch{ return null; }
  }
  function saveLocalKB(json){ localStorage.setItem(LS_KEY, JSON.stringify(json)); }
  function clearLocalKB(){ localStorage.removeItem(LS_KEY); }

  window.KBStore = { LS_KEY, loadBundledKB, loadLocalKB, saveLocalKB, clearLocalKB };
})();
