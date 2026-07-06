(()=>{
  if(window.__boonwavePwaPersist22)return;
  window.__boonwavePwaPersist22=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('pwa persist fix',e)}};
  const GUEST='visual-demo';
  const DATA_PREFIX_KEY='boonwave_v6_data_';
  const SESSION='boonwave_v6_session';
  const BACKUP='boonwave_v6_guest_autobackup';

  function guestKey(){return DATA_PREFIX_KEY+GUEST}
  function hasGuestData(){
    try{
      const raw=localStorage.getItem(guestKey());
      if(!raw)return false;
      const data=JSON.parse(raw);
      return Array.isArray(data.nodes)&&data.nodes.length>0;
    }catch{return false}
  }
  function backupGuestData(){
    safe(()=>{
      const raw=localStorage.getItem(guestKey());
      if(raw)localStorage.setItem(BACKUP,raw);
    });
  }
  function restoreGuestBackupIfNeeded(){
    safe(()=>{
      if(hasGuestData())return;
      const raw=localStorage.getItem(BACKUP);
      if(raw)localStorage.setItem(guestKey(),raw);
    });
  }
  function setGuestSession(){
    localStorage.setItem(SESSION,JSON.stringify({id:GUEST,name:'Визуальное знакомство',mode:'guest'}));
  }

  restoreGuestBackupIfNeeded();
  setGuestSession();

  safe(()=>{
    const previousSaveData=saveData;
    saveData=function(){
      const result=previousSaveData();
      if(state?.userId===GUEST)backupGuestData();
      return result;
    };
  });

  safe(()=>{
    const previousLoadData=loadData;
    loadData=function(userId,useDemo=false){
      if(userId===GUEST){
        restoreGuestBackupIfNeeded();
        const raw=localStorage.getItem(guestKey());
        if(raw){
          try{return normalizeData(JSON.parse(raw))}catch(error){console.warn('Invalid guest data',error)}
        }
      }
      return previousLoadData(userId,useDemo);
    };
  });

  safe(()=>{
    const previousEnterApp=enterApp;
    enterApp=function(user,useDemo){
      if(user?.id===GUEST){
        setGuestSession();
        restoreGuestBackupIfNeeded();
        useDemo=!hasGuestData();
      }
      const result=previousEnterApp(user,useDemo);
      if(user?.id===GUEST)backupGuestData();
      return result;
    };
  });

  setInterval(()=>{
    if(state?.userId===GUEST)backupGuestData();
  },5000);

  window.addEventListener('pagehide',()=>{if(state?.userId===GUEST){saveData();backupGuestData();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state?.userId===GUEST){saveData();backupGuestData();}});
})();
