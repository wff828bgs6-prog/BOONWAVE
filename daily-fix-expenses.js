(()=>{
  if(window.__boonwaveExpenseLive19)return;
  window.__boonwaveExpenseLive19=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('expense live fix',e)}};
  const currentProcess=()=>nodeById(state.activeNodeId);
  const isExpenseOverviewOpen=()=>{
    const d=$('#taskArchiveDialog');
    const h=$('#taskArchiveDialog .dialog-header h2');
    return Boolean(d?.open && h && h.textContent.trim()==='Затраты списком');
  };

  const style=document.createElement('style');
  style.textContent='.expense-overview-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.expense-overview-delete{width:42px;height:42px;border-radius:15px;border:1px solid rgba(255,145,160,.28);background:rgba(56,29,42,.72);color:#ff9aa8;font-size:18px}.expense-overview-delete:active{transform:scale(.96)}';
  document.head.appendChild(style);

  function getExpenseGroups(node){
    const stages=node.stages&&node.stages.length?node.stages:[];
    const groups=stages.map(stage=>({id:stage.id,title:stage.title||'Без этапа',items:[]}));
    const unassigned={id:'__unassigned__',title:'Без этапа / не привязано',items:[]};

    (node.expenses||[]).forEach(expense=>{
      const stageId=expense.stageId||'';
      const group=groups.find(item=>item.id===stageId);
      if(group) group.items.push(expense);
      else unassigned.items.push(expense);
    });

    if(unassigned.items.length || !groups.length) groups.push(unassigned);
    return groups;
  }

  function processExpensesTotal(node){
    return getExpenseGroups(node).reduce((sum,group)=>sum+group.items.reduce((s,x)=>s+Number(x.amount||0),0),0);
  }

  function updateProcessExpenseMetric(node){
    safe(()=>{
      if(!node||node.type!=='process')return;
      $$('#detailBody .process-metric').forEach(metric=>{
        const label=(metric.querySelector('small')?.textContent||'').trim();
        if(label==='РАСХОДЫ'){
          const value=metric.querySelector('b');
          if(value)value.textContent=money(processExpensesTotal(node));
        }
      });
    });
  }

  function expenseRow(expense){
    return '<article class="task-archive-item expanded expense-overview-row"><button type="button" class="task-archive-item-main"><div><b>'+esc(expense.title||'Затрата')+'</b><small>'+esc(expense.date||'')+'</small></div><strong>'+money(expense.amount)+'</strong></button><button type="button" class="expense-overview-delete" data-expense-overview-delete="'+esc(expense.id)+'" aria-label="Удалить затрату">🗑</button></article>';
  }

  function expensesByStageHtml(node){
    const groups=getExpenseGroups(node);
    const totalAll=processExpensesTotal(node);
    return '<section class="task-archive-group"><header><div><small>ВСЕ ЭТАПЫ</small><h3>Общая сумма затрат</h3></div><span>'+money(totalAll)+'</span></header></section>'+
      groups.map(group=>{
        const total=group.items.reduce((sum,x)=>sum+Number(x.amount||0),0);
        return '<section class="task-archive-group"><header><div><small>ЭТАП</small><h3>'+esc(group.title)+'</h3></div><span>'+money(total)+'</span></header><div class="task-archive-list">'+
          (group.items.length?group.items.slice().reverse().map(expenseRow).join(''):'<div class="task-archive-empty">Затрат нет.</div>')+
          '</div></section>';
      }).join('');
  }

  function refreshExpenseOverview(){
    safe(()=>{
      const node=currentProcess();
      if(node&&node.type==='process')updateProcessExpenseMetric(node);
      if(!isExpenseOverviewOpen())return;
      if(!node||node.type!=='process')return;
      $('#taskArchiveBody').innerHTML=expensesByStageHtml(node);
    });
  }

  function openLiveExpenseOverview(node){
    updateProcessExpenseMetric(node);
    $('#taskArchiveDialog .dialog-header h2').textContent='Затраты списком';
    $('#taskArchiveBody').innerHTML=expensesByStageHtml(node);
    const d=$('#taskArchiveDialog');
    if(!d.open)d.showModal();
  }

  safe(()=>{
    const previousCreateBranchFor=createBranchFor;
    createBranchFor=function(node){
      if(node&&node.type==='process'){
        openLiveExpenseOverview(node);
        return;
      }
      return previousCreateBranchFor(node);
    };
  });

  safe(()=>{
    const previousRenderDetailBody=renderDetailBody;
    renderDetailBody=function(node){
      previousRenderDetailBody(node);
      if(node&&node.type==='process')updateProcessExpenseMetric(node);
      refreshExpenseOverview();
    };
  });

  setTimeout(()=>{
    const body=$('#detailBody');
    if(body){
      body.addEventListener('click',event=>{
        if(event.target.closest('[data-detail-action="quickExpense"], [data-detail-action="toggleExpenseDelete"], [data-expense-select]')){
          setTimeout(refreshExpenseOverview,80);
          setTimeout(refreshExpenseOverview,250);
          setTimeout(refreshExpenseOverview,700);
        }
      },true);
    }

    const archiveBody=$('#taskArchiveBody');
    if(archiveBody){
      archiveBody.addEventListener('click',event=>{
        const button=event.target.closest('[data-expense-overview-delete]');
        if(!button)return;
        event.preventDefault();
        event.stopPropagation();
        const node=currentProcess();
        if(!node||node.type!=='process')return;
        const id=button.dataset.expenseOverviewDelete;
        const expense=(node.expenses||[]).find(item=>item.id===id);
        if(!expense)return;
        if(!confirm('Удалить затрату «'+(expense.title||'Затрата')+'»?'))return;
        node.expenses=(node.expenses||[]).filter(item=>item.id!==id);
        state.selectedExpenseIds?.delete?.(id);
        saveData();
        renderDetailBody(node);
        render();
        refreshExpenseOverview();
        toast('Затрата удалена');
      },true);
    }
    refreshExpenseOverview();
  },0);

  setInterval(refreshExpenseOverview,1500);
})();
