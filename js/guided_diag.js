(function(){
  const LS_FLOW = "DL_AUTO_FLOW_STATE_V1";

  function loadFlowsBundled(){
    return fetch("./data/diag_flows.json", {cache:"no-store"}).then(r=>r.json());
  }

  function saveState(state){ localStorage.setItem(LS_FLOW, JSON.stringify(state)); }
  function loadState(){ try{return JSON.parse(localStorage.getItem(LS_FLOW)||"null");}catch{return null;} }
  function clearState(){ localStorage.removeItem(LS_FLOW); }

  function renderFlowUI(container, flow, state, onSelect){
    container.innerHTML = "";
    if(!flow) return;

    const node = flow.nodes[state.nodeId];
    if(!node){
      container.innerHTML = `<div class="muted">Noeud introuvable.</div>`;
      return;
    }

    const box = document.createElement("div");
    box.className = "flow-q";

    if(node.type === "question"){
      box.innerHTML = `<div class="qtitle">${Utils.escapeHtml(node.text)}</div>`;
      const opt = document.createElement("div");
      opt.className = "opt";
      for(const o of (node.options||[])){
        const b = document.createElement("button");
        b.textContent = o.label;
        b.addEventListener("click", ()=>onSelect(o));
        opt.appendChild(b);
      }
      box.appendChild(opt);
      container.appendChild(box);
      return;
    }

    if(node.type === "result"){
      const hints = (node.kbHints||[]).map(id=>`<span class="badge">${Utils.escapeHtml(id)}</span>`).join(" ");
      box.innerHTML = `
        <div class="qtitle">${Utils.escapeHtml(node.title)}</div>
        <div class="muted">${Utils.escapeHtml(node.content||"")}</div>
        <div style="margin-top:10px">${hints}</div>
      `;
      container.appendChild(box);
    }
  }

  window.GuidedDiag = { loadFlowsBundled, saveState, loadState, clearState, renderFlowUI };
})();
