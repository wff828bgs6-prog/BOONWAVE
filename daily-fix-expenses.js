(()=>{
  if(window.__boonwaveExpenseLive18)return;
  window.__boonwaveExpenseLive18=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('expense live fix',e)}};
  const currentProcess=()=>nodeById(state.activeNodeId);
  const isExpenseOverviewOpen=()=>{
    const d=$('#taskArchiveDialog');
    const h=$('#taskArchiveDialog .dialog-header h2');
    return Boolean(d?.open && h && h.textContent.trim()==='Затраты списком');
  };

  function getExpenseGroups(node){
    const stages=node.stages&&node.stages.length?node.stages:[];
    const stageIds=new Set(stages.map(stage=>stage.id));
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
      const metrics=$$('#detailBody .process-metric');
      metrics.forEach(metric=>{
        const label=(metric.querySelector('small')?.textContent||'').trim();
        if(label==='РАСХОДЫ'){
          const value=metric.querySelector('b');
          if(value)value.textContent=money(processExpensesTotal(node));
        }
      });
    });
  }

  function expensesByStageHtml(node){
    const groups=getExpenseGroups(node);
    const totalAll=processExpensesTotal(node);
    return '<section class="task-archive-group"><header><div><small>ВСЕ ЭТАПЫ</small><h3>Общая сумма затрат</h3></div><span>'+money(totalAll)+'</span></header></section>'+
      groups.map(group=>{
        const total=group.items.reduce((sum,x)=>sum+Number(x.amount||0),0);
        return '<section class="task-archive-group"><header><div><small>ЭТАП</small><h3>'+esc(group.title)+'</h3></div><span>'+money(total)+'</span></header><div class="task-archive-list">'+
          (group.items.length?group.items.slice().reverse().map(x=>'<article class="task-archive-item expanded"><button type="button" class="task-archive-item-main"><div><b>'+esc(x.title||'Затрата')+'</b><small>'+esc(x.date||'')+'</small></div><strong>'+money(x.amount)+'</strong></button></article>').join(''):'<div class="task-archive-empty">Затрат нет.</div>')+
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
    if(!body)return;
    body.addEventListener('click',event=>{
      if(event.target.closest('[data-detail-action="quickExpense"], [data-detail-action="toggleExpenseDelete"], [data-expense-select]')){
        setTimeout(refreshExpenseOverview,80);
        setTimeout(refreshExpenseOverview,250);
        setTimeout(refreshExpenseOverview,700);
      }
    },true);
    refreshExpenseOverview();
  },0);

  setInterval(refreshExpenseOverview,1500);
})();
