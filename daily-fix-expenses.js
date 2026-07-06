(()=>{
  if(window.__boonwaveExpenseLive17)return;
  window.__boonwaveExpenseLive17=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('expense live fix',e)}};
  const stageTitle=(node,id)=>(node?.stages||[]).find(s=>s.id===id)?.title||'Без этапа';
  const currentProcess=()=>nodeById(state.activeNodeId);
  const isExpenseOverviewOpen=()=>{
    const d=$('#taskArchiveDialog');
    const h=$('#taskArchiveDialog .dialog-header h2');
    return Boolean(d?.open && h && h.textContent.trim()==='Затраты списком');
  };

  function expensesByStageHtml(node){
    const stages=node.stages&&node.stages.length?node.stages:[{id:'',title:'Без этапа'}];
    const totalAll=(node.expenses||[]).reduce((sum,x)=>sum+Number(x.amount||0),0);
    return '<section class="task-archive-group"><header><div><small>ВСЕ ЭТАПЫ</small><h3>Общая сумма затрат</h3></div><span>'+money(totalAll)+'</span></header></section>'+
      stages.map(stage=>{
        const list=(node.expenses||[]).filter(x=>(x.stageId||'')===stage.id || (!x.stageId && stage.id===(node.stages||[])[0]?.id));
        const total=list.reduce((sum,x)=>sum+Number(x.amount||0),0);
        return '<section class="task-archive-group"><header><div><small>ЭТАП</small><h3>'+esc(stage.title||'Без этапа')+'</h3></div><span>'+money(total)+'</span></header><div class="task-archive-list">'+
          (list.length?list.slice().reverse().map(x=>'<article class="task-archive-item expanded"><button type="button" class="task-archive-item-main"><div><b>'+esc(x.title||'Затрата')+'</b><small>'+esc(x.date||'')+'</small></div><strong>'+money(x.amount)+'</strong></button></article>').join(''):'<div class="task-archive-empty">Затрат нет.</div>')+
          '</div></section>';
      }).join('');
  }

  function refreshExpenseOverview(){
    safe(()=>{
      if(!isExpenseOverviewOpen())return;
      const node=currentProcess();
      if(!node||node.type!=='process')return;
      $('#taskArchiveBody').innerHTML=expensesByStageHtml(node);
    });
  }

  function openLiveExpenseOverview(node){
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
      refreshExpenseOverview();
    };
  });

  setTimeout(()=>{
    const body=$('#detailBody');
    if(!body)return;
    body.addEventListener('click',event=>{
      if(event.target.closest('[data-detail-action="quickExpense"], [data-detail-action="toggleExpenseDelete"], [data-expense-select]')){
        setTimeout(refreshExpenseOverview,120);
        setTimeout(refreshExpenseOverview,500);
      }
    },true);
  },0);

  setInterval(refreshExpenseOverview,2000);
})();
