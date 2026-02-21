(function(){
  const pad = n => String(n).padStart(2,"0");

  function nowISO(){
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function norm(s){ return (s ?? "").toString().trim().toLowerCase(); }

  function safeInt(v, def=null){
    const n = parseInt(v,10);
    return Number.isFinite(n) ? n : def;
  }

  function escapeHtml(s){
    return (s??"").toString()
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function downloadText(filename, text, mime="text/plain"){
    const blob = new Blob([text], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJSON(filename, obj){
    downloadText(filename, JSON.stringify(obj, null, 2), "application/json");
  }

  function copyToClipboard(text){
    if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy");
    ta.remove();
    return Promise.resolve();
  }

  function detectDTC(text){
    return norm(text).match(/\b[pcbu]\d{4}\b/i)?.[0]?.toUpperCase() || null;
  }

  function tokenize(text){
    return norm(text)
      .replace(/[^a-z0-9\s\-\_]/g," ")
      .split(/\s+/)
      .filter(w => w.length >= 2);
  }

  window.Utils = { nowISO, norm, safeInt, escapeHtml, downloadText, downloadJSON, copyToClipboard, detectDTC, tokenize };
})();
