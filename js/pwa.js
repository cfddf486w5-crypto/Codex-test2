(function(){
  let deferredPrompt = null;

  async function registerSW(){
    if(!("serviceWorker" in navigator)) return { ok:false, reason:"no-sw" };
    try{
      const reg = await navigator.serviceWorker.register("./sw.js");
      return { ok:true, reg };
    }catch(err){
      return { ok:false, reason: err.message };
    }
  }

  function hookInstallButton(btn){
    window.addEventListener("beforeinstallprompt", (e)=>{
      e.preventDefault();
      deferredPrompt = e;
      btn.style.display = "inline-block";
    });

    btn.addEventListener("click", async ()=>{
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.style.display = "none";
    });
  }

  async function clearAllCaches(){
    const keys = await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
  }

  window.PWA = { registerSW, hookInstallButton, clearAllCaches };
})();
