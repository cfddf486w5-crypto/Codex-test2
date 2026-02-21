(function(){
  function toCSV(rows){
    return rows.map(r => r.map(cell => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
  }

  function exportCSVReport({title, question, answer, sources, meta}){
    const rows = [
      ["title", title],
      ["date", Utils.nowISO()],
      ["question", question],
      ["sources", (sources||[]).join(" ")],
      ["meta", JSON.stringify(meta||{})],
      ["answer", (answer||"").replace(/\n/g," \\n ")]
    ];
    Utils.downloadText(`rapport_ia_auto_${Date.now()}.csv`, toCSV(rows), "text/csv");
  }

  function exportPrintPack({title, question, answer, sources, meta}){
    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${Utils.escapeHtml(title||"Rapport IA Auto")}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:16px;line-height:1.35}
h1{font-size:18px;margin:0 0 8px}
.small{color:#333;font-size:12px;margin:6px 0}
pre{white-space:pre-wrap;border:1px solid #ddd;border-radius:10px;padding:12px;background:#fafafa}
.badge{display:inline-block;border:1px solid #ddd;border-radius:999px;padding:3px 8px;font-size:12px;margin-right:6px}
</style></head><body>
<h1>${Utils.escapeHtml(title||"Rapport IA Automobile")}</h1>
<div class="small"><span class="badge">${Utils.escapeHtml(Utils.nowISO())}</span></div>
<div class="small"><strong>Question:</strong> ${Utils.escapeHtml(question||"")}</div>
<div class="small"><strong>Sources:</strong> ${(sources||[]).map(s=>`<span class="badge">${Utils.escapeHtml(s)}</span>`).join("")}</div>
<div class="small"><strong>Meta:</strong> ${Utils.escapeHtml(JSON.stringify(meta||{}))}</div>
<pre>${Utils.escapeHtml(answer||"")}</pre>
<script>window.print();</script>
</body></html>`;
    Utils.downloadText(`print_pack_ia_auto_${Date.now()}.html`, html, "text/html");
  }

  window.ExportReport = { exportCSVReport, exportPrintPack };
})();
