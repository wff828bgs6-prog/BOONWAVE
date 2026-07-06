(()=>{
  if(window.__boonwaveDailyPatch12)return;
  window.__boonwaveDailyPatch12=true;

  const safe=(fn)=>{try{return fn()}catch(e){console.warn('daily patch',e)}};

  const style=document.createElement('style');
  style.textContent=`
    @keyframes bwPulse{0%,92%,100%{box-shadow:0 0 0 rgba(85,220,236,0);filter:none}96%{box-shadow:0 0 34px rgba(95,140,255,.55),0 0 58px rgba(161,78,255,.25);filter:brightness(1.16)}}
    @keyframes bwTaskCreated{0%,100%{box-shadow:0 0 0 rgba(85,220,236,0)}35%{box-shadow:0 0 0 1px rgba(111,219,255,.75),0 0 24px rgba(114,133,255,.45)}70%{box-shadow:0 0 0 1px rgba(163,92,255,.55),0 0 18px rgba(163,92,255,.32)}}
    .node-card.reminder-soft{animation:bwPulse 180s infinite}.node-card.reminder-medium{animation:bwPulse 60s infinite}.node-card.reminder-high{animation:bwPulse 20s infinite}.node-card.reminder-urgent{animation:bwPulse 8.6s infinite}.node-card.reminder-overdue{animation:bwPulse 14s infinite}.node-card[class*=reminder-] .card-status-dot{box-shadow:0 0 18px rgba(85,220,236,.75)}
    .task-created-pulse{animation:bwTaskCreated .8s ease-in-out 3;border-color:rgba(105,218,255,.7)!important}
    .task-contact-call-row{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}
    .task-contact-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin-top:8px!important}
    .task-contact-actions a,.task-contact-actions button{appearance:none!important;text-decoration:none!important;border:1px solid rgba(125,145,190,.28)!important;background:rgba(25,31,48,.78)!important;color:#dbe5ff!important;border-radius:18px!important;padding:8px 12px!important;font-size:13px!important;font-weight:600!important;line-height:1!important;box-shadow:none!important}
    .task-contact-actions .contact-call-btn{font-weight:600!important;min-width:auto!important}
    .task-contact-actions .active{border-color:rgba(111,219,255,.7)!important;background:rgba(80,110,175,.38)!important;color:#fff!important;box-shadow:0 0 18px rgba(92,156,255,.22)!important}
  `;
  document.head.appendChild(style);

  function digits(v){return String(v||'').replace(/[^0-9+]/g,'').replace(/^\+/,'')}
  function tgLink(phone){const d=digits(phone);return d?'tg://resolve?phone='+encodeURIComponent(d):'#'}
  function waLink(phone){const d=digits(phone);return d?'whatsapp://send?phone='+encodeURIComponent(d):'#'}
  function maxLink(phone){const d=digits(phone);return d?'max://chat?phone='+encodeURIComponent(d):'#'}
  function pulseTime(t){const v=t.dateTime||t.intervalStart||t.due;if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
  function pulseClass(n){
    if(!n||n.type!=='process')return'';
    let min=null;
    (n.tasks||[]).forEach(t=>{if(t.done||t.archived)return;const d=pulseTime(t);if(!d)return;const h=(d-Date.now())/36e5;if(min===null||h<min)min=h});
    if(min===null||min>24)return'';
    if(min<0)return'reminder-overdue';
    if(min<=1)return'reminder-urgent';
    if(min<=6)return'reminder-high';
    if(min<=12)return'reminder-medium';
    return'reminder-soft';
  }
  function applyReminderPulse(){safe(()=>{$$('.node-card').forEach(c=>{c.classList.remove('reminder-soft','reminder-medium','reminder-high','reminder-urgent','reminder-overdue');const n=nodeById(c.dataset.id),cl=pulseClass(n);if(cl)c.classList.add(cl)})})}

  safe(()=>{const rr=render;render=function(){rr();setTimeout(applyReminderPulse,0)}});
  setInterval(applyReminderPulse,30000);

  safe(()=>{createProcessForProject=function(project){
    if(!project||project.type!=='project')return;
    const count=state.data.nodes.filter(n=>n.type==='process'&&n.projectId===project.id&&!n.archived).length+1;
    const point=branchPosition(project);
    const p={id:uid(),type:'process',space:project.space,projectId:project.id,x:point.x,y:point.y,level:2,title:count===1?'Рабочий процесс · '+project.title:'Рабочий процесс '+count+' · '+project.title,status:'active',progress:0,stages:[],tasks:[],phonebook:[],peopleIds:[],expenses:[],assets:[],archived:false};
    state.data.nodes.push(p);state.data.links.push({id:uid(),a:project.id,b:p.id,kind:'process'});state.selectedId=p.id;saveData();render();focusNode(p);setTimeout(()=>openEditor(p),220);toast('Создан новый рабочий процесс')
  }});

  function stageTitle(n,id){return (n.stages||[]).find(s=>s.id===id)?.title||'Без этапа'}
  function roleList(n,sid){const tasks=(n.tasks||[]).filter(t=>!t.archived&&(!sid||t.stageId===sid));const rows=tasks.map(t=>[t.contactName,t.contactPhone,t.contactWebsite,t.contactEmail].filter(Boolean).join(' · ')).filter(Boolean);return rows.length?rows.map(esc).join('<br>'):'Назначения не добавлены'}
  function expensesByStageHtml(n){const stages=n.stages&&n.stages.length?n.stages:[{id:'',title:'Без этапа'}];return stages.map(s=>{const list=(n.expenses||[]).filter(x=>(x.stageId||'')===s.id);const total=list.reduce((a,x)=>a+Number(x.amount||0),0);return '<section class="task-archive-group"><header><div><small>ЭТАП</small><h3>'+esc(s.title)+'</h3></div><span>'+money(total)+'</span></header><div class="task-archive-list">'+(list.length?list.map(x=>'<article class="task-archive-item expanded"><button type="button" class="task-archive-item-main"><div><b>'+esc(x.title||'Затрата')+'</b><small>'+esc(x.date||'')+'</small></div><strong>'+money(x.amount)+'</strong></button></article>').join(''):'<div class="task-archive-empty">Затрат нет.</div>')+'<div class="task-archive-item-detail"><small>НАЗНАЧЕНИЯ</small><p>'+roleList(n,s.id)+'</p></div></div></section>'}).join('')}
  function openExpenseOverview(n){$('#taskArchiveDialog .dialog-header h2').textContent='Затраты списком';$('#taskArchiveBody').innerHTML=expensesByStageHtml(n);const d=$('#taskArchiveDialog');if(!d.open)d.showModal()}

  safe(()=>{const od=openDetail;openDetail=function(n){od(n);const b=$('#detailBranchButton');if(b&&n&&n.type==='process')b.textContent='Затраты списком'}});
  safe(()=>{const cb=createBranchFor;createBranchFor=function(n){if(n&&n.type==='process'){openExpenseOverview(n);return}return cb(n)}});
  safe(()=>{const oh=heroHtml;heroHtml=function(n,s){if(n&&n.type==='project')return '<div class="detail-hero process-detail-hero" data-detail-cover-shell="1" title="Двойное нажатие для настройки обложки">'+processCoverMediaHtml(n)+'<div class="detail-hero-content"><h3>'+esc(n.title)+'</h3><p>'+esc(s||nodeSubtitle(n))+'</p></div></div>';return oh(n,s)}});
  safe(()=>{expenseListHtml=function(n){const sid=state.selectedProcessStageId,first=(n.stages||[])[0]?.id||'';const list=(n.expenses||[]).filter(x=>(x.stageId||first)===sid);if(!list.length)return '<div class="note-block">Затраты этапа «'+esc(stageTitle(n,sid))+'» ещё не добавлены.</div>';return list.slice().reverse().map(x=>'<label class="expense-item" data-expense-id="'+esc(x.id)+'"><div><b>'+esc(x.title)+'</b><small>'+esc(stageTitle(n,x.stageId))+' · '+esc(x.date||'')+'</small></div><strong>'+money(x.amount)+'</strong></label>').join('')}});

  safe(()=>{const ot=openTaskEditor;openTaskEditor=function(n,t){
    ot(n,t);
    const d=state.taskDraft;if(!d)return;
    state.taskReturnProcessId=n.id;state.taskReturnStageId=state.selectedProcessStageId;state.taskReturnScrollTop=$('#detailBody')?.scrollTop||0;
    const box=$('#taskContactPicker');if(!box)return;
    box.innerHTML='<div class="field"><label>Имя / контакт</label><input id="taskContactName" value="'+esc(d.contactName||'')+'"></div><div class="field"><label>Телефон</label><input id="taskContactPhone" type="tel" value="'+esc(d.contactPhone||'')+'"><div class="task-contact-actions"><a id="taskContactCall" class="contact-call-btn" href="'+(d.contactPhone?'tel:'+esc(d.contactPhone):'#')+'">Позвонить</a><a data-msg="telegram" class="'+(d.contactMessengerLast==='telegram'?'active':'')+'" href="'+tgLink(d.contactPhone)+'">Telegram</a><a data-msg="whatsapp" class="'+(d.contactMessengerLast==='whatsapp'?'active':'')+'" href="'+waLink(d.contactPhone)+'">WhatsApp</a><a data-msg="max" class="'+(d.contactMessengerLast==='max'?'active':'')+'" href="'+maxLink(d.contactPhone)+'">MAX</a></div></div><div class="field"><label>Сайт / ссылка</label><input id="taskContactWebsite" type="url" value="'+esc(d.contactWebsite||'')+'"></div><div class="field"><label>Email</label><input id="taskContactEmail" type="email" value="'+esc(d.contactEmail||'')+'"></div>';
    const ph=$('#taskContactPhone');const sync=()=>{const v=ph.value.trim();$('#taskContactCall').href=v?'tel:'+v:'#';const tg=box.querySelector('[data-msg="telegram"]'),wa=box.querySelector('[data-msg="whatsapp"]'),mx=box.querySelector('[data-msg="max"]');if(tg)tg.href=tgLink(v);if(wa)wa.href=waLink(v);if(mx)mx.href=maxLink(v)};
    ph?.addEventListener('input',sync);
    box.querySelectorAll('[data-msg]').forEach(a=>a.addEventListener('click',()=>{state.taskDraft.contactMessengerLast=a.dataset.msg;box.querySelectorAll('[data-msg]').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));
  }});

  function restoreTaskReturn(){const node=nodeById(state.taskReturnProcessId||state.activeNodeId);if(!node||node.type!=='process')return;setTimeout(()=>{state.activeNodeId=node.id;state.selectedProcessStageId=state.taskReturnStageId||state.selectedProcessStageId;const d=$('#detailDialog');if(!d.open)openDetail(node);else renderDetailBody(node);requestAnimationFrame(()=>{const body=$('#detailBody');if(body)body.scrollTop=state.taskReturnScrollTop||0});applyReminderPulse()},50)}
  safe(()=>{const ct=closeTaskEditor;closeTaskEditor=function(){ct();restoreTaskReturn()}});
  safe(()=>{const os=saveTaskEditor;saveTaskEditor=function(e){const node=nodeById(state.activeNodeId),taskId=state.taskDraft?.id;if(state.taskDraft){state.taskDraft.contactName=$('#taskContactName')?.value.trim()||'';state.taskDraft.contactPhone=$('#taskContactPhone')?.value.trim()||'';state.taskDraft.contactWebsite=$('#taskContactWebsite')?.value.trim()||'';state.taskDraft.contactEmail=$('#taskContactEmail')?.value.trim()||''}const r=os(e);setTimeout(()=>{if(node&&node.type==='process'){if(!$('#detailDialog')?.open)openDetail(node);else renderDetailBody(node);const body=$('#detailBody'),el=body?.querySelector('[data-stage-task-id="'+taskId+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('task-created-pulse');setTimeout(()=>el.classList.remove('task-created-pulse'),2600)}toast('Задача создана')}applyReminderPulse()},80);return r}});
  safe(()=>{const sth=stageTaskHtml;stageTaskHtml=function(n,t){let html=sth(n,t);if(t.contactName||t.contactPhone||t.contactWebsite||t.contactEmail){const info='<div class="task-contact-view"><small>КОНТАКТ</small><article class="task-contact-card"><div class="task-contact-copy"><b>'+esc(t.contactName||'Контакт')+'</b>'+(t.contactPhone?'<a class="task-contact-number" href="tel:'+esc(t.contactPhone)+'">'+esc(t.contactPhone)+'</a>':'')+(t.contactWebsite?'<a class="task-contact-number" href="'+esc(t.contactWebsite)+'" target="_blank">'+esc(t.contactWebsite)+'</a>':'')+(t.contactEmail?'<a class="task-contact-number" href="mailto:'+esc(t.contactEmail)+'">'+esc(t.contactEmail)+'</a>':'')+'</div></article></div>';html=html.replace('<div class="task-time-view">',info+'<div class="task-time-view">')}return html}});

  setTimeout(()=>{
    applyReminderPulse();
    const d=$('#detailBody');if(!d)return;
    d.addEventListener('dblclick',e=>{const sh=e.target.closest('[data-detail-cover-shell]');const n=nodeById(state.activeNodeId);if(sh&&n&&n.type==='project'){e.preventDefault();e.stopImmediatePropagation();openCoverQuickMenu(n)}},true);
    d.addEventListener('click',e=>{const q=e.target.closest('[data-detail-action="quickExpense"]'),n=nodeById(state.activeNodeId);if(!q||!n||n.type!=='process')return;e.preventDefault();e.stopImmediatePropagation();const t=$('#detailExpenseTitle')?.value.trim(),a=Number(String($('#detailExpenseAmount')?.value||'').replace(',','.'));if(!t||!a)return toast('Введите описание и сумму');const sid=state.selectedProcessStageId||((n.stages||[])[0]?.id||'');n.expenses=n.expenses||[];n.expenses.push({id:uid(),title:t,amount:a,date:todayISO(),stageId:sid});state.expenseSelectionMode=false;state.selectedExpenseIds.clear();const st=$('#detailBody')?.scrollTop||0;saveData();renderDetailBody(n);$('#detailBody').scrollTop=st;toast('Добавлено в этап: '+stageTitle(n,sid))},true);
  },0);
})();
