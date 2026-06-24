
const AUTH_KEY="boonwave_auth_v1";
function showWorkspace(){
  document.querySelector("#authScreen")?.classList.add("hidden");
  const app=document.querySelector("#app");
  app?.classList.remove("app-hidden");
  requestAnimationFrame(()=>app?.classList.add("app-ready"));
}
function showAuth(){document.querySelector("#authScreen")?.classList.remove("hidden")}
function initializeOnboarding(){
  const splash=document.querySelector("#splashScreen");
  const hasSession=!!localStorage.getItem(AUTH_KEY);
  setTimeout(()=>{
    splash?.classList.add("leaving");
    setTimeout(()=>{splash?.classList.add("hidden");hasSession?showWorkspace():showAuth()},430);
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
 pointers:new Map(),gesture:null
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
function typeLevel(n){
 if(n.manualLevel)return n.manualLevel;
 if(state.scale<.58)return 1;
 if(state.scale>1.12)return 3;
 return 2
}
function applyTransform(){
 const t=`translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
 $("#workspace").style.transform=t;$("#links").style.transform=t;renderLinks()
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
  el.innerHTML=`<div class="cover" ${cover}></div><span class="status"></span><div class="content">
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
  </div>`;
  attachNodeEvents(el,n);ws.appendChild(el)
 });
 $("#emptyState").classList.toggle("hidden",nodes().length>0);
 applyTransform();renderToday();renderInbox()
}
function attachNodeEvents(el,n){
 let timer=null,start=null,moved=false;
 el.addEventListener("pointerdown",e=>{
  if(e.target.closest("input,button"))return;
  e.stopPropagation();el.setPointerCapture(e.pointerId);
  start={x:e.clientX,y:e.clientY,nx:n.x,ny:n.y};moved=false;
  timer=setTimeout(()=>{timer=null;navigator.vibrate?.(15);openContext(n,e.clientX,e.clientY)},480)
 });
 el.addEventListener("pointermove",e=>{
  if(!start||n.locked)return;
  const dx=(e.clientX-start.x)/state.scale,dy=(e.clientY-start.y)/state.scale;
  if(Math.hypot(dx,dy)>5){moved=true;if(timer)clearTimeout(timer);n.x=start.nx+dx;n.y=start.ny+dy;el.style.left=n.x+"px";el.style.top=n.y+"px";renderLinks()}
 });
 el.addEventListener("pointerup",e=>{
  if(timer)clearTimeout(timer);
  if(start&&moved){save()}else if(timer!==null){selectNode(n.id)}
  start=null
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
function createNode(type){
 const center={x:(innerWidth/2-state.tx)/state.scale-105,y:(innerHeight/2-state.ty)/state.scale-70};
 const n={id:uid(),type,space:state.space,title:TYPES[type].label,x:center.x+Math.random()*60,y:center.y+Math.random()*60,
  status:"active",priority:"medium",note:"",tasks:[],expenses:[],contacts:[],files:[],counts:{images:0,pdf:0,files:0},progress:0};
 state.data.nodes.push(n);save();$("#createMenu").classList.add("hidden");openEditor(n);render()
}
function fieldsFor(n){
 const common=`<div class="field"><label>Название</label><input name="title" value="${esc(n.title)}"></div>
 <div class="field"><label>Заметка</label><textarea name="note">${esc(n.note||"")}</textarea></div>`;
 if(n.type==="project")return common+`
 <div class="field-grid"><div class="field"><label>Клиент</label><input name="client" value="${esc(n.client||"")}"></div>
 <div class="field"><label>Адрес объекта</label><input name="address" value="${esc(n.address||"")}"></div></div>
 <div class="field-grid"><div class="field"><label>Статус</label><select name="status"><option>Подготовка</option><option>В работе</option><option>На паузе</option><option>Завершён</option></select></div>
 <div class="field"><label>Приоритет</label><select name="priority"><option>Высокий</option><option>Средний</option><option>Низкий</option></select></div></div>
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
function addTask(n){
 const title=prompt("Новая задача");if(!title)return;
 n.tasks.push({id:uid(),title,done:false,due:""});save();render();toast("Задача добавлена")
}
function pickFiles(n){state.fileTarget=n.id;$("#filePicker").click()}
$("#filePicker").addEventListener("change",e=>{
 const n=nodeById(state.fileTarget);if(!n)return;
 [...e.target.files].forEach(f=>{
  n.files.push({id:uid(),name:f.name,type:f.type,size:f.size});
  if(f.type.startsWith("image/"))n.counts.images++;else if(f.type==="application/pdf")n.counts.pdf++;else n.counts.files++
 });save();render();toast("Файлы добавлены");e.target.value=""
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
 <section class="detail-section"><h3>Материалы</h3><div class="file-row">${(n.files||[]).map(f=>`<div class="file-tile">${esc(f.name)}</div>`).join("")||"<p>Файлы не добавлены</p>"}</div><button class="ghost" data-files="${n.id}">＋ Файл</button></section>`;
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
function closeSheets(){$$(".sheet").forEach(x=>x.classList.add("hidden"));$("#createMenu").classList.add("hidden");$("#contextMenu").classList.add("hidden")}

document.addEventListener("click",e=>{
 const a=e.target.closest("[data-action]"),create=e.target.closest("[data-create]");
 if(create){createNode(create.dataset.create);return}
 if(a){
  const act=a.dataset.action;
  if(act==="openCreate"){closeSheets();$("#createMenu").classList.toggle("hidden")}
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
 const q=e.target.closest("[data-quick-expense]");if(q){
  const box=q.closest(".quick-expense"),n=nodeById(q.dataset.quickExpense);
  addExpense(n,box.querySelector(".expense-name").value,box.querySelector(".expense-value").value);
  box.querySelectorAll("input").forEach(i=>i.value="")
 }
 const de=e.target.closest("[data-detail-expense]");if(de){const n=nodeById(de.dataset.detailExpense);addExpense(n,$("#detailExpenseName").value,$("#detailExpenseAmount").value);openDetail(n)}
 const at=e.target.closest("[data-add-task]");if(at){const n=nodeById(at.dataset.addTask);$("#detail").close();addTask(n);openDetail(n)}
 const pf=e.target.closest("[data-files]");if(pf)pickFiles(nodeById(pf.dataset.files));
 const sn=e.target.closest("[data-search-node]");if(sn){const n=nodeById(sn.dataset.searchNode);closeSheets();state.space=n.space;focusNode(n)}
 if(!e.target.closest(".context-menu,.node"))$("#contextMenu").classList.add("hidden")
});
$("#editorForm").addEventListener("submit",e=>{if(e.submitter?.dataset.action==="saveNode")saveEditor()});
$("#searchInput").addEventListener("input",e=>doSearch(e.target.value));
$$("[data-space]").forEach(b=>b.onclick=()=>{$$("[data-space]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.space=b.dataset.space;render()});

const wrap=$("#workspaceWrap");
wrap.addEventListener("pointerdown",e=>{
 if(e.target.closest(".node,.bottom-nav,.topbar,.sheet,dialog"))return;
 closeSheets();wrap.setPointerCapture(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(state.pointers.size===1)state.gesture={mode:"pan",sx:e.clientX,sy:e.clientY,tx:state.tx,ty:state.ty};
 if(state.pointers.size===2){const p=[...state.pointers.values()];state.gesture={mode:"pinch",dist:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),scale:state.scale,tx:state.tx,ty:state.ty}}
});
wrap.addEventListener("pointermove",e=>{
 if(!state.pointers.has(e.pointerId))return;state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(state.pointers.size===1&&state.gesture?.mode==="pan"){state.tx=state.gesture.tx+e.clientX-state.gesture.sx;state.ty=state.gesture.ty+e.clientY-state.gesture.sy;applyTransform()}
 if(state.pointers.size===2&&state.gesture?.mode==="pinch"){const p=[...state.pointers.values()],d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);state.scale=Math.max(.32,Math.min(1.55,state.gesture.scale*d/state.gesture.dist));applyTransform();render()}
});
wrap.addEventListener("pointerup",e=>state.pointers.delete(e.pointerId));
wrap.addEventListener("pointercancel",e=>state.pointers.delete(e.pointerId));
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
 navigator.serviceWorker.register("sw.js");
 let refreshing=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!refreshing){refreshing=true;location.reload()}})
}
render();
