(()=>{
  if(window.__boonwaveArchiveFix20)return;
  window.__boonwaveArchiveFix20=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('archive fix',e)}};

  function archiveCurrentProcess(){
    safe(()=>{
      const node=nodeById(state.activeNodeId);
      if(!node||node.type!=='process')return toast('Открой рабочий процесс');
      if(!confirm('Отправить рабочий процесс «'+(node.title||'Без названия')+'» в архив?'))return;
      node.archived=true;
      state.selectedId=null;
      state.selectedLinkId=null;
      state.activeNodeId=null;
      saveData();
      const detail=$('#detailDialog');
      if(detail?.open)detail.close();
      render();
      toast('Рабочий процесс в архиве');
    });
  }

  function openProcessArchiveList(){
    safe(()=>{
      const node=nodeById(state.activeNodeId);
      if(!node||node.type!=='process')return;
      const archived=(node.tasks||[]).filter(task=>task.archived);
      $('#taskArchiveDialog .dialog-header h2').textContent='Архив задач';
      $('#taskArchiveBody').innerHTML=archived.length?archived.map(task=>'<article class="task-archive-item expanded"><button type="button" class="task-archive-item-main"><div><b>'+esc(task.title||'Задача')+'</b><small>'+esc(task.due||task.dateTime||task.intervalStart||'')+'</small></div></button></article>').join(''):'<div class="task-archive-empty">Архив задач пуст.</div>';
      const d=$('#taskArchiveDialog');
      if(!d.open)d.showModal();
    });
  }

  setTimeout(()=>{
    document.addEventListener('click',event=>{
      const nodeArchive=event.target.closest('#detailNodeArchiveButton');
      if(nodeArchive){
        event.preventDefault();
        event.stopImmediatePropagation();
        archiveCurrentProcess();
        return;
      }
      const taskArchive=event.target.closest('#detailTaskArchiveButton');
      if(taskArchive){
        event.preventDefault();
        event.stopImmediatePropagation();
        openProcessArchiveList();
      }
    },true);
  },0);
})();
