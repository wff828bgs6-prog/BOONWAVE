(()=>{
  if(window.__boonwaveProjectCoverFix29)return;
  window.__boonwaveProjectCoverFix29=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('project cover fix',e)}};

  function nodeCanHaveCover(node){return node&&['project','process'].includes(node.type)}

  safe(()=>{
    const oldHandle=handleProcessCoverFile;
    handleProcessCoverFile=async function(event){
      const file=event.target.files?.[0];
      event.target.value='';
      if(!file||!state.editDraft||!nodeCanHaveCover(state.editDraft))return;
      if(state.quickCoverNodeId){
        const quickDialog=$('#coverQuickMenu');
        quickDialog?.classList.remove('is-leaving');
        if(quickDialog?.open)quickDialog.close();
      }
      const previousId=state.editDraft.coverAssetId;
      const id=uid();
      const metadata={id,name:file.name,type:file.type||'image/jpeg',size:file.size,createdAt:Date.now()};
      await putAsset({...metadata,blob:file});
      state.editDraft.assets||=[];
      if(previousId&&!state.quickCoverNodeId){
        state.editDraft.assets=state.editDraft.assets.filter(asset=>asset.id!==previousId);
        releaseObjectUrl(previousId);
        await deleteAssetRecord(previousId).catch(()=>{});
      }
      state.editDraft.assets.push(metadata);
      if(state.quickCoverNodeId)state.quickCoverPendingAssetId=id;
      state.editDraft.coverAssetId=id;
      state.editDraft.coverPosition={x:0,y:0,scale:1};
      state.editDraft.coverPositions=normalizedProcessCoverPositions({});
      if(state.quickCoverNodeId)openProcessCoverPositionDialog(id);
      else{renderEditorBody();openProcessCoverPositionDialog(id);}
    };
  });

  safe(()=>{
    const oldHero=heroHtml;
    heroHtml=function(node,subtitle){
      if(node?.type==='project'){
        return '<div class="detail-hero process-detail-hero project-cover-hero" data-detail-cover-shell="1" title="Нажмите для настройки обложки">'+processCoverMediaHtml(node)+'<div class="detail-hero-content"><h3>'+esc(node.title)+'</h3><p>'+esc(subtitle||nodeSubtitle(node))+'</p></div></div>';
      }
      return oldHero(node,subtitle);
    };
  });

  safe(()=>{
    const oldRender=renderDetailBody;
    renderDetailBody=function(node){
      oldRender(node);
      if(node?.type==='project'){
        const hero=$('#detailBody .detail-hero');
        if(hero){
          hero.setAttribute('data-detail-cover-shell','1');
          hero.classList.add('process-detail-hero','project-cover-hero');
          hero.title='Нажмите для настройки обложки';
          if(node.coverAssetId&&!hero.querySelector('.process-cover-media')){
            hero.insertAdjacentHTML('afterbegin',processCoverMediaHtml(node));
            hydrateDetailAssets(node);
          }
        }
      }
    };
  });

  function openProjectCover(node){
    if(!nodeCanHaveCover(node))return;
    state.activeNodeId=node.id;
    openCoverQuickMenu(node);
  }

  setTimeout(()=>{
    const body=$('#detailBody');
    if(!body)return;
    body.addEventListener('click',event=>{
      const shell=event.target.closest('[data-detail-cover-shell]');
      const node=nodeById(state.activeNodeId);
      if(shell&&node?.type==='project'){
        event.preventDefault();
        event.stopPropagation();
        openProjectCover(node);
      }
    },true);
    body.addEventListener('dblclick',event=>{
      const shell=event.target.closest('[data-detail-cover-shell]');
      const node=nodeById(state.activeNodeId);
      if(shell&&nodeCanHaveCover(node)){
        event.preventDefault();
        event.stopPropagation();
        openProjectCover(node);
      }
    },true);
  },0);
})();
