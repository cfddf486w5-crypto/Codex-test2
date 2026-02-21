(function(){
  const ALLOWED_TYPES = new Set(["DTC","PROC","TORQUE","FLUID","PART","NOTE"]);

  function validateKB(kb){
    const errors = [];
    if(!kb || typeof kb !== "object") return { ok:false, errors:["KB vide/invalid"] };
    if(!Array.isArray(kb.items)) errors.push("KB.items doit être un tableau");

    const ids = new Set();
    for(const [i,it] of (kb.items||[]).entries()){
      if(!it.id || typeof it.id !== "string") errors.push(`Item[${i}] id manquant`);
      if(it.id && ids.has(it.id)) errors.push(`ID dupliqué: ${it.id}`);
      ids.add(it.id);

      if(!it.type || !ALLOWED_TYPES.has(it.type)) errors.push(`Item[${i}] type invalide: ${it.type}`);
      if(!it.title) errors.push(`Item[${i}] title manquant`);

      if(it.vehicle){
        const v = it.vehicle;
        if(v.yearFrom!=null && v.yearTo!=null && v.yearFrom > v.yearTo) errors.push(`Item[${i}] yearFrom > yearTo`);
      }
    }
    return { ok: errors.length===0, errors };
  }

  window.KBValidate = { validateKB };
})();
