(function(){
  window.Utils = {
    nowISO(){
      const d = new Date();
      const pad = n => String(n).padStart(2,"0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    norm(s){
      return (s ?? "").toString().trim().toLowerCase();
    },
    safeInt(v, def=null){
      const n = parseInt(v,10);
      return Number.isFinite(n) ? n : def;
    },
    downloadText(filename, text, mime="text/plain"){
      const blob = new Blob([text], {type:mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    copyToClipboard(text){
      return navigator.clipboard?.writeText(text);
    }
  };
})();
