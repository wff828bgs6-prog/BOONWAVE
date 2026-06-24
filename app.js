
const AUTH_KEY="boonwave_auth_v2";
function showWorkspace(){
  document.querySelector("#authScreen")?.classList.add("hidden");
  document.querySelector("#guidePanel")?.classList.add("hidden");
  const app=document.querySelector("#app");
  app?.classList.remove("app-hidden");
  requestAnimationFrame(()=>app?.classList.add("app-ready"));
  setTimeout(renderDotField,100);
}
function showAuth(){document.querySelector("#authScreen")?.classList.remove("hidden")}
function openGuide(){document.querySelector("#guidePanel")?.classList.remove("hidden")}
function initializeOnboarding(){
  const splash=document.querySelector("#splashScreen");
  const hasSession=!!localStorage.getItem(AUTH_KEY);
  setTimeout(()=>{
    splash?.classList.add("leaving");
    setTimeout(()=>{splash?.classList.add("hidden");hasSession?showWorkspace():showAuth()},420);
  },2000);
  document.querySelectorAll("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-auth-tab]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    const login=btn.dataset.authTab==="login";
    document.querySelector("#loginForm")?.classList.toggle("hidden",!login);
    document.querySelector("#registerForm")?.classList.toggle("hidden",login);
  }));
  document.querySelector("#skipAuth")?.addEventListener("click",showWorkspace);
  document.querySelector("#loginForm")?.addEventListener("submit",e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    localStorage.setItem(AUTH_KEY,JSON.stringify({email:fd.get("email"),mode:"login",date:Date.now()}));showWorkspace();
  });
  document.querySelector("#registerForm")?.addEventListener("submit",e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    localStorage.setItem(AUTH_KEY,JSON.stringify({name:fd.get("name"),email:fd.get("email"),mode:"register",date:Date.now()}));showWorkspace();
  });
}
document.addEventListener("DOMContentLoaded",initializeOnboarding);

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const TYPES={
 project:{label:"Проект",icon:"◆"},goal:{label:"Цель",icon:"◎"},person:{label:"Человек",icon:"●"},
 idea:{label:"Идея",icon:"▧"},stage:{label:"Этап",icon:"◫"},task:{label:"Задача",icon:"✓"}
};
const state={
 data:null,space:"work",scale:.82,tx:-250,ty:-180,selected:null,editing:null,linkMode:null,
 pointers:new Map(),gesture:null,dragNodeId:null,dragScreen:null,fileMode:"all"
};
const blank=()=>({version:"5-expanded",space:"work",nodes:[],links:[],inbox:[],updated:Date.now()});
function load(){try{return JSON.parse(localStorage.getItem("boonwave_v5_expanded"))||blank()}catch{return blank()}}
function save(){state.data.updated=Date.now();localStorage.setItem("boonwave_v5_expanded",JSON.stringify(state.data))}
state.data=load();

function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random().toString(16).slice(2)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function nodes(){return state.data.nodes.filter(n=>n.space===state.space)}
function nodeById(id){return state.data.nodes.find(n=>n.id===id)}
function money(v){return Number(v||0).toLocaleString("ru-RU")+" ₽"}

function cardDims(n){const level=typeLevel(n);return level===1?{w:132,h:94}:level===3?{w:316,h:260}:{w:210,h:118}}
function renderDotField(){
 const canvas=$("#workspaceDots"); if(!canvas) return;
 const rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
 if(!rect.width||!rect.height) return;
 if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){
   canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
 }
 const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
 const spacing=24, nodesInSpace=nodes();
 for(let y=12;y<rect.height;y+=spacing){
   for(let x=12;x<rect.width;x+=spacing){
     let a=.11, r=1.05, hue=(x+y)%48<24?0:1;
     nodesInSpace.forEach(n=>{
       const dim=cardDims(n); const cx=(n.x+dim.w/2)*state.scale+state.tx; const cy=(n.y+dim.h/2)*state.scale+state.ty;
       const dist=Math.hypot(x-cx,y-cy); const infl=n.id===state.dragNodeId?180:120;
       if(dist<infl){const k=1-dist/infl; a+=k*(n.id===state.dragNodeId ? .28 : .17); r+=k*(n.id===state.dragNodeId?2.0:1.2)}
     });
     if(state.dragScreen){const dist=Math.hypot(x-state.dragScreen.x,y-state.dragScreen.y); if(dist<120){const k=1-dist/120; a+=k*.22; r+=k*1.5}}
     ctx.beginPath(); ctx.fillStyle=hue?`rgba(97,222,242,${Math.min(a,.7)})`:`rgba(126,107,255,${Math.min(a,.7)})`; ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
   }
 }
}
window.addEventListener('resize',renderDotField);
function typeLevel(n){
 if(n.manualLevel)return n.manualLevel;
 if(state.scale<.58)return 1;
 if(state.scale>1.12)return 3;
 return 2
}
function iconBadge(icon,label,value){return `<span class="badge icon-badge" title="${label}"><span class="mini-ico">${icon}</span><span>${value}</span></span>`}
function nodeMetaHTML(n,counts){
 const openTasks=(n.tasks||[]).filter(t=>!t.done).length;
 if(n.type==="project") return `<div class="meta meta-strip">${iconBadge('◫','Фото',counts.images||0)}${iconBadge('PDF','PDF',counts.pdf||0)}${iconBadge('⌁','Файлы',counts.files||0)}${iconBadge('◉','Контакты',(n.contacts||[]).length||0)}${iconBadge('✓','Задачи',openTasks)}</div>`;
 if(n.type==="person") return `<div class="meta meta-strip">${iconBadge('◫','Фото',counts.images||0)}${iconBadge('✆','Связь',Number(!!n.phone)+Number(!!n.email)+Number(!!n.social))}${iconBadge('✓','Задачи',openTasks)}${iconBadge('⌘','Теги',(n.tags||'').split(',').filter(Boolean).length)}</div>`;
 if(n.type==="idea") return `<div class="meta meta-strip">${iconBadge('◫','Изображения',counts.images||0)}${iconBadge('PDF','PDF',counts.pdf||0)}${iconBadge('⌁','Файлы',counts.files||0)}</div>`;
 return `<div class="meta meta-strip">${iconBadge('✓','Задачи',openTasks)}${iconBadge('⌁','Файлы',counts.files||0)}</div>`;
}
function nodeSecondaryHTML(n){
 if(n.type==="project") return `<div class="status-row"><span class="state-chip">${esc(n.status||'Подготовка')}</span><span class="state-chip subtle">${esc(n.priority||'Средний')}</span>${n.budget?`<span class="state-chip money">${money(n.budget)}</span>`:''}</div>`;
 if(n.type==="person") return `<div class="person-line"><b>${esc(n.speciality||'Специалист')}</b><span>${esc(n.zone||'Ближнее поле')}</span></div><div class="person-contacts">${n.phone?`<span>${esc(n.phone)}</span>`:''}${n.email?`<span>${esc(n.email)}</span>`:''}${n.site?`<span>${esc(n.site)}</span>`:''}</div>`;
 if(n.type==="idea") return `<div class="status-row"><span class="state-chip">${esc(n.source||'Источник')}</span>${n.tags?`<span class="state-chip subtle">${esc(n.tags.split(',')[0].trim())}</span>`:''}</div>`;
 if(n.type==="goal") return `<div class="status-row">${n.deadline?`<span class="state-chip">до ${esc(n.deadline)}</span>`:''}<span class="state-chip subtle">${n.progress||0}%</span></div>`;
 return '';
}
function nodeQuickHTML(n){
 if(n.type==="project") return `<div class="card-actions"><button class="mini-action accent" data-add-image="${n.id}">3 Фото</button><button class="mini-action" data-files="${n.id}">6 Файл</button><button class="mini-action" data-open-node="${n.id}">1 Смотреть</button><button class="mini-action" data-edit-node="${n.id}">31 Изм.</button></div>`;
 if(n.type==="person") return `<div class="card-actions"><button class="mini-action accent" data-add-image="${n.id}">3 Фото</button><button class="mini-action" data-open-node="${n.id}">1 Смотреть</button><button class="mini-action" data-edit-node="${n.id}">31 Изм.</button></div>`;
 if(n.type==="idea") return `<div class="card-actions"><button class="mini-action accent" data-add-image="${n.id}">3 Изобр.</button><button class="mini-action" data-open-node="${n.id}">1 Смотреть</button></div>`;
 return `<div class="card-actions"><button class="mini-action" data-open-node="${n.id}">1 Смотреть</button><button class="mini-action" data-edit-node="${n.id}">31 Изм.</button></div>`;
}
function applyTransform(){
 const t=`translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
 $("#workspace").style.transform=t;$("#links").style.transform=t;renderLinks();renderDotField()
}
function render(){
 const ws=$("#workspace");ws.innerHTML="";
 nodes().forEach(n=>{
  const level=typeLevel(n),el=document.createElement("article");
  el.className=`node level-${level}${state.selected===n.id?" selected":""}`;
  el.dataset.id=n.id;el.dataset.type=n.type;
  el.style.left=n.x+"px";el.style.top=n.y+"px";
  const cover=n.image?`style="background-image:url('${n.image}')"`:"";
  const counts=n.counts||{};
  const subtitle=n.type==="project"?(n.client||n.address||"Новый проект"):
    n.type==="person"?(n.speciality||"Специалист"):
    n.type==="idea"?(n.source||"Сохранённая идея"):
    n.type==="goal"?(n.deadline?`до ${n.deadline}`:"Цель"):
    (n.note||"");
  el.innerHTML=`<div class="cover" ${cover}></div><span class="status"></span>${n.showHint?'<button class=\"hint-btn\" data-hint=\"'+n.id+'\" aria-label=\"Подсказка\"></button>':''}<div class="content">
    <h3>${esc(n.title||TYPES[n.type]?.label||"Элемент")}</h3>
    <p>${esc(subtitle)}</p>
    <div class="meta">
      <span class="badge">📷 ${counts.images||0}</span><span class="badge">PDF ${counts.pdf||0}</span>
      <span class="badge">⚙ ${counts.files||0}</span><span class="badge">✓ ${(n.tasks||[]).filter(t=>!t.done).length}</span>
      ${n.progress!=null?`<span class="badge">${n.progress}%</span>`:""}
    </div>
    <div class="quick-expense">
      <input class="expense-name" placeholder="Затрата">
      <input class="expense-value" inputmode="decimal" placeholder="Сумма">
      <button data-quick-expense="${n.id}">➤</button>
    </div>
    ${n.type==="project"?`<div class="quick-photo"><button class="photo-btn primary-lite" data-add-image="${n.id}">＋ Фото</button><button class="photo-btn" data-files="${n.id}">Файл</button></div>`:""}
  </div>`;
  attachNodeEvents(el,n);ws.appendChild(el)
 });
 $("#emptyState").classList.toggle("hidden",nodes().length>0);
 const cue=$("#addCue"); if(cue) cue.style.display = nodes().length>0 ? "none" : "flex";
 applyTransform();renderToday();renderInbox()
}
function attachNodeEvents(el,n){
 let timer=null,start=null,moved=false;
 el.addEventListener("pointerdown",e=>{
  if(e.target.closest("input,button"))return;
  e.stopPropagation();if(e.target.closest('.hint-btn')) return; el.setPointerCapture(e.pointerId);
  start={x:e.clientX,y:e.clientY,nx:n.x,ny:n.y};moved=false;state.dragNodeId=n.id;state.dragScreen={x:e.clientX,y:e.clientY};renderDotField();
  timer=setTimeout(()=>{timer=null;navigator.vibrate?.(15);openContext(n,e.clientX,e.clientY)},480)
 });
 el.addEventListener("pointermove",e=>{
  if(!start||n.locked)return;
  const dx=(e.clientX-start.x)/state.scale,dy=(e.clientY-start.y)/state.scale; state.dragScreen={x:e.clientX,y:e.clientY};
  if(Math.hypot(dx,dy)>5){moved=true;if(timer)clearTimeout(timer);n.x=start.nx+dx;n.y=start.ny+dy;el.style.left=n.x+"px";el.style.top=n.y+"px";renderLinks();renderDotField()}
 });
 el.addEventListener("pointerup",e=>{
  if(timer)clearTimeout(timer);
  if(start&&moved){save()}else if(timer!==null){selectNode(n.id)}
  start=null; state.dragNodeId=null; state.dragScreen=null; renderDotField()
 });
 el.addEventListener("dblclick",e=>{e.stopPropagation();focusNode(n)});
}
function selectNode(id){state.selected=id;render()}
function focusNode(n){
 state.selected=n.id;n.manualLevel=3;
 const w=310,h=300,rect=$("#workspaceWrap").getBoundingClientRect();
 state.scale=Math.min(1.25,Math.max(.9,rect.width/(w+50)));
 state.tx=rect.width/2-(n.x+w/2)*state.scale;
 state.ty=rect.height/2-(n.y+h/2)*state.scale;
 render()
}
function renderLinks(){
 const svg=$("#links");svg.innerHTML="";
 state.data.links.filter(l=>nodeById(l.a)?.space===state.space&&nodeById(l.b)?.space===state.space).forEach(l=>{
  const a=nodeById(l.a),b=nodeById(l.b); if(!a||!b)return;
  const ax=a.x+(typeLevel(a)===1?62:typeLevel(a)===3?155:105),ay=a.y+65;
  const bx=b.x+(typeLevel(b)===1?62:typeLevel(b)===3?155:105),by=b.y+65;
  const dx=Math.abs(bx-ax),c=Math.max(80,dx*.45);
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d",`M ${ax} ${ay} C ${ax+c} ${ay-40}, ${bx-c} ${by+40}, ${bx} ${by}`);
  path.setAttribute("class","wave"+((state.selected===a.id||state.selected===b.id)?" active":""));
  svg.appendChild(path)
 })
}
function createNode(type,opts={}){
 const center={x:(innerWidth/2-state.tx)/state.scale-105,y:(innerHeight/2-state.ty)/state.scale-70};
 const defaults={project:{title:'Новый проект',client:'',address:'',status:'Подготовка',showHint:true},goal:{title:'Новая цель'},person:{title:'Новый человек'},idea:{title:'Новая идея'},stage:{title:'Новый этап'}};
 const base=defaults[type]||{};
 const n={id:uid(),type,space:state.space,title:base.title||TYPES[type].label,x:center.x+Math.random()*40,y:center.y+Math.random()*40,
  status:base.status||'active',priority:'medium',note:'',tasks:[],expenses:[],contacts:[],files:[],counts:{images:0,pdf:0,files:0},progress:0,client:base.client||'',address:base.address||'',showHint:!!base.showHint};
 state.data.nodes.push(n);save();$("#createMenu").classList.add("hidden");render(); renderDotField(); focusNode(n);
 if(opts.openEditor!==false) openEditor(n);
 return n
}
function fieldsFor(n){
 const common=`<div class="field"><label>Название</label><input name="title" value="${esc(n.title)}"></div>
 <div class="field"><label>Заметка</label><textarea name="note">${esc(n.note||"")}</textarea></div>`;
 if(n.type==="project")return common+`
 <div class="field-grid"><div class="field"><label>Клиент</label><input name="client" value="${esc(n.client||"")}"></div>
 <div class="field"><label>Адрес объекта</label><input name="address" value="${esc(n.address||"")}"></div></div>
 <div class="field-grid"><div class="field"><label>Статус</label><select name="status"><option>Подготовка</option><option>В работе</option><option>На паузе</option><option>Завершён</option></select></div>
 <div class="field"><label>Приоритет</label><select name="priority"><option>Высокий</option><option>Средний</option><option>Низкий</option></select></div></div>
 <div class="field-grid"><div class="field"><label>Количество позиций</label><input name="positions" inputmode="numeric" value="${n.positions||""}"></div>
 <div class="field"><label>Дата подписания</label><input type="date" name="signDate" value="${n.signDate||""}"></div></div>
 <div class="field-grid"><div class="field"><label>Бюджет</label><input name="budget" inputmode="decimal" value="${n.budget||""}"></div>
 <div class="field"><label>Аванс</label><input name="advance" inputmode="decimal" value="${n.advance||""}"></div></div>
 <div class="field-grid"><div class="field"><label>Остаток</label><input name="balance" inputmode="decimal" value="${n.balance||""}"></div>
 <div class="field"><label>Срок монтажа</label><input type="date" name="deadline" value="${n.deadline||""}"></div></div>`;
 if(n.type==="person")return common+`
 <div class="field"><label>Специализация</label><input name="speciality" value="${esc(n.speciality||"")}"></div>
 <div class="field"><label>Теги и материалы</label><input name="tags" value="${esc(n.tags||"")}"></div>
 <div class="field-grid"><div class="field"><label>Телефон</label><input name="phone" value="${esc(n.phone||"")}"></div>
 <div class="field"><label>Email</label><input name="email" value="${esc(n.email||"")}"></div></div>
 <div class="field-grid"><div class="field"><label>Сайт</label><input name="site" value="${esc(n.site||"")}"></div>
 <div class="field"><label>Соцсеть</label><input name="social" value="${esc(n.social||"")}"></div></div>
 <div class="field"><label>Зона внимания</label><select name="zone"><option>В работе</option><option>Ближнее поле</option><option>Резерв</option><option>Дальняя полка</option><option>Архив</option></select></div>`;
 if(n.type==="idea")return common+`
 <div class="field-grid"><div class="field"><label>Источник</label><select name="source"><option>Pinterest</option><option>Instagram</option><option>YouTube</option><option>Сайт</option></select></div>
 <div class="field"><label>Ссылка</label><input name="url" value="${esc(n.url||"")}"></div></div>
 <div class="field"><label>Почему сохранено</label><textarea name="why">${esc(n.why||"")}</textarea></div>
 <div class="field"><label>Теги, материалы, технологии</label><input name="tags" value="${esc(n.tags||"")}"></div>`;
 if(n.type==="goal")return common+`
 <div class="field-grid"><div class="field"><label>Срок</label><input type="date" name="deadline" value="${n.deadline||""}"></div>
 <div class="field"><label>Прогресс, %</label><input type="number" min="0" max="100" name="progress" value="${n.progress||0}"></div></div>
 <div class="field"><label>Показатель результата</label><input name="metric" value="${esc(n.metric||"")}"></div>`;
 return common+`<div class="field"><label>Срок</label><input type="date" name="deadline" value="${n.deadline||""}"></div>`
}
function openEditor(n){
 state.editing=n.id;$("#editorTypeLabel").textContent=TYPES[n.type]?.label||n.type;
 $("#editorTitle").textContent=n.title||"Карточка";$("#editorFields").innerHTML=fieldsFor(n);$("#editor").showModal()
}
function saveEditor(){
 const n=nodeById(state.editing);if(!n)return;
 const fd=new FormData($("#editorForm"));for(const [k,v] of fd)n[k]=v;
 n.progress=Number(n.progress||0);save();render()
}
function deleteNode(){
 const id=state.editing;if(!id)return;
 state.data.nodes=state.data.nodes.filter(n=>n.id!==id);state.data.links=state.data.links.filter(l=>l.a!==id&&l.b!==id);
 save();$("#editor").close();render()
}
function openContext(n,x,y){
 state.selected=n.id;const c=$("#contextMenu");c.innerHTML="";
 const actions=[
  ["Открыть",()=>openDetail(n)],["Изменить",()=>openEditor(n)],["Связать",()=>startLink(n)],
  [n.locked?"Открепить":"Зафиксировать",()=>{n.locked=!n.locked;save();render()}],
  ["Масштаб",()=>{n.manualLevel=(typeLevel(n)%3)+1;save();render()}],
  ["Задача",()=>addTask(n)],["Файл",()=>pickFiles(n)]
 ];
 actions.forEach(([t,fn])=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>{c.classList.add("hidden");fn()};c.appendChild(b)});
 c.style.left=Math.min(x,innerWidth-300)+"px";c.style.top=Math.max(70,y-55)+"px";c.classList.remove("hidden")
}
function startLink(n){state.linkMode=n.id;toast("Выберите второй элемент для связи")}
function openHint(n){
 toast('Подсказка: заполните проект и добавьте первую задачу');
 n.showHint=false; save(); render(); setTimeout(()=>openEditor(n),350)
}
function addTask(n){
 const title=prompt("Новая задача");if(!title)return;
 n.tasks.push({id:uid(),title,done:false,due:""});save();render();toast("Задача добавлена")
}
function pickFiles(n){state.fileTarget=n.id;state.fileMode="all";const fp=$("#filePicker");fp.accept="";fp.click()}
function pickImages(n){state.fileTarget=n.id;state.fileMode="image";const fp=$("#filePicker");fp.accept="image/*";fp.click()}
$("#filePicker").addEventListener("change",e=>{
 const n=nodeById(state.fileTarget);if(!n)return;
 const files=[...e.target.files];
 let pending=0;
 files.forEach(f=>{
  n.files.push({id:uid(),name:f.name,type:f.type,size:f.size});
  if(f.type.startsWith("image/")){
    n.counts.images++;
    if(!n.image){
      pending++;
      const reader=new FileReader();
      reader.onload=()=>{n.image=reader.result; pending--; save(); render(); if(!pending) toast("Фото добавлено")};
      reader.readAsDataURL(f);
    }
  }else if(f.type==="application/pdf")n.counts.pdf++;else n.counts.files++
 });
 save();render();
 if(!(files.some(f=>f.type.startsWith("image/") && !n.image))) toast(state.fileMode==="image"?"Фото добавлено":"Файлы добавлены");
 e.target.value=""; e.target.accept=""; state.fileMode="all";
});
function openDetail(n){
 $("#detailType").textContent=TYPES[n.type]?.label||n.type;$("#detailTitle").textContent=n.title;
 let body=`<section class="detail-section"><h3>Сводка</h3><p>${esc(n.note||"Нет описания")}</p></section>`;
 if(n.type==="project"){
  const expenseTotal=(n.expenses||[]).reduce((s,e)=>s+Number(e.amount||0),0);
  body+=`<section class="detail-section"><div class="stats">
   <div class="stat"><small>Бюджет</small><b>${money(n.budget)}</b></div>
   <div class="stat"><small>Аванс</small><b>${money(n.advance)}</b></div>
   <div class="stat"><small>Затраты</small><b>${money(expenseTotal)}</b></div>
  </div></section>
  <section class="detail-section"><h3>Быстрая затрата</h3><div class="expense-add">
   <input id="detailExpenseName" placeholder="Доставка пластика"><input id="detailExpenseAmount" inputmode="decimal" placeholder="Сумма">
   <button data-detail-expense="${n.id}">➤</button></div></section>
  <section class="detail-section"><h3>Клиент и объект</h3><p>${esc(n.client||"Клиент не указан")} · ${esc(n.address||"Адрес не указан")}</p></section>`;
 }
 if(n.type==="person")body+=`<section class="detail-section"><h3>Резюме</h3><div class="chips">${(n.tags||"").split(",").filter(Boolean).map(x=>`<span class="chip">${esc(x.trim())}</span>`).join("")}</div>
 <p>${esc(n.speciality||"")}<br>${esc(n.phone||"")} ${esc(n.email||"")}<br>${esc(n.site||"")} ${esc(n.social||"")}</p></section>`;
 if(n.type==="idea")body+=`<section class="detail-section"><h3>Почему сохранено</h3><p>${esc(n.why||"")}</p><p>${esc(n.source||"")} · ${esc(n.url||"")}</p></section>`;
 body+=`<section class="detail-section"><h3>Задачи</h3><div id="detailTasks">${(n.tasks||[]).map(t=>`<label class="task-row"><input type="checkbox" data-task="${t.id}" ${t.done?"checked":""}><span>${esc(t.title)}</span></label>`).join("")||"<p>Нет задач</p>"}
 <button class="ghost" data-add-task="${n.id}">＋ Добавить задачу</button></div></section>
 <section class="detail-section"><h3>Материалы</h3><div class="file-row">${(n.files||[]).map(f=>`<div class="file-tile">${esc(f.name)}</div>`).join("")||"<p>Файлы не добавлены</p>"}</div><button class="ghost" data-add-image="${n.id}">＋ Фото</button> <button class="ghost" data-files="${n.id}">＋ Файл</button></section>`;
 if(n.type==="project")body+=`<section class="detail-section"><h3>Таблица затрат</h3>${(n.expenses||[]).map(e=>`<div class="list-card"><b>${esc(e.name)}</b><small>${money(e.amount)} · ${new Date(e.date).toLocaleDateString("ru-RU")}</small></div>`).join("")||"<p>Затрат пока нет</p>"}</section>`;
 $("#detailBody").innerHTML=body;$("#detail").showModal()
}
function addExpense(n,name,amount){
 if(!name||!amount)return;n.expenses=n.expenses||[];n.expenses.push({id:uid(),name,amount:Number(String(amount).replace(",",".")),date:Date.now()});save();render();toast("Добавлено в затраты")
}
function renderToday(){
 const list=[];
 state.data.nodes.forEach(n=>(n.tasks||[]).filter(t=>!t.done).forEach(t=>list.push({...t,parent:n.title,type:n.type})));
 $("#todayList").innerHTML=list.slice(0,30).map(t=>`<div class="list-card"><b>${esc(t.title)}</b><small>${esc(t.parent)}${t.due?" · "+t.due:""}</small></div>`).join("")||"<p>На сегодня ничего не назначено.</p>"
}
function renderInbox(){
 $("#inboxList").innerHTML=(state.data.inbox||[]).slice().reverse().map(x=>`<div class="list-card"><b>${esc(x.text)}</b><small>${new Date(x.date).toLocaleString("ru-RU")}</small></div>`).join("")||"<p>Входящие пусты.</p>"
}
function doSearch(q){
 q=q.trim().toLowerCase();if(!q){$("#searchResults").innerHTML="";return}
 const found=state.data.nodes.filter(n=>JSON.stringify(n).toLowerCase().includes(q));
 $("#searchResults").innerHTML=found.map(n=>`<button class="list-card" data-search-node="${n.id}"><b>${esc(n.title)}</b><small>${TYPES[n.type]?.label||n.type} · ${esc(n.speciality||n.client||n.source||"")}</small></button>`).join("")||"<p>Ничего не найдено.</p>"
}
function toast(text){const t=document.createElement("div");t.className="toast";t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}
function openAccountMenu(){
 closeSheets();
 $("#accountMenu")?.classList.remove("hidden");
}
function closeAccountMenu(){ $("#accountMenu")?.classList.add("hidden") }
function logoutAccount(){
 closeAccountMenu();
 localStorage.removeItem(AUTH_KEY);
 document.querySelector("#app")?.classList.remove("app-ready");
 document.querySelector("#app")?.classList.add("app-hidden");
 document.querySelector("#authScreen")?.classList.remove("hidden");
 toast("Вы вышли из аккаунта");
}
async function fullResetApp(){
 const approved=window.confirm("Полный сброс удалит все проекты, карточки, локальный аккаунт, настройки и кэш BOONWAVE на этом устройстве. Продолжить?");
 if(!approved)return;
 try{
   localStorage.clear();
   sessionStorage.clear();
   if('caches' in window){const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)))}
   if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(reg=>reg.unregister()))}
   if('indexedDB' in window && indexedDB.databases){const dbs=await indexedDB.databases();dbs.forEach(db=>{if(db.name)indexedDB.deleteDatabase(db.name)})}
 }catch(err){console.error('BOONWAVE reset error',err)}
 location.replace(location.pathname+'?v=5.4.0&reset='+Date.now());
}
function closeSheets(){$$(".sheet").forEach(x=>x.classList.add("hidden"));$("#createMenu").classList.add("hidden");$("#contextMenu").classList.add("hidden")}

document.addEventListener("click",e=>{
 const a=e.target.closest("[data-action]"),create=e.target.closest("[data-create]");
 if(create){createNode(create.dataset.create);return}
 if(a){
  const act=a.dataset.action;
  if(act==="openCreate"){closeSheets();closeAccountMenu();$("#createMenu").classList.toggle("hidden")}
  if(act==="menu"){const menu=$("#accountMenu");menu?.classList.toggle("hidden")}
  if(act==="closeAccountMenu")closeAccountMenu();
  if(act==="logout")logoutAccount();
  if(act==="fullReset")fullResetApp();
  if(act==="today"){closeSheets();$("#todayPanel").classList.remove("hidden")}
  if(act==="search"){closeSheets();$("#searchPanel").classList.remove("hidden");$("#searchInput").focus()}
  if(act==="inbox"){closeSheets();$("#inboxPanel").classList.remove("hidden")}
  if(act==="closeSheet")closeSheets();
  if(act==="fit"){state.scale=.72;state.tx=-180;state.ty=-120;applyTransform()}
  if(act==="saveInbox"){const v=$("#inboxText").value.trim();if(v){state.data.inbox.push({id:uid(),text:v,date:Date.now()});$("#inboxText").value="";save();renderInbox();toast("Сохранено")}}
  if(act==="saveNode")saveEditor();
  if(act==="deleteNode")deleteNode();
  if(act==="closeDetail")$("#detail").close();
 }
 const hint=e.target.closest('[data-hint]'); if(hint){openHint(nodeById(hint.dataset.hint)); return;}
 const openNode=e.target.closest("[data-open-node]"); if(openNode){openDetail(nodeById(openNode.dataset.openNode)); return;}
 const editNode=e.target.closest("[data-edit-node]"); if(editNode){openEditor(nodeById(editNode.dataset.editNode)); return;}
 const q=e.target.closest("[data-quick-expense]");if(q){
  const box=q.closest(".quick-expense"),n=nodeById(q.dataset.quickExpense);
  addExpense(n,box.querySelector(".expense-name").value,box.querySelector(".expense-value").value);
  box.querySelectorAll("input").forEach(i=>i.value="")
 }
 const de=e.target.closest("[data-detail-expense]");if(de){const n=nodeById(de.dataset.detailExpense);addExpense(n,$("#detailExpenseName").value,$("#detailExpenseAmount").value);openDetail(n)}
 const at=e.target.closest("[data-add-task]");if(at){const n=nodeById(at.dataset.addTask);$("#detail").close();addTask(n);openDetail(n)}
 const pi=e.target.closest("[data-add-image]"); if(pi){pickImages(nodeById(pi.dataset.addImage)); return;}
 const pf=e.target.closest("[data-files]");if(pf)pickFiles(nodeById(pf.dataset.files));
 const sn=e.target.closest("[data-search-node]");if(sn){const n=nodeById(sn.dataset.searchNode);closeSheets();state.space=n.space;focusNode(n)}
 if(!e.target.closest(".context-menu,.node"))$("#contextMenu").classList.add("hidden");
 if(!e.target.closest("#accountMenu,[data-action=\"menu\"]")) closeAccountMenu();
});
$("#editorForm").addEventListener("submit",e=>{if(e.submitter?.dataset.action==="saveNode")saveEditor()});
$("#searchInput").addEventListener("input",e=>doSearch(e.target.value));
$$("[data-space]").forEach(b=>b.onclick=()=>{$$("[data-space]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.space=b.dataset.space;render()});

const wrap=$("#workspaceWrap");
wrap.addEventListener("pointerdown",e=>{
 if(e.target.closest(".node,.bottom-nav,.topbar,.sheet,dialog"))return;
 closeSheets();wrap.setPointerCapture(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(state.pointers.size===1)state.gesture={mode:"pan",sx:e.clientX,sy:e.clientY,tx:state.tx,ty:state.ty};
 if(state.pointers.size===2){const p=[...state.pointers.values()];const mx=(p[0].x+p[1].x)/2,my=(p[0].y+p[1].y)/2;state.gesture={mode:"pinch",dist:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),scale:state.scale,tx:state.tx,ty:state.ty,mx,my,worldX:(mx-state.tx)/state.scale,worldY:(my-state.ty)/state.scale}}
});
wrap.addEventListener("pointermove",e=>{
 if(!state.pointers.has(e.pointerId))return;state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(state.pointers.size===1&&state.gesture?.mode==="pan"){state.tx=state.gesture.tx+e.clientX-state.gesture.sx;state.ty=state.gesture.ty+e.clientY-state.gesture.sy;applyTransform()}
 if(state.pointers.size===2&&state.gesture?.mode==="pinch"){const p=[...state.pointers.values()],d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),midX=(p[0].x+p[1].x)/2,midY=(p[0].y+p[1].y)/2;const newScale=Math.max(.32,Math.min(1.55,state.gesture.scale*d/state.gesture.dist));state.scale=newScale;state.tx=midX-state.gesture.worldX*newScale;state.ty=midY-state.gesture.worldY*newScale;applyTransform();render()}
});
wrap.addEventListener("pointerup",e=>{state.pointers.delete(e.pointerId); if(state.pointers.size<2 && state.gesture?.mode==="pinch") state.gesture=null;});
wrap.addEventListener("pointercancel",e=>{state.pointers.delete(e.pointerId); if(state.pointers.size<2 && state.gesture?.mode==="pinch") state.gesture=null;});
wrap.addEventListener("dblclick",e=>{if(e.target===wrap||e.target===$("#workspace")){state.scale=.72;state.tx=-180;state.ty=-120;render()}});
wrap.addEventListener("click",e=>{
 if(state.linkMode&&e.target.closest(".node")){const b=e.target.closest(".node").dataset.id;if(b!==state.linkMode){state.data.links.push({id:uid(),a:state.linkMode,b});save();toast("Связь создана")}state.linkMode=null;render()}
});
$("#detailBody").addEventListener("change",e=>{
 const cb=e.target.closest("[data-task]");if(!cb)return;const n=nodeById(state.selected)||state.data.nodes.find(n=>(n.tasks||[]).some(t=>t.id===cb.dataset.task));const t=n?.tasks.find(t=>t.id===cb.dataset.task);if(t){t.done=cb.checked;save();render()}
});
window.addEventListener("beforeunload",save);document.addEventListener("visibilitychange",()=>{if(document.hidden)save()});
setInterval(save,30000);
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("sw.js?v=5.2.0",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{});
 });
 let refreshing=false;
 navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!refreshing){refreshing=true;location.reload()}})
}
render();
