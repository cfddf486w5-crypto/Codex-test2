(function(){
  const LS_KEY = "DL_AUTO_KB_JSON_V1";

  async function loadBundledKB(){
    const res = await fetch("./data/auto_kb.json", { cache:"no-store" });
    if(!res.ok) throw new Error("Impossible de charger data/auto_kb.json");
    return await res.json();
  }

  function loadLocalKB(){
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function saveLocalKB(json){
    localStorage.setItem(LS_KEY, JSON.stringify(json));
  }

  function clearLocalKB(){
    localStorage.removeItem(LS_KEY);
  }

  window.KBStore = {
    LS_KEY,
    loadBundledKB,
    loadLocalKB,
    saveLocalKB,
    clearLocalKB
  };
})();
