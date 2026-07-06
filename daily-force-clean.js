(()=>{
  const params=new URLSearchParams(location.search);
  const force=params.get('force_clean')==='1'||params.get('ios_home')==='33';
  if(!force||window.__boonwaveForceClean33)return;
  window.__boonwaveForceClean33=true;
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.indexOf('boonwave_')===0)keys.push(key);
    }
    keys.forEach(key=>localStorage.removeItem(key));
    localStorage.setItem('boonwave_force_clean_done_v33','1');
  }catch(e){console.warn('force clean failed',e)}
  try{
    if(window.state&&window.blankData){
      state.userId='visual-demo';
      state.data=blankData();
      localStorage.setItem('boonwave_v6_session',JSON.stringify({id:'visual-demo',name:'BOONWAVE',mode:'guest'}));
      localStorage.setItem('boonwave_v6_data_visual-demo',JSON.stringify(state.data));
    }
  }catch(e){console.warn('force blank failed',e)}
})();
