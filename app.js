(() => {
  'use strict';

  const ACCOUNTS_KEY = 'boonwave-accounts-v1';
  const SESSION_KEY = 'boonwave-session-v1';
  const DATA_PREFIX = 'boonwave-data-v3:';
  const MIGRATION_OWNER_KEY = 'boonwave-migration-owner-v1';
  const LEGACY_KEYS = ['for-me-voblago-v2', 'vector-tree-v1'];
  const AUTOSAVE_MS = 30000;
  const TYPE_LABELS = {goal:'Цель', project:'Проект', stage:'Этап', task:'Задача', idea:'Идея', person:'Человек', resource:'Ресурс'};
  const PRIORITY_LABELS = {
    urgent:'Срочно', important:'Важно', soon:'В ближайшее время', this_week:'На этой неделе',
    next_week:'На следующей неделе', month_end:'До конца месяца', medium:'Средняя важность', low:'Низкий приоритет'
  };
  const PROJECT_STATUS_LABELS = {preparation:'Стадия подготовки',active:'В работе',paused:'На паузе',cancelled:'Отменён'};
  const PROJECT_PRIORITY_LABELS = {high:'Высокий',medium:'Средний',low:'Низкий'};
  const PROJECT_ICON_PATHS = {
    project:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 5V3h8v2M7 10h10M7 14h6"/>',
    finance:'<path d="M12 2v20M17 6.5c0-1.4-1.9-2.5-5-2.5S7 5.2 7 7s1.6 2.6 5 3 5 1.2 5 3-2 3-5 3-5-1.1-5-2.5"/>',
    client:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21c.7-5 3.2-7.5 7.5-7.5s6.8 2.5 7.5 7.5"/>',
    note:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
    attachments:'<path d="M8 12.5 14.8 5.7a3.2 3.2 0 0 1 4.5 4.5L10 19.5a5 5 0 1 1-7-7L12 3.5"/>',
    people:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.5-4.2 2.4-6.3 5.5-6.3s5 2.1 5.5 6.3M14 14.5c3.4-.4 5.5 1.4 6.3 5.5"/>',
    image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m15 9 5-5M17 4h3v3"/>',
    stage:'<path d="M5 4h14M5 12h14M5 20h14M8 4v16M16 4v16"/>',
    idea:'<path d="M9 18h6M10 22h4M8.5 15.5C6.7 14.2 6 12.7 6 10.5a6 6 0 1 1 12 0c0 2.2-.7 3.7-2.5 5"/>',
    eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    trash:'<path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    phone:'<path d="M7 3 4 6c-1 1 0 4 4 8s7 5 8 4l3-3-4-3-2 2c-2-1-4-3-5-5l2-2-3-4Z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    pdf:'<path d="M6 3h9l3 3v15H6zM15 3v4h4"/><path d="M8 16h2a2 2 0 0 0 0-4H8v5M13 17v-5h2.5M13 14h2"/>',
    file:'<path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6"/>'
  };
  function projectIcon(name, cls='line-icon') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${PROJECT_ICON_PATHS[name]||PROJECT_ICON_PATHS.file}</svg>`; }
  function hydrateProjectIcons(root=document){root.querySelectorAll('[data-project-icon]').forEach(el=>{el.innerHTML=projectIcon(el.dataset.projectIcon);});}
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const $ = id => document.getElementById(id);

  function defaultProjectData(p={}) {
    return {
      priority:['high','medium','low'].includes(p.priority)?p.priority:'medium',
      status:['preparation','active','paused','cancelled'].includes(p.status)?p.status:'preparation',
      address:p.address||'', positions:p.positions===''?'':(Number.isFinite(Number(p.positions))?String(p.positions):''), signingDate:p.signingDate||'',
      budget:p.budget===''?'':(p.budget??''), expectedProfit:p.expectedProfit===''?'':(p.expectedProfit??''),
      advanceAmount:p.advanceAmount===''?'':(p.advanceAmount??''), advanceDate:p.advanceDate||'',
      balanceAmount:p.balanceAmount===''?'':(p.balanceAmount??''), balanceDate:p.balanceDate||'',
      clientName:p.clientName||'', clientPhone:p.clientPhone||'', clientEmail:p.clientEmail||'', preliminaryInfo:p.preliminaryInfo||'',
      cardImage:p.cardImage?normalizeAttachment(p.cardImage):null
    };
  }
  function baseNode(id, section, parentId, title, type, status, priority, due, notes, x, y, projectId=null) {
    return {
      id, section, projectId, parentId, title, type, status, priority, due, notes,
      collapsed:false, minimized:false, locked:false, archived:false, archiveReason:'', archivedAt:'',
      contacts:[], images:[], pdfs:[], files:[], projectData:defaultProjectData(), x, y
    };
  }

  function blankState() {
    return {
      version:6,
      activeSection:'projects',
      projects:[],
      activeProjectId:null,
      nodes:[]
    };
  }


  let state = null;
  let currentUser = null;
  let authMode = 'login';
  let autosaveTimer = null;
  let lastSavedAt = null;
  let selectedId = null;
  let selectedContactId = null;
  let contactViewMode = false;
  let transform = {x:40, y:50, scale:.78};
  let viewportDrag = null;
  let pointerSession = null;
  let linkSourceId = null;
  let clickGuard = false;
  let controlNodeId = null;
  let viewerAttachment = null;
  let currentObjectUrl = null;
  let attachmentDbPromise = null;
  let projectSetupMode = 'onboarding';
  let currentProjectAssetKind = 'images';
  let attachmentAction = null;
  let attachmentClickGuard = false;

  const sheetIds = ['editor','noteSheet','contactsSheet','imagesSheet','pdfSheet','filesSheet','attachmentsSheet','archiveActionSheet','rootTypeSheet','attachmentActionSheet','menuSheet','projectsSheet','projectSetupSheet'];
  const els = {
    viewport:$('viewport'), world:$('world'), nodes:$('nodes'), links:$('links'), empty:$('emptyState'),
    editor:$('editor'), note:$('noteSheet'), contacts:$('contactsSheet'), images:$('imagesSheet'), pdf:$('pdfSheet'), files:$('filesSheet'),
    attachments:$('attachmentsSheet'), archiveAction:$('archiveActionSheet'), rootType:$('rootTypeSheet'), attachmentActionSheet:$('attachmentActionSheet'), menu:$('menuSheet'), projectsSheet:$('projectsSheet'), projectSetup:$('projectSetupSheet'), scrim:$('scrim'), toast:$('toast'),
    linkBar:$('linkModeBar'), controlPanel:$('nodeControlPanel'), mediaViewer:$('mediaViewer'), pdfViewer:$('pdfViewer')
  };

  function normalizeEmail(value='') { return value.trim().toLowerCase(); }
  function userDataKey(email) { return `${DATA_PREFIX}${encodeURIComponent(normalizeEmail(email))}`; }
  function getAccounts() { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch { return []; } }
  function setAccounts(accounts) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
  function makeSalt() {
    const bytes = new Uint8Array(16); globalThis.crypto?.getRandomValues?.(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('') || `${Date.now()}-${Math.random()}`;
  }
  async function hashPassword(password, salt) {
    const input = `${salt}:${password}`;
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
    }
    let h=2166136261; for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0).toString(16);
  }
  function accountInitial(email) { return (normalizeEmail(email).split('@')[0][0] || 'B').toUpperCase(); }

  function setAuthMessage(message='', type='') {
    const el=$('authMessage'); if(!el) return; el.textContent=message; el.className=`auth-message ${type}`.trim();
  }
  function setAuthMode(mode) {
    authMode=mode;
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.authMode===mode));
    $('confirmPasswordBlock').classList.toggle('hidden', mode!=='register');
    $('authSubmitBtn').textContent = mode==='register' ? 'Создать аккаунт' : 'Войти';
    $('authPassword').autocomplete = mode==='register' ? 'new-password' : 'current-password';
    setAuthMessage('');
  }
  function updateUserUI() {
    const initial=accountInitial(currentUser||'B');
    $('userInitial').textContent=initial; $('menuUserInitial').textContent=initial; $('currentUserEmail').textContent=currentUser||'—';
  }
  function stopAutosave(){ if(autosaveTimer){clearInterval(autosaveTimer);autosaveTimer=null;} }
  function startAutosave(){ stopAutosave(); autosaveTimer=setInterval(() => save({auto:true}), AUTOSAVE_MS); }
  function startApp(email) {
    currentUser=normalizeEmail(email); state=loadForUser(currentUser); localStorage.setItem(SESSION_KEY,currentUser);
    $('authScreen').classList.add('hidden'); $('app').classList.remove('hidden'); updateUserUI(); lastSavedAt=new Date(); updateSaveStatus('Готово');
    save(); renderAll(); startAutosave(); setTimeout(()=>{ if(!state.projects.length) openProjectSetup('onboarding'); else fitTree(); },120);
  }
  function logout() {
    save({auto:true}); stopAutosave(); localStorage.removeItem(SESSION_KEY); currentUser=null; state=null; selectedId=null; closeAllOverlays(false);
    $('app').classList.add('hidden'); $('authScreen').classList.remove('hidden'); $('authForm').reset(); setAuthMode('login'); setAuthMessage('Вы вышли из аккаунта.','success');
  }
  async function handleAuthSubmit(event) {
    event.preventDefault(); setAuthMessage('Проверка…');
    const email=normalizeEmail($('authEmail').value), password=$('authPassword').value, confirmPassword=$('authPasswordConfirm').value;
    if(!/^\S+@\S+\.\S+$/.test(email)){setAuthMessage('Введите корректный адрес электронной почты.','error');return;}
    if(password.length<6){setAuthMessage('Пароль должен содержать не менее 6 символов.','error');return;}
    const accounts=getAccounts(), existing=accounts.find(a=>a.email===email);
    if(authMode==='register'){
      if(password!==confirmPassword){setAuthMessage('Пароли не совпадают.','error');return;}
      if(existing){setAuthMessage('Аккаунт с такой почтой уже существует.','error');return;}
      const salt=makeSalt(), hash=await hashPassword(password,salt); accounts.push({email,salt,hash,createdAt:new Date().toISOString()}); setAccounts(accounts); startApp(email); return;
    }
    if(!existing){setAuthMessage('Аккаунт не найден. Перейдите в регистрацию.','error');return;}
    if(await hashPassword(password,existing.salt)!==existing.hash){setAuthMessage('Неверный пароль.','error');return;}
    startApp(email);
  }
  function initAuth() {
    setAuthMode('login');
    const session=normalizeEmail(localStorage.getItem(SESSION_KEY)||'');
    if(session && getAccounts().some(a=>a.email===session)) startApp(session);
    else {$('authScreen').classList.remove('hidden');$('app').classList.add('hidden');}
  }

  function loadForUser(email) {
    try {
      const ownRaw=localStorage.getItem(userDataKey(email));
      return ownRaw ? normalizeState(JSON.parse(ownRaw)) : normalizeState(blankState());
    } catch { return normalizeState(blankState()); }
  }
  function normalizeContact(c={}) {
    return {id:c.id||uid(), role:c.role||c.label||'', name:c.name||'', phone:c.phone||'', email:c.email||'', instagram:c.instagram||'', address:c.address||'', comment:c.comment||''};
  }
  function normalizeAttachment(a={}) {
    return {id:a.id||uid(), name:a.name||'Файл', type:a.type||'', size:Number(a.size)||0, createdAt:a.createdAt||new Date().toISOString()};
  }
  function normalizeProject(p={}) {
    return {id:p.id||uid(), name:(p.name||'Новый проект').trim()||'Новый проект', description:p.description||'', createdAt:p.createdAt||new Date().toISOString()};
  }
  function normalizeState(data) {
    if(!data || !Array.isArray(data.nodes)) data=blankState();
    data.version=6; data.activeSection=data.activeSection||'projects';
    const rawProjectNodes=data.nodes.filter(n=>n.section==='projects');
    if(!Array.isArray(data.projects)) data.projects=[];
    data.projects=data.projects.map(normalizeProject);
    if(!data.projects.length && rawProjectNodes.length){
      const migrated={id:uid(),name:'Мои проекты',description:'Проект перенесён из предыдущей версии.',createdAt:new Date().toISOString()};
      data.projects=[migrated]; data.activeProjectId=migrated.id;
    }
    if(data.activeProjectId && !data.projects.some(p=>p.id===data.activeProjectId)) data.activeProjectId=null;
    if(!data.activeProjectId && data.projects.length) data.activeProjectId=data.projects[0].id;
    let personalI=0, projectI=0;
    data.nodes=data.nodes.map(n=>{
      const i=n.section==='personal'?personalI++:projectI++;
      const oldContact=n.contact && Object.values(n.contact).some(Boolean) ? [normalizeContact({...n.contact,role:n.contact.role||'Контакт',name:n.contact.name||''})] : [];
      return {
        id:n.id||uid(), section:n.section||'projects', projectId:(n.section||'projects')==='projects'?(n.projectId||data.activeProjectId||data.projects[0]?.id||null):null,
        parentId:n.parentId||null, title:n.title||'Без названия', type:n.type||'task',
        status:n.status||'todo', priority:n.priority||'medium', due:n.due||'', notes:n.notes||'', collapsed:!!n.collapsed,
        minimized:!!n.minimized, locked:!!n.locked, archived:!!n.archived, archiveReason:n.archiveReason||'', archivedAt:n.archivedAt||'',
        contacts:Array.isArray(n.contacts)?n.contacts.map(normalizeContact):oldContact,
        images:Array.isArray(n.images)?n.images.map(normalizeAttachment):[], pdfs:Array.isArray(n.pdfs)?n.pdfs.map(normalizeAttachment):[], files:Array.isArray(n.files)?n.files.map(normalizeAttachment):[],
        projectData:defaultProjectData(n.projectData||{}),
        x:Number.isFinite(n.x)?n.x:140+(n.parentId?340:0)+(i%3)*280, y:Number.isFinite(n.y)?n.y:120+i*150
      };
    });
    return data;
  }

  function getNode(id){return state?.nodes.find(n=>n.id===id);}
  function sectionNodes(includeArchived=false){return state.nodes.filter(n=>n.section===state.activeSection && (state.activeSection!=='projects'||n.projectId===state.activeProjectId) && (includeArchived || !n.archived));}
  function childrenOf(id, includeArchived=false){return state.nodes.filter(n=>n.parentId===id && (includeArchived || !n.archived));}
  function descendants(id, includeArchived=false){
    const out=[], seen=new Set();
    const walk=pid=>childrenOf(pid,includeArchived).forEach(c=>{if(seen.has(c.id))return;seen.add(c.id);out.push(c);walk(c.id);});
    walk(id); return out;
  }
  function progressFor(n){
    const leaves=descendants(n.id).filter(x=>x.type==='task'||childrenOf(x.id).length===0);
    if(!leaves.length) return n.status==='done'?100:n.status==='doing'?35:0;
    const points=leaves.reduce((s,x)=>s+(x.status==='done'?1:x.status==='doing'?.45:0),0); return Math.round(points/leaves.length*100);
  }
  function isVisible(n){
    let cur=n; const seen=new Set();
    while(cur?.parentId){
      if(seen.has(cur.parentId)) return false; seen.add(cur.parentId); const p=getNode(cur.parentId);
      if(!p || p.archived || p.section!==n.section) return true; if(p.collapsed) return false; cur=p;
    }
    return true;
  }
  function visibleNodes(){return sectionNodes().filter(isVisible);}
  function formatDate(iso){return iso?new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'}):'';}
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function shortText(s='',n=52){const t=String(s).replace(/\s+/g,' ').trim();return t.length>n?`${t.slice(0,n-1)}…`:t;}
  function formatBytes(bytes=0){if(!bytes)return '0 Б';const units=['Б','КБ','МБ','ГБ'];const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),3);return `${(bytes/1024**i).toFixed(i?1:0)} ${units[i]}`;}
  function formatMoney(value){const n=Number(value);return Number.isFinite(n)?`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)} ₽`:'—';}
  function attachmentCount(n){return (n.images?.length||0)+(n.pdfs?.length||0)+(n.files?.length||0);}

  function syncOpenDrafts(){
    if(!state||!selectedId)return; const n=getNode(selectedId); if(!n)return;
    if(!els.editor.classList.contains('hidden')){
      n.title=$('nodeTitleInput').value.trim()||n.title||'Без названия';
      if(n.type==='project') syncProjectForm(n);
      else { n.type=$('nodeTypeInput').value||n.type; n.status=$('nodeStatusInput').value||n.status; n.priority=$('nodePriorityInput').value||n.priority; n.due=$('nodeDueInput').value||''; }
    }
    if(!els.note.classList.contains('hidden')) n.notes=$('longNoteInput').value;
    if(!els.contacts.classList.contains('hidden')) syncContactForm({silent:true});
  }
  function updateSaveStatus(prefix='Сохранено'){
    const el=$('saveStatus'); if(!el)return; const time=lastSavedAt?lastSavedAt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'; el.textContent=`${prefix} · ${time}`;
  }
  function save(options={}){
    if(!state||!currentUser)return; if(!options.skipDrafts)syncOpenDrafts(); localStorage.setItem(userDataKey(currentUser),JSON.stringify(state)); lastSavedAt=new Date(); updateSaveStatus(options.auto?'Автосохранено':'Сохранено');
  }

  function openAttachmentDb(){
    if(attachmentDbPromise)return attachmentDbPromise;
    attachmentDbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open('boonwave-attachments-v1',1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('files')){const store=db.createObjectStore('files',{keyPath:'id'});store.createIndex('user','user',{unique:false});store.createIndex('nodeId','nodeId',{unique:false});}};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    return attachmentDbPromise;
  }
  async function idbPut(record){const db=await openAttachmentDb();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function idbGet(id){const db=await openAttachmentDb();return new Promise((resolve,reject)=>{const req=db.transaction('files').objectStore('files').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  async function idbDelete(id){const db=await openAttachmentDb();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function addAttachments(kind, fileList){
    const n=getNode(selectedId); if(!n||!fileList?.length)return;
    for(const file of [...fileList]){
      const id=uid(), meta={id,name:file.name,type:file.type,size:file.size,createdAt:new Date().toISOString()};
      await idbPut({id,user:currentUser,nodeId:n.id,kind,name:file.name,type:file.type,size:file.size,blob:file,createdAt:meta.createdAt});
      n[kind].push(meta);
    }
    save({skipDrafts:true}); renderAll(); refreshOpenAttachmentSheet(kind); showToast('Вложения добавлены');
  }
  async function removeAttachment(kind,id){
    const n=getNode(selectedId); if(!n)return; n[kind]=n[kind].filter(a=>a.id!==id); await idbDelete(id); save({skipDrafts:true}); renderAll(); refreshOpenAttachmentSheet(kind); closeViewers(); showToast('Файл удалён');
  }
  async function getStoredFile(meta){
    const record=await idbGet(meta.id); if(!record?.blob)throw new Error('Файл не найден на устройстве');
    return new File([record.blob],meta.name,{type:meta.type||record.type||'application/octet-stream'});
  }
  async function downloadAttachment(meta){
    try{const file=await getStoredFile(meta),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=meta.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}catch(e){alert(e.message);}
  }
  async function shareAttachment(meta){
    try{
      const file=await getStoredFile(meta);
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) await navigator.share({files:[file],title:meta.name});
      else await downloadAttachment(meta);
    }catch(e){if(e.name!=='AbortError')alert('Не удалось отправить файл.');}
  }

  function renderLinks(){
    els.links.innerHTML=''; const visible=new Set(visibleNodes().map(n=>n.id));
    sectionNodes().forEach(n=>{
      if(!n.parentId||!visible.has(n.id)||!visible.has(n.parentId))return; const p=getNode(n.parentId); if(!p)return;
      const pr=p.minimized?32:105, nr=n.minimized?32:105, sx=p.x+pr,sy=p.y,ex=n.x-nr,ey=n.y,mx=(sx+ex)/2;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`); path.setAttribute('class',`link-path ${n.status==='done'?'done':''}`); els.links.appendChild(path);
    });
  }
  function renderTree(){
    const visible=visibleNodes(); els.nodes.innerHTML=''; els.empty.classList.toggle('hidden',visible.length>0);
    if(!visible.length){const hasProject=state.activeSection!=='projects'||!!activeProject();$('emptyTitle').textContent=hasProject?'Рабочий стол пуст':'Создайте первый проект';$('emptyCopy').textContent=hasProject?'Создайте корневую цель или независимый блок.':'Каждый проект начинается с чистого листа.';$('emptyAddBtn').textContent=hasProject?'Создать корневую цель':'Создать проект';}
    visible.forEach(n=>{
      const el=document.createElement('article');
      el.className=`tree-node ${!n.parentId?'root':''} ${n.status==='done'?'done':''} ${n.minimized?'minimized':''} ${n.locked?'locked':''} ${selectedId===n.id?'selected':''} ${linkSourceId===n.id?'link-source':''} ${linkSourceId&&linkSourceId!==n.id?'link-target':''}`;
      el.style.left=`${n.x}px`;el.style.top=`${n.y}px`;el.dataset.id=n.id;
      if(n.minimized){
        if(n.type==='project'){
          const pd=defaultProjectData(n.projectData); el.classList.add('project-mini-node',`project-status-${pd.status}`);
          el.innerHTML=`<div class="project-mini-card"><div class="project-mini-image"><img data-project-card-image="${n.id}" alt=""><span>${projectIcon('project','project-mini-icon')}</span></div></div><div class="node-hint">${escapeHtml(n.title)}</div>`;
        }else el.innerHTML=`<div class="minimized-symbol">⌛</div><div class="node-hint">${escapeHtml(n.title)}</div>`;
      }else{
        const kids=childrenOf(n.id), prog=progressFor(n), contacts=n.contacts?.length||0;
        if(n.type==='project'){
          const pd=defaultProjectData(n.projectData), note=pd.preliminaryInfo?shortText(pd.preliminaryInfo):'Предварительная информация не добавлена';
          el.classList.add('project-tree-node',`project-status-${pd.status}`);
          el.innerHTML=`
            <div class="project-node-cover"><img data-project-card-image="${n.id}" alt=""><span>${projectIcon('project','project-cover-icon')}</span></div>
            <div class="node-top"><span class="node-type">${projectIcon('project','node-type-svg')} Проект</span><span class="node-top-badges">${n.locked?'<span title="Зафиксировано">⌖</span>':''}<button class="node-more" aria-label="Удерживайте блок">•••</button></span></div>
            <div class="node-title">${escapeHtml(n.title)}</div>
            <div class="node-note-preview">${escapeHtml(note)}</div>
            <div class="project-node-status"><span>${escapeHtml(PROJECT_STATUS_LABELS[pd.status])}</span><span>${escapeHtml(PROJECT_PRIORITY_LABELS[pd.priority])}</span></div>
            <div class="project-node-facts">${pd.positions?`<span>${escapeHtml(pd.positions)} позиций</span>`:''}${pd.budget!==''?`<span>${formatMoney(pd.budget)}</span>`:''}${pd.signingDate?`<span>${formatDate(pd.signingDate)}</span>`:''}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div>
            <div class="node-bottom"><span>${prog}%</span><span class="data-counts"><span>${projectIcon('people','tiny-svg')} ${contacts}</span><span>${projectIcon('image','tiny-svg')} ${n.images.length}</span><span>PDF ${n.pdfs.length}</span><span>${projectIcon('file','tiny-svg')} ${n.files.length}</span></span></div>
            ${kids.length?`<div class="node-hint">${kids.length} связанных блоков · удерживайте для панели</div>`:'<div class="node-hint">удерживайте для панели</div>'}`;
        }else{
          const note=n.notes?shortText(n.notes):'Заметка не добавлена';
          el.innerHTML=`
            <div class="node-top"><span class="node-type"><i class="node-dot ${n.status}"></i> ${TYPE_LABELS[n.type]||n.type}</span><span class="node-top-badges">${n.locked?'<span title="Зафиксировано">⌖</span>':''}<button class="node-more" aria-label="Удерживайте блок">•••</button></span></div>
            <div class="node-title">${escapeHtml(n.title)}</div>
            <div class="node-note-preview">${escapeHtml(note)}</div>
            <div class="node-meta">${n.due?`<span class="date-chip">▣ ${formatDate(n.due)}</span>`:''}<span class="priority-chip ${n.priority}">${escapeHtml(PRIORITY_LABELS[n.priority]||'Средняя важность')}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div>
            <div class="node-bottom"><span>${prog}%</span><span class="data-counts"><span>♙ ${contacts}</span><span>▧ ${n.images.length}</span><span>PDF ${n.pdfs.length}</span><span>⌕ ${n.files.length}</span></span></div>
            ${kids.length?`<div class="node-hint">${kids.length} подзадач · удерживайте для панели</div>`:'<div class="node-hint">удерживайте для панели</div>'}`;
        }
      }
      els.nodes.appendChild(el);
    });
    bindNodeEvents(); hydrateProjectCardImages(); renderLinks(); applyTransform(); updateLinkModeUI();
  }

  function bindNodeEvents(){
    document.querySelectorAll('.tree-node').forEach(el=>{
      const id=el.dataset.id;
      const begin=e=>{
        if(e.button!==undefined&&e.button!==0)return; if(e.target.closest('button'))e.preventDefault();
        closeNodeControls(); const n=getNode(id); if(!n)return;
        pointerSession={pointerId:e.pointerId,id,startX:e.clientX,startY:e.clientY,originX:n.x,originY:n.y,moved:false,longPressed:false,timer:null};
        pointerSession.timer=setTimeout(()=>{
          if(!pointerSession||pointerSession.id!==id||pointerSession.moved)return;
          pointerSession.longPressed=true; clickGuard=true; showNodeControls(id,el); navigator.vibrate?.(18);
        },520);
        el.setPointerCapture?.(e.pointerId);
      };
      el.addEventListener('pointerdown',begin);
      el.addEventListener('pointermove',e=>{
        if(!pointerSession||pointerSession.pointerId!==e.pointerId||pointerSession.id!==id)return;
        const dx=(e.clientX-pointerSession.startX)/transform.scale,dy=(e.clientY-pointerSession.startY)/transform.scale,dist=Math.hypot(dx,dy),n=getNode(id);
        if(dist>7){clearTimeout(pointerSession.timer);pointerSession.moved=true;}
        if(pointerSession.moved&&!pointerSession.longPressed&&!n.locked){n.x=pointerSession.originX+dx;n.y=pointerSession.originY+dy;el.style.left=`${n.x}px`;el.style.top=`${n.y}px`;renderLinks();}
      });
      const finish=()=>{
        if(!pointerSession||pointerSession.id!==id)return; clearTimeout(pointerSession.timer); const moved=pointerSession.moved&&!getNode(id)?.locked,longPressed=pointerSession.longPressed; pointerSession=null;
        if(moved){save();clickGuard=true;setTimeout(()=>clickGuard=false,100);} else if(longPressed){setTimeout(()=>clickGuard=false,300);}
      };
      el.addEventListener('pointerup',finish); el.addEventListener('pointercancel',finish);
      el.addEventListener('contextmenu',e=>e.preventDefault());
      el.addEventListener('click',()=>{
        if(clickGuard)return; if(linkSourceId){chooseLinkTarget(id);return;} openEditor(id);
      });
    });
  }

  function showNodeControls(id,nodeEl){
    controlNodeId=id; selectedId=id; const n=getNode(id); if(!n)return;
    $('panelPinIcon').textContent=n.locked?'⌖':'⌖'; $('panelPinLabel').textContent=n.locked?'Открепить':'Зафиксировать';
    const panel=els.controlPanel,vr=els.viewport.getBoundingClientRect(),nr=nodeEl.getBoundingClientRect(); panel.classList.remove('hidden','above'); panel.style.visibility='hidden';
    requestAnimationFrame(()=>{
      const pw=panel.offsetWidth,ph=panel.offsetHeight; let left=nr.left-vr.left+nr.width/2-pw/2; left=Math.max(10,Math.min(vr.width-pw-10,left));
      let top=nr.top-vr.top-ph-12,above=true; if(top<8){top=nr.bottom-vr.top+12;above=false;}
      panel.style.left=`${left}px`;panel.style.top=`${top}px`;panel.style.setProperty('--arrow-x',`${Math.max(18,Math.min(pw-18,nr.left-vr.left+nr.width/2-left))}px`);panel.classList.toggle('above',!above);panel.style.visibility='visible';
    });
  }
  function closeNodeControls(){els.controlPanel.classList.add('hidden');controlNodeId=null;}
  function handleNodeControl(action){
    const id=controlNodeId||selectedId,n=getNode(id); if(!n)return; selectedId=id; closeNodeControls();
    const actions={
      contacts:()=>openContacts(id), pin:()=>togglePin(id), files:()=>openFiles(id), images:()=>openImages(id), note:()=>openNote(id), pdf:()=>openPdf(id),
      minimize:()=>toggleMinimize(id), archive:()=>openArchiveAction(id), link:()=>startLinkMode(id), child:()=>addNode(id)
    };
    actions[action]?.();
  }
  function togglePin(id){const n=getNode(id);if(!n)return;n.locked=!n.locked;save({skipDrafts:true});renderAll();showToast(n.locked?'Задача зафиксирована':'Задачу можно перемещать');}
  function toggleMinimize(id){const n=getNode(id);if(!n)return;n.minimized=!n.minimized;save({skipDrafts:true});renderAll();if(!els.editor.classList.contains('hidden'))updateEditorActionLabels(n);showToast(n.minimized?'Блок свёрнут в точку':'Блок развёрнут');}

  function startLinkMode(id){linkSourceId=id;closeAllOverlays(false);renderTree();showToast('Выберите новый родительский блок');}
  function chooseLinkTarget(targetId){
    if(!linkSourceId)return;if(targetId===linkSourceId){showToast('Нельзя связать блок с самим собой');return;}
    const source=getNode(linkSourceId),target=getNode(targetId);if(!source||!target)return;
    if(source.section!==target.section || (source.section==='projects'&&source.projectId!==target.projectId)){showToast('Связь возможна только внутри одного рабочего стола');return;}
    if(descendants(source.id).some(n=>n.id===target.id)){showToast('Нельзя создать циклическую связь');return;}
    source.parentId=target.id;source.x=target.x+320;source.y=target.y+Math.max(120,childrenOf(target.id).length*55);linkSourceId=null;save({skipDrafts:true});renderAll();showToast('Связь переставлена');
  }
  function makeRoot(){if(!linkSourceId)return;const n=getNode(linkSourceId);if(n){n.parentId=null;n.x=Math.max(140,n.x);save({skipDrafts:true});}linkSourceId=null;renderAll();showToast('Блок стал корневым');}
  function cancelLink(){linkSourceId=null;renderTree();}
  function updateLinkModeUI(){els.linkBar.classList.toggle('hidden',!linkSourceId);if(linkSourceId){const n=getNode(linkSourceId);$('linkModeText').textContent=`Связь: «${n?.title||''}» → выберите новый родительский блок`;}}

  function renderToday(){
    const today=todayISO(),rank={urgent:0,important:1,soon:2,this_week:3,next_week:4,month_end:5,medium:6,low:7};
    const tasks=state.nodes.filter(n=>!n.archived&&n.type==='task'&&n.status!=='done'&&(n.due===today||(n.due&&n.due<today)||['urgent','important','soon','this_week'].includes(n.priority)||n.status==='doing')).sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||(a.due||'9999').localeCompare(b.due||'9999'));
    $('todayCount').textContent=tasks.length;
    $('todayList').innerHTML=tasks.length?tasks.map(n=>{const p=getNode(n.parentId),late=n.due&&n.due<today;return `<article class="task-card" data-id="${n.id}"><button class="check" data-check="${n.id}"></button><div><div class="task-title">${escapeHtml(n.title)}</div><div class="task-meta ${late?'late':''}">${p?escapeHtml(p.title)+' · ':''}${escapeHtml(PRIORITY_LABELS[n.priority])}${n.due?' · '+formatDate(n.due):''}</div></div><span>›</span></article>`;}).join(''):`<div class="empty-state"><div class="empty-orbit"></div><h2>Фокус свободен</h2><p>На сегодня нет срочных задач.</p></div>`;
    document.querySelectorAll('[data-check]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const n=getNode(b.dataset.check);n.status='done';save({skipDrafts:true});renderAll();showToast('Задача завершена');}));
    document.querySelectorAll('.task-card').forEach(c=>c.addEventListener('click',()=>openEditor(c.dataset.id)));
  }
  function renderResults(){
    const roots=sectionNodes().filter(n=>!n.parentId||!getNode(n.parentId)||getNode(n.parentId).archived),cards=[];roots.forEach(r=>(childrenOf(r.id).length?childrenOf(r.id):[r]).forEach(n=>cards.push(n)));
    $('resultsList').innerHTML=cards.length?cards.map(n=>{const p=progressFor(n),total=descendants(n.id).filter(x=>x.type==='task').length;return `<article class="result-card" data-id="${n.id}"><div class="result-top"><div><div class="result-title">${escapeHtml(n.title)}</div><div class="result-meta">${TYPE_LABELS[n.type]}${total?` · ${total} задач`:''} · ${n.contacts.length} контактов</div></div><div class="result-percent">${p}%</div></div><div class="result-bar"><span style="width:${p}%"></span></div></article>`;}).join(''):'<div class="empty-state"><h2>Нет результатов</h2></div>';
    document.querySelectorAll('.result-card').forEach(c=>c.addEventListener('click',()=>{setView('treeView');openEditor(c.dataset.id);}));
  }
  function renderArchive(){
    const archived=state.nodes.filter(n=>n.archived);$('archiveCount').textContent=archived.length;
    const groups=[['done','Выполненные'],['obsolete','Не актуальные']];
    $('archiveList').innerHTML=archived.length?groups.map(([reason,title])=>{
      const items=archived.filter(n=>n.archiveReason===reason);if(!items.length)return'';
      return `<div class="archive-group-title"><span>${reason==='done'?'✓':'−'}</span><b>${title}</b><small>${items.length}</small></div>${items.map(n=>`<article class="archive-card"><div><div class="node-type">${TYPE_LABELS[n.type]}</div><h3>${escapeHtml(n.title)}</h3><div class="archive-meta"><span class="archive-reason ${reason}">${reason==='done'?'Выполнена':'Не актуальна'}</span>${n.due?`<span>▣ ${formatDate(n.due)}</span>`:''}<span>♙ ${n.contacts.length}</span><span>▧ ${n.images.length}</span><span>PDF ${n.pdfs.length}</span><span>⌕ ${n.files.length}</span></div></div><button class="restore-btn" data-restore="${n.id}">Восстановить</button></article>`).join('')}`;
    }).join(''):'<div class="empty-mini">Архив пока пуст.</div>';
    document.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>restoreArchived(b.dataset.restore)));
  }
  function renderAll(){renderTree();renderToday();renderResults();renderArchive();updateSectionUI();renderProjectUI();}
  function updateSectionUI(){document.querySelectorAll('.section-pill').forEach(b=>b.classList.toggle('active',b.dataset.section===state.activeSection));}

  function updateEditorActionLabels(n){
    $('editorPinBtn').querySelector('small').textContent=n.locked?'Открепить':'Зафиксировать';
    $('editorMinimizeBtn').querySelector('small').textContent=n.minimized?'Развернуть':'Свернуть';
    $('editorLockState').textContent=n.locked?'Зафиксировано на столе':'Можно перемещать';
  }
  function updateEditorSummaries(n){
    const total=attachmentCount(n),contactText=n.contacts.length?`${n.contacts.length}: ${n.contacts.slice(0,2).map(c=>`${c.role}${c.name?' '+c.name:''}`).join(', ')}`:'Нет контактов';
    $('editorNotePreview').textContent=n.notes?shortText(n.notes,90):'Не добавлена';$('editorContactsPreview').textContent=contactText;
    $('editorAttachmentsPreview').textContent=total?`Изображения ${n.images.length} · PDF ${n.pdfs.length} · Файлы ${n.files.length}`:'Нет вложений';
    $('editorAttachmentSummary').textContent=total?`${total} вложений`:'Нет вложений';
  }
  function openEditor(id){
    closeNodeControls(); selectedId=id; const n=getNode(id);if(!n||n.archived)return;
    $('nodeTitleInput').value=n.title;$('nodeTypeInput').value=n.type;$('nodeStatusInput').value=n.status;$('nodePriorityInput').value=n.priority||'medium';$('nodeDueInput').value=n.due||'';$('editorTitle').textContent=n.type==='project'?`Проект · ${n.title}`:n.title;
    const isProject=n.type==='project'; $('projectEditorPanel').classList.toggle('hidden',!isProject); $('genericEditorFields').classList.toggle('hidden',isProject); $('genericPriorityField').classList.toggle('hidden',isProject); $('genericDueField').classList.toggle('hidden',isProject); document.querySelectorAll('.detail-row').forEach(el=>el.classList.toggle('hidden',isProject));
    renderSubtasks(n);updateEditorActionLabels(n);updateEditorSummaries(n); if(isProject) renderProjectEditor(n); showSheet(els.editor);renderTree();
  }
  function renderSubtasks(n){
    const kids=childrenOf(n.id);$('subtaskList').innerHTML=kids.length?kids.map(k=>`<div class="subtask-row"><button class="check" data-subcheck="${k.id}" aria-label="Готово"></button><button class="subtask-open" data-subopen="${k.id}"><div class="subtask-name">${escapeHtml(k.title)}</div><div class="subtask-state">${k.status==='done'?'Готово':escapeHtml(PRIORITY_LABELS[k.priority])}</div></button><span>›</span></div>`).join(''):'<div class="subtask-state">Подзадач пока нет.</div>';
    document.querySelectorAll('[data-subcheck]').forEach(b=>b.addEventListener('click',()=>{const k=getNode(b.dataset.subcheck);k.status=k.status==='done'?'todo':'done';save({skipDrafts:true});renderAll();renderSubtasks(n);}));
    document.querySelectorAll('[data-subopen]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.subopen)));
  }
  function addNode(parentId=null,rootType=null){
    if(state.activeSection==='projects'&&!state.activeProjectId){openProjectSetup('onboarding');return;}
    const p=parentId?getNode(parentId):null,siblings=p?childrenOf(p.id):sectionNodes().filter(n=>!n.parentId);
    const projectId=p?.projectId||(state.activeSection==='projects'?state.activeProjectId:null);
    const type=p?'task':(rootType||'goal'); const titles={project:'Новый проект',goal:'Новая цель',person:'Новый человек',stage:'Новый этап',idea:'Новая идея',task:'Новая подзадача'};
    const n=baseNode(uid(),state.activeSection,p?.id||null,titles[type]||'Новый блок',type,'todo','medium','','',p?p.x+320:160,p?p.y+(siblings.length+1)*115:140+siblings.length*180,projectId);
    if(type==='project') n.projectData=defaultProjectData();
    state.nodes.push(n);if(p)p.collapsed=false;save({skipDrafts:true});renderAll();openEditor(n.id);
  }
  function openRootTypeSheet(){if(state.activeSection==='projects'&&!state.activeProjectId){openProjectSetup('onboarding');return;}showSheet(els.rootType);}
  function activeProject(){return state.projects.find(p=>p.id===state.activeProjectId)||null;}
  function renderProjectUI(){
    const bar=$('projectWorkspaceBar'); if(!bar)return;
    const inProjects=state.activeSection==='projects'; bar.classList.toggle('hidden',!inProjects);
    const p=activeProject(); $('currentProjectName').textContent=p?.name||'Создать первый проект';
    $('currentProjectDescription').textContent=p?.description||'Каждый проект — отдельный рабочий стол';
    renderProjectsList();
  }
  function renderProjectsList(){
    const list=$('projectsList'); if(!list)return;
    list.innerHTML=state.projects.length?state.projects.map(p=>`<button class="project-list-item ${p.id===state.activeProjectId?'active':''}" data-project-id="${p.id}"><span class="project-mark">${escapeHtml((p.name[0]||'П').toUpperCase())}</span><span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.description||'Отдельный рабочий стол')}</small></span><i>${p.id===state.activeProjectId?'✓':'›'}</i></button>`).join(''):'<div class="project-empty-copy">Проектов пока нет. Создайте первый рабочий стол.</div>';
    list.querySelectorAll('[data-project-id]').forEach(b=>b.addEventListener('click',()=>selectProject(b.dataset.projectId)));
  }
  function selectProject(id){
    if(!state.projects.some(p=>p.id===id))return; state.activeProjectId=id;state.activeSection='projects';selectedId=null;cancelLink();save({skipDrafts:true});closeAllOverlays(false);renderAll();setTimeout(fitTree,60);
  }
  function openProjects(){renderProjectsList();showSheet(els.projectsSheet);}
  function openProjectSetup(mode='add'){
    projectSetupMode=mode; $('projectSetupEyebrow').textContent=mode==='onboarding'?'НОВОЕ НАЧАЛО':'НОВЫЙ РАБОЧИЙ СТОЛ';
    $('projectSetupTitle').textContent=mode==='onboarding'?'Создайте первый проект':'Создать проект';
    $('projectSetupLead').textContent=mode==='onboarding'?'В BOONWAVE нет демонстрационных данных. Назовите проект — его дерево начнётся с чистого листа.':'Каждый проект получает отдельный рабочий стол и собственное дерево.';
    $('projectNameInput').value='';$('projectDescriptionInput').value='';$('projectInitialGoalInput').value='';
    $('closeProjectSetupBtn').classList.toggle('hidden',mode==='onboarding'); $('cancelProjectSetupBtn').classList.toggle('hidden',mode==='onboarding');
    closeAllOverlays(false); showSheet(els.projectSetup); setTimeout(()=>$('projectNameInput').focus(),120);
  }
  function createProject(){
    const name=$('projectNameInput').value.trim(),description=$('projectDescriptionInput').value.trim(),goal=$('projectInitialGoalInput').value.trim();
    if(!name){showToast('Введите название проекта');$('projectNameInput').focus();return;}
    const p=normalizeProject({id:uid(),name,description,createdAt:new Date().toISOString()});state.projects.push(p);state.activeProjectId=p.id;state.activeSection='projects';
    if(goal){const n=baseNode(uid(),'projects',null,goal,'goal','todo','medium','','',180,220,p.id);state.nodes.push(n);}
    save({skipDrafts:true});closeAllOverlays(false);renderAll();setTimeout(()=>{if(goal)fitTree();else openEmptyProjectHint();},100);showToast('Проект создан');
  }
  function openEmptyProjectHint(){const p=activeProject();if(p&&!sectionNodes().length){$('emptyState').classList.remove('hidden');}}
  async function deleteActiveProject(){
    const p=activeProject();if(!p)return;if(!confirm(`Удалить проект «${p.name}» и все его данные?`))return;
    const nodes=state.nodes.filter(n=>n.projectId===p.id);for(const n of nodes){for(const a of [...n.images,...n.pdfs,...n.files,n.projectData?.cardImage].filter(Boolean))await idbDelete(a.id);}state.nodes=state.nodes.filter(n=>n.projectId!==p.id);state.projects=state.projects.filter(x=>x.id!==p.id);state.activeProjectId=state.projects[0]?.id||null;save({skipDrafts:true});closeAllOverlays(false);renderAll();if(!state.projects.length)openProjectSetup('onboarding');else setTimeout(fitTree,60);showToast('Проект удалён');
  }

  function saveEditor(){const n=getNode(selectedId);if(!n)return;n.title=$('nodeTitleInput').value.trim()||'Без названия';if(n.type==='project')syncProjectForm(n);else{n.type=$('nodeTypeInput').value;n.status=$('nodeStatusInput').value;n.priority=$('nodePriorityInput').value;n.due=$('nodeDueInput').value;}save({skipDrafts:true});renderAll();closeAllOverlays();showToast('Изменения сохранены');}
  async function deleteSelected(){const n=getNode(selectedId);if(!n)return;if(!confirm(`Удалить «${n.title}» и все дочерние ветви без возможности восстановления?`))return;const branch=[n,...descendants(n.id,true)],ids=new Set(branch.map(x=>x.id));for(const x of branch){for(const a of [...x.images,...x.pdfs,...x.files,x.projectData?.cardImage].filter(Boolean))await idbDelete(a.id);}state.nodes=state.nodes.filter(x=>!ids.has(x.id));save({skipDrafts:true});closeAllOverlays();renderAll();showToast('Ветвь удалена');}

  function projectFormData(){
    return {
      priority:$('projectPriorityInput').value||'medium', status:$('projectStatusInput').value||'preparation', address:$('projectAddressInput').value.trim(), positions:$('projectPositionsInput').value,
      signingDate:$('projectSigningDateInput').value, budget:$('projectBudgetInput').value, expectedProfit:$('projectProfitInput').value,
      advanceAmount:$('projectAdvanceInput').value, advanceDate:$('projectAdvanceDateInput').value, balanceAmount:$('projectBalanceInput').value, balanceDate:$('projectBalanceDateInput').value,
      clientName:$('projectClientNameInput').value.trim(), clientPhone:$('projectClientPhoneInput').value.trim(), clientEmail:$('projectClientEmailInput').value.trim(), preliminaryInfo:$('projectIntroInput').value.trim()
    };
  }
  function syncProjectForm(n=getNode(selectedId)){
    if(!n||n.type!=='project')return; n.projectData={...defaultProjectData(n.projectData),...projectFormData()}; n.notes=n.projectData.preliminaryInfo;
    n.priority=n.projectData.priority==='high'?'important':n.projectData.priority==='low'?'low':'medium'; n.status=n.projectData.status==='active'?'doing':n.projectData.status==='cancelled'?'todo':n.projectData.status==='paused'?'doing':'todo';
  }
  function renderProjectEditor(n){
    n.projectData=defaultProjectData(n.projectData);const p=n.projectData;
    $('projectPriorityInput').value=p.priority;$('projectStatusInput').value=p.status;$('projectAddressInput').value=p.address;$('projectPositionsInput').value=p.positions;$('projectSigningDateInput').value=p.signingDate;
    $('projectBudgetInput').value=p.budget;$('projectProfitInput').value=p.expectedProfit;$('projectAdvanceInput').value=p.advanceAmount;$('projectAdvanceDateInput').value=p.advanceDate;$('projectBalanceInput').value=p.balanceAmount;$('projectBalanceDateInput').value=p.balanceDate;
    $('projectClientNameInput').value=p.clientName;$('projectClientPhoneInput').value=p.clientPhone;$('projectClientEmailInput').value=p.clientEmail;$('projectIntroInput').value=p.preliminaryInfo;
    renderProjectCardImage(n);renderProjectAssets(n);renderProjectPeople(n);hydrateProjectIcons($('projectEditorPanel'));
  }
  async function renderProjectCardImage(n=getNode(selectedId)){
    const img=$('projectCardPreviewImage'),preview=$('projectCardPreview'),remove=$('removeProjectCardImageBtn');if(!img||!preview)return;img.removeAttribute('src');preview.classList.remove('has-image');remove.disabled=!n?.projectData?.cardImage;
    const meta=n?.projectData?.cardImage;if(!meta)return;try{const file=await getStoredFile(meta),url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url);preview.classList.add('has-image');}catch{}
  }
  async function setProjectCardImage(file){const n=getNode(selectedId);if(!n||n.type!=='project'||!file)return;const old=n.projectData?.cardImage;if(old)await idbDelete(old.id);const id=uid(),meta={id,name:file.name,type:file.type,size:file.size,createdAt:new Date().toISOString()};await idbPut({id,user:currentUser,nodeId:n.id,kind:'cardImage',name:file.name,type:file.type,size:file.size,blob:file,createdAt:meta.createdAt});n.projectData={...defaultProjectData(n.projectData),cardImage:meta};save({skipDrafts:true});renderProjectCardImage(n);renderAll();showToast('Фото карточки обновлено');}
  async function removeProjectCardImage(){const n=getNode(selectedId),meta=n?.projectData?.cardImage;if(!meta)return;await idbDelete(meta.id);n.projectData.cardImage=null;save({skipDrafts:true});renderProjectCardImage(n);renderAll();showToast('Фото карточки удалено');}
  async function hydrateProjectCardImages(){
    const tasks=[...document.querySelectorAll('[data-project-card-image]')].map(async img=>{const n=getNode(img.dataset.projectCardImage),meta=n?.projectData?.cardImage;if(!meta)return;try{const f=await getStoredFile(meta),url=URL.createObjectURL(f);img.src=url;img.onload=()=>{img.closest('.project-node-cover,.project-mini-image')?.classList.add('has-image');URL.revokeObjectURL(url);};}catch{}});await Promise.allSettled(tasks);
  }
  function renderProjectPeople(n=getNode(selectedId)){
    const box=$('projectPeoplePreview');if(!box||!n)return;box.innerHTML=n.contacts.length?n.contacts.map(c=>`<button type="button" class="project-person-chip" data-project-person="${c.id}"><span>${escapeHtml((c.name||c.role||'?')[0].toUpperCase())}</span><div><small>${escapeHtml(c.role||'Роль не указана')}</small><b>${escapeHtml(c.name||'Имя не указано')}</b></div><i>${projectIcon('eye','tiny-action-svg')}</i></button>`).join(''):'<div class="project-empty-inline">Люди пока не добавлены. Нажмите «＋», чтобы создать контакт и указать его роль.</div>';
    box.querySelectorAll('[data-project-person]').forEach(b=>b.addEventListener('click',()=>{openContacts(n.id);setTimeout(()=>viewContact(b.dataset.projectPerson),40);}));
  }
  function projectAssetLabel(kind){return kind==='images'?'изображение':kind==='pdfs'?'PDF-документ':'файл';}
  async function renderProjectAssets(n=getNode(selectedId)){
    if(!n)return;$('projectImagesCount').textContent=n.images.length;$('projectPdfsCount').textContent=n.pdfs.length;$('projectFilesCount').textContent=n.files.length;
    document.querySelectorAll('.project-assets-tab').forEach(b=>b.classList.toggle('active',b.dataset.projectAssetsKind===currentProjectAssetKind));
    const items=n[currentProjectAssetKind]||[],rail=$('projectAssetsRail');$('projectAddAssetBtn').textContent=`＋ Добавить ${projectAssetLabel(currentProjectAssetKind)}`;
    rail.innerHTML=items.length?items.map(m=>`<article class="project-asset-card ${currentProjectAssetKind}" data-project-asset="${m.id}" data-kind="${currentProjectAssetKind}"><div class="project-asset-visual">${currentProjectAssetKind==='images'?`<img data-project-asset-image="${m.id}" alt="">`:projectIcon(currentProjectAssetKind==='pdfs'?'pdf':'file','project-file-icon')}</div><div class="project-asset-copy"><b>${escapeHtml(m.name)}</b><small>${formatBytes(m.size)}</small></div><button type="button" class="project-asset-more" aria-label="Действия">•••</button></article>`).join(''):'<div class="project-empty-inline">Материалы этого типа пока не добавлены.</div>';
    if(currentProjectAssetKind==='images')for(const m of items){try{const f=await getStoredFile(m),url=URL.createObjectURL(f),img=rail.querySelector(`[data-project-asset-image="${CSS.escape(m.id)}"]`);if(img){img.src=url;img.onload=()=>URL.revokeObjectURL(url);}}catch{}}
    bindProjectAssetEvents();
  }
  function bindProjectAssetEvents(){
    document.querySelectorAll('[data-project-asset]').forEach(card=>{let timer=null,long=false;const openAction=()=>{long=true;attachmentClickGuard=true;openAttachmentAction(card.dataset.kind,card.dataset.projectAsset);navigator.vibrate?.(15);};card.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;long=false;timer=setTimeout(openAction,520);});['pointerup','pointercancel','pointerleave'].forEach(ev=>card.addEventListener(ev,()=>{clearTimeout(timer);if(long)setTimeout(()=>attachmentClickGuard=false,250);}));card.addEventListener('click',e=>{if(e.target.closest('.project-asset-more')){openAttachmentAction(card.dataset.kind,card.dataset.projectAsset);return;}if(attachmentClickGuard)return;openProjectAttachment(card.dataset.kind,card.dataset.projectAsset);});});
  }
  function openProjectAttachment(kind,id){if(kind==='images')openImageViewer(id);else if(kind==='pdfs')openPdfViewer(id);else{const m=findAttachment(kind,id);if(m)downloadAttachment(m);}}
  function openAttachmentAction(kind,id){const meta=findAttachment(kind,id);if(!meta)return;attachmentAction={kind,meta};$('attachmentActionTitle').textContent=meta.name;els.scrim.classList.remove('hidden');els.attachmentActionSheet.classList.remove('hidden');hydrateProjectIcons(els.attachmentActionSheet);}
  function closeAttachmentAction(){attachmentAction=null;els.attachmentActionSheet.classList.add('hidden');}

  function openNote(id=selectedId){selectedId=id;const n=getNode(id);if(!n)return;$('longNoteInput').value=n.type==='project'?(n.projectData?.preliminaryInfo||n.notes||''):(n.notes||'');renderNoteLinks();showSheet(els.note);}
  function renderNoteLinks(){const text=$('longNoteInput').value||'',urls=[...new Set(text.match(/https?:\/\/[^\s]+/g)||[])];$('noteLinksPreview').innerHTML=urls.length?`<strong>Ссылки в заметке:</strong>${urls.map(u=>`<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a>`).join('')}`:'<span>Ссылки будут определены автоматически.</span>';}
  function saveNote(){const n=getNode(selectedId);if(!n)return;n.notes=$('longNoteInput').value;if(n.type==='project'){n.projectData=defaultProjectData(n.projectData);n.projectData.preliminaryInfo=n.notes;}save({skipDrafts:true});renderAll();closeAllOverlays();showToast('Заметка сохранена');}

  const contactFieldIds=['contactRoleInput','contactNameInput','contactPhoneInput','contactEmailInput','contactInstagramInput','contactAddressInput','contactCommentInput'];
  function setContactFormMode(mode='edit'){contactViewMode=mode==='view';$('contactFormCard').classList.remove('hidden');contactFieldIds.forEach(id=>$(id).disabled=contactViewMode);$('saveContactBtn').classList.toggle('hidden',contactViewMode);$('deleteContactBtn').classList.toggle('hidden',contactViewMode||!selectedContactId);}
  function resetContactForm({show=false}={}){selectedContactId=null;contactViewMode=false;contactFieldIds.forEach(id=>{$(id).value='';$(id).disabled=false;});$('deleteContactBtn').disabled=true;$('deleteContactBtn').classList.add('hidden');$('saveContactBtn').classList.remove('hidden');$('contactFormCard').classList.toggle('hidden',!show);}
  function beginNewContact(){resetContactForm({show:true});setTimeout(()=>$('contactRoleInput').focus(),80);}
  function openContacts(id=selectedId){selectedId=id;const n=getNode(id);if(!n)return;$('contactsNodeTitle').textContent=n.title;resetContactForm();renderContactsList(n);showSheet(els.contacts);}
  function renderContactsList(n=getNode(selectedId)){
    $('contactsList').innerHTML=n?.contacts.length?n.contacts.map(c=>`<article class="contact-item"><div class="contact-avatar">${escapeHtml((c.name||c.role||'?')[0].toUpperCase())}</div><div><div class="contact-role">${escapeHtml(c.role||'Без подписи')}</div><b>${escapeHtml(c.name||'Имя не указано')}</b><small>${escapeHtml(c.comment?shortText(c.comment,58):[c.phone,c.email,c.instagram].filter(Boolean).join(' · ')||'Данные не заполнены')}</small></div><button class="contact-eye" data-contact-view="${c.id}" aria-label="Просмотр">${projectIcon('eye','tiny-action-svg')}</button><button class="contact-edit" data-contact-edit="${c.id}">Изменить</button></article>`).join(''):'<div class="empty-mini">Добавьте людей, поставщиков, мастерские, монтажников и другие контакты проекта.</div>';
    document.querySelectorAll('[data-contact-edit]').forEach(b=>b.addEventListener('click',()=>editContact(b.dataset.contactEdit)));
    document.querySelectorAll('[data-contact-view]').forEach(b=>b.addEventListener('click',()=>viewContact(b.dataset.contactView)));
  }
  function fillContactForm(c){$('contactRoleInput').value=c.role;$('contactNameInput').value=c.name;$('contactPhoneInput').value=c.phone;$('contactEmailInput').value=c.email;$('contactInstagramInput').value=c.instagram;$('contactAddressInput').value=c.address;$('contactCommentInput').value=c.comment;}
  function editContact(id){const n=getNode(selectedId),c=n?.contacts.find(x=>x.id===id);if(!c)return;selectedContactId=id;fillContactForm(c);$('deleteContactBtn').disabled=false;setContactFormMode('edit');$('contactFormCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function viewContact(id){const n=getNode(selectedId),c=n?.contacts.find(x=>x.id===id);if(!c)return;selectedContactId=id;fillContactForm(c);setContactFormMode('view');$('contactFormCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function contactFormData(){return {role:$('contactRoleInput').value.trim(),name:$('contactNameInput').value.trim(),phone:$('contactPhoneInput').value.trim(),email:$('contactEmailInput').value.trim(),instagram:$('contactInstagramInput').value.trim(),address:$('contactAddressInput').value.trim(),comment:$('contactCommentInput').value.trim()};}
  function syncContactForm({silent=false}={}){
    const n=getNode(selectedId);if(!n)return;const data=contactFormData();if(!Object.values(data).some(Boolean))return;
    if(selectedContactId){const c=n.contacts.find(x=>x.id===selectedContactId);if(c)Object.assign(c,data);}else{const c={id:uid(),...data};n.contacts.push(c);selectedContactId=c.id;}
    if(!silent){save({skipDrafts:true});renderContactsList(n);updateEditorSummaries(n);renderProjectPeople(n);showToast('Контакт сохранён');}
  }
  function deleteContact(){const n=getNode(selectedId);if(!n||!selectedContactId)return;n.contacts=n.contacts.filter(c=>c.id!==selectedContactId);save({skipDrafts:true});resetContactForm();renderContactsList(n);updateEditorSummaries(n);renderProjectPeople(n);showToast('Контакт удалён');}

  function openImages(id=selectedId){selectedId=id;renderImages();showSheet(els.images);}
  async function renderImages(){
    const n=getNode(selectedId);if(!n)return;$('imagesGrid').innerHTML=n.images.length?n.images.map(m=>`<article class="media-card" data-media-card="${m.id}"><img data-image-thumb="${m.id}" alt="${escapeHtml(m.name)}"><button class="media-delete" data-remove-image="${m.id}">×</button><div class="media-card-info"><b>${escapeHtml(m.name)}</b><small>${formatBytes(m.size)}</small></div></article>`).join(''):'<div class="empty-mini">Изображения не добавлены.</div>';
    for(const m of n.images){try{const f=await getStoredFile(m),url=URL.createObjectURL(f),img=document.querySelector(`[data-image-thumb="${CSS.escape(m.id)}"]`);if(img){img.src=url;img.onload=()=>URL.revokeObjectURL(url);}}catch{} }
    document.querySelectorAll('[data-media-card]').forEach(card=>card.addEventListener('click',e=>{if(!e.target.closest('.media-delete'))openImageViewer(card.dataset.mediaCard);}));
    document.querySelectorAll('[data-remove-image]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();removeAttachment('images',b.dataset.removeImage);}));
  }
  function openPdf(id=selectedId){selectedId=id;renderPdfList();showSheet(els.pdf);}
  function renderPdfList(){const n=getNode(selectedId);if(!n)return;$('pdfList').innerHTML=n.pdfs.length?n.pdfs.map(m=>fileRowHtml(m,'pdfs','PDF')).join(''):'<div class="empty-mini">PDF-документы не добавлены.</div>';bindFileRows('pdfs');}
  function openFiles(id=selectedId){selectedId=id;renderFilesList();showSheet(els.files);}
  function renderFilesList(){const n=getNode(selectedId);if(!n)return;$('filesList').innerHTML=n.files.length?n.files.map(m=>fileRowHtml(m,'files',fileExt(m.name))).join(''):'<div class="empty-mini">Другие файлы не добавлены.</div>';bindFileRows('files');}
  function fileExt(name=''){return (name.split('.').pop()||'FILE').slice(0,5).toUpperCase();}
  function fileRowHtml(m,kind,label){return `<article class="file-item"><div class="file-icon">${escapeHtml(label)}</div><div class="file-info"><b>${escapeHtml(m.name)}</b><small>${formatBytes(m.size)}</small></div><div class="file-actions"><button data-open-file="${m.id}" data-kind="${kind}" title="Открыть">↗</button><button data-download-file="${m.id}" data-kind="${kind}" title="Скачать">↓</button><button data-share-file="${m.id}" data-kind="${kind}" title="Отправить">⌁</button><button class="remove" data-remove-file="${m.id}" data-kind="${kind}" title="Удалить">×</button></div></article>`;}
  function bindFileRows(kind){
    document.querySelectorAll(`[data-open-file][data-kind="${kind}"]`).forEach(b=>b.addEventListener('click',()=>kind==='pdfs'?openPdfViewer(b.dataset.openFile):downloadAttachment(findAttachment(kind,b.dataset.openFile))));
    document.querySelectorAll(`[data-download-file][data-kind="${kind}"]`).forEach(b=>b.addEventListener('click',()=>downloadAttachment(findAttachment(kind,b.dataset.downloadFile))));
    document.querySelectorAll(`[data-share-file][data-kind="${kind}"]`).forEach(b=>b.addEventListener('click',()=>shareAttachment(findAttachment(kind,b.dataset.shareFile))));
    document.querySelectorAll(`[data-remove-file][data-kind="${kind}"]`).forEach(b=>b.addEventListener('click',()=>removeAttachment(kind,b.dataset.removeFile)));
  }
  function findAttachment(kind,id){return getNode(selectedId)?.[kind].find(m=>m.id===id);}
  function refreshOpenAttachmentSheet(kind){if(kind==='images'&&!els.images.classList.contains('hidden'))renderImages();if(kind==='pdfs'&&!els.pdf.classList.contains('hidden'))renderPdfList();if(kind==='files'&&!els.files.classList.contains('hidden'))renderFilesList();if(!els.attachments.classList.contains('hidden'))renderAttachmentHub();const n=getNode(selectedId);if(n?.type==='project'&&!els.editor.classList.contains('hidden'))renderProjectAssets(n);}
  function openAttachments(id=selectedId){selectedId=id;renderAttachmentHub();showSheet(els.attachments);}
  function renderAttachmentHub(){const n=getNode(selectedId);if(!n)return;$('hubImageCount').textContent=n.images.length;$('hubPdfCount').textContent=n.pdfs.length;$('hubFileCount').textContent=n.files.length;}

  async function openImageViewer(id){const m=findAttachment('images',id);if(!m)return;closeObjectUrl();const f=await getStoredFile(m);currentObjectUrl=URL.createObjectURL(f);viewerAttachment={kind:'images',meta:m};$('mediaViewerTitle').textContent=m.name;$('mediaViewerImage').src=currentObjectUrl;els.mediaViewer.classList.remove('hidden');}
  async function openPdfViewer(id){const m=findAttachment('pdfs',id);if(!m)return;closeObjectUrl();const f=await getStoredFile(m);currentObjectUrl=URL.createObjectURL(f);viewerAttachment={kind:'pdfs',meta:m};$('pdfViewerTitle').textContent=m.name;$('pdfFrame').src=currentObjectUrl;els.pdfViewer.classList.remove('hidden');}
  function closeObjectUrl(){if(currentObjectUrl){URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=null;}}
  function closeViewers(){closeObjectUrl();els.mediaViewer.classList.add('hidden');els.pdfViewer.classList.add('hidden');$('mediaViewerImage').removeAttribute('src');$('pdfFrame').removeAttribute('src');viewerAttachment=null;}

  function openArchiveAction(id=selectedId){selectedId=id;showSheet(els.archiveAction);}
  function archiveSelected(reason){
    const n=getNode(selectedId);if(!n)return;const branch=[n,...descendants(n.id)];const stamp=new Date().toISOString();branch.forEach(x=>{x.archived=true;x.archiveReason=reason;x.archivedAt=stamp;if(reason==='done')x.status='done';});save({skipDrafts:true});closeAllOverlays();renderAll();showToast(reason==='done'?'Перемещено в выполненные':'Перемещено в неактуальные');
  }
  function restoreArchived(id){
    const n=getNode(id);if(!n)return;const branch=[n,...descendants(n.id,true)].filter(x=>x.archived&&x.archivedAt===n.archivedAt);branch.forEach(x=>{x.archived=false;x.archiveReason='';x.archivedAt='';});if(n.parentId&&getNode(n.parentId)?.archived)n.parentId=null;save({skipDrafts:true});renderAll();showToast('Задача восстановлена');
  }

  function showSheet(el){
    closeNodeControls(); sheetIds.forEach(id=>$(id)?.classList.add('hidden')); els.scrim.classList.remove('hidden'); el.classList.remove('hidden');
  }
  function closeAllOverlays(clear=true){
    sheetIds.forEach(id=>$(id)?.classList.add('hidden'));els.scrim.classList.add('hidden');closeNodeControls();closeViewers();if(clear){selectedId=null;selectedContactId=null;renderTree();}
  }
  function setView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));closeNodeControls();if(id==='treeView')setTimeout(renderTree,0);if(id==='archiveView')renderArchive();}

  function applyTransform(){els.world.style.transform=`translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;}
  function zoom(delta,cx=els.viewport.clientWidth/2,cy=els.viewport.clientHeight/2){const old=transform.scale,next=Math.max(.28,Math.min(1.8,old+delta)),wx=(cx-transform.x)/old,wy=(cy-transform.y)/old;transform.x=cx-wx*next;transform.y=cy-wy*next;transform.scale=next;applyTransform();}
  function fitTree(){const v=visibleNodes();if(!v.length)return;const xs=v.map(n=>n.x),ys=v.map(n=>n.y),minX=Math.min(...xs)-130,maxX=Math.max(...xs)+130,minY=Math.min(...ys)-90,maxY=Math.max(...ys)+90,vw=els.viewport.clientWidth,vh=els.viewport.clientHeight,scale=Math.max(.28,Math.min(1.15,Math.min((vw-40)/(maxX-minX),(vh-40)/(maxY-minY))));transform.scale=scale;transform.x=(vw-(minX+maxX)*scale)/2;transform.y=(vh-(minY+maxY)*scale)/2;applyTransform();}
  function centerTree(){transform={x:50,y:70,scale:.78};applyTransform();}
  function autoLayout(){
    const roots=sectionNodes().filter(n=>!n.parentId||!getNode(n.parentId)||getNode(n.parentId).archived),lockedRoots=roots.filter(n=>n.locked),freeRoots=roots.filter(n=>!n.locked);let row=0;
    function place(n,depth){if(n.locked)return n.y;const kids=childrenOf(n.id),freeKids=kids.filter(k=>!k.locked);if(!freeKids.length){n.x=160+depth*320;n.y=120+row*150;row++;return n.y;}const ys=freeKids.map(k=>place(k,depth+1));n.x=160+depth*320;n.y=(Math.min(...ys)+Math.max(...ys))/2;return n.y;}
    freeRoots.forEach(r=>{place(r,0);row+=.4;});lockedRoots.forEach(()=>{});save({skipDrafts:true});renderAll();setTimeout(fitTree,50);showToast('Незафиксированные блоки выровнены');
  }

  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`boonwave-${normalizeEmail(currentUser).replace(/[^a-z0-9]+/g,'-')}-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);showToast('Структура экспортирована');}
  function importData(file){const r=new FileReader();r.onload=()=>{try{state=normalizeState(JSON.parse(r.result));save({skipDrafts:true});closeAllOverlays();renderAll();showToast('Данные импортированы');}catch{alert('Не удалось прочитать файл резервной копии.');}};r.readAsText(file);}
  function showToast(text){els.toast.textContent=text;els.toast.classList.remove('hidden');clearTimeout(showToast.t);showToast.t=setTimeout(()=>els.toast.classList.add('hidden'),1900);}

  document.querySelectorAll('.section-pill').forEach(b=>{let holdTimer=null;b.addEventListener('pointerdown',()=>{if(b.dataset.section==='projects')holdTimer=setTimeout(()=>{openProjects();navigator.vibrate?.(15);},520);});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>{clearTimeout(holdTimer);holdTimer=null;}));b.addEventListener('click',()=>{state.activeSection=b.dataset.section;save({skipDrafts:true});selectedId=null;cancelLink();renderAll();if(state.activeSection==='projects'&&!state.projects.length)openProjectSetup('onboarding');else setTimeout(fitTree,40);});});
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-node-action]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();handleNodeControl(b.dataset.nodeAction);}));

  $('addRootBtn').addEventListener('click',openRootTypeSheet);$('emptyAddBtn').addEventListener('click',()=>state.activeSection==='projects'&&!state.activeProjectId?openProjectSetup('onboarding'):openRootTypeSheet());$('addChildBtn').addEventListener('click',()=>addNode(selectedId));
  document.querySelectorAll('[data-root-type]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.rootType;closeAllOverlays(false);addNode(null,type);}));
  $('projectSwitcherBtn').addEventListener('click',openProjects);$('quickAddProjectBtn').addEventListener('click',()=>openProjectSetup('add'));$('addProjectFromListBtn').addEventListener('click',()=>openProjectSetup('add'));$('deleteProjectBtn').addEventListener('click',deleteActiveProject);$('createProjectBtn').addEventListener('click',createProject);$('cancelProjectSetupBtn').addEventListener('click',()=>closeAllOverlays());
  $('saveNodeBtn').addEventListener('click',saveEditor);$('deleteNodeBtn').addEventListener('click',deleteSelected);
  $('editorArchiveBtn').addEventListener('click',()=>openArchiveAction());$('editorMinimizeBtn').addEventListener('click',()=>toggleMinimize(selectedId));$('editorImagesBtn').addEventListener('click',()=>openImages());$('editorPdfBtn').addEventListener('click',()=>openPdf());$('editorFilesBtn').addEventListener('click',()=>openFiles());$('editorContactsBtn').addEventListener('click',()=>openContacts());$('editorPinBtn').addEventListener('click',()=>togglePin(selectedId));$('rewireBtn').addEventListener('click',()=>selectedId&&startLinkMode(selectedId));$('editorMenuBtn').addEventListener('click',()=>{const el=document.querySelector(`.tree-node[data-id="${CSS.escape(selectedId||'')}"]`);if(el){closeAllOverlays(false);showNodeControls(selectedId,el);}});
  $('openNoteBtn').addEventListener('click',()=>openNote());$('openContactBtn').addEventListener('click',()=>openContacts());$('openAttachmentsBtn').addEventListener('click',()=>openAttachments());
  $('saveNoteBtn').addEventListener('click',saveNote);$('longNoteInput').addEventListener('input',renderNoteLinks);
  $('newContactBtn').addEventListener('click',beginNewContact);$('saveContactBtn').addEventListener('click',()=>syncContactForm());$('deleteContactBtn').addEventListener('click',deleteContact);
  $('imageInput').addEventListener('change',e=>{addAttachments('images',e.target.files);e.target.value='';});$('pdfInput').addEventListener('change',e=>{addAttachments('pdfs',e.target.files);e.target.value='';});$('fileInput').addEventListener('change',e=>{addAttachments('files',e.target.files);e.target.value='';});
  $('projectCardImageInput').addEventListener('change',e=>{setProjectCardImage(e.target.files[0]);e.target.value='';});$('removeProjectCardImageBtn').addEventListener('click',removeProjectCardImage);
  document.querySelectorAll('.project-assets-tab').forEach(b=>b.addEventListener('click',()=>{currentProjectAssetKind=b.dataset.projectAssetsKind;renderProjectAssets();}));
  $('projectAddAssetBtn').addEventListener('click',()=>({images:$('projectAssetImageInput'),pdfs:$('projectAssetPdfInput'),files:$('projectAssetFileInput')}[currentProjectAssetKind])?.click());
  $('projectAssetImageInput').addEventListener('change',e=>{addAttachments('images',e.target.files);e.target.value='';});$('projectAssetPdfInput').addEventListener('change',e=>{addAttachments('pdfs',e.target.files);e.target.value='';});$('projectAssetFileInput').addEventListener('change',e=>{addAttachments('files',e.target.files);e.target.value='';});
  $('projectAddPersonBtn').addEventListener('click',()=>openContacts(selectedId));
  $('callProjectClientBtn').addEventListener('click',()=>{const v=$('projectClientPhoneInput').value.trim();if(v)location.href=`tel:${v.replace(/[^+\d]/g,'')}`;else showToast('Укажите номер телефона');});
  $('emailProjectClientBtn').addEventListener('click',()=>{const v=$('projectClientEmailInput').value.trim();if(v)location.href=`mailto:${v}`;else showToast('Укажите электронную почту');});
  $('attachmentActionOpen').addEventListener('click',()=>{if(!attachmentAction)return;const a=attachmentAction;els.attachmentActionSheet.classList.add('hidden');openProjectAttachment(a.kind,a.meta.id);});
  $('attachmentActionShare').addEventListener('click',()=>attachmentAction&&shareAttachment(attachmentAction.meta));$('attachmentActionDownload').addEventListener('click',()=>attachmentAction&&downloadAttachment(attachmentAction.meta));$('attachmentActionDelete').addEventListener('click',async()=>{if(!attachmentAction)return;const {kind,meta}=attachmentAction;await removeAttachment(kind,meta.id);closeAttachmentAction();});
  $('hubImagesBtn').addEventListener('click',()=>openImages());$('hubPdfBtn').addEventListener('click',()=>openPdf());$('hubFilesBtn').addEventListener('click',()=>openFiles());
  $('archiveDoneBtn').addEventListener('click',()=>archiveSelected('done'));$('archiveObsoleteBtn').addEventListener('click',()=>archiveSelected('obsolete'));

  const closeButtons={closeEditorBtn:()=>closeAllOverlays(),closeNoteBtn:()=>closeAllOverlays(),closeContactsBtn:()=>closeAllOverlays(),closeImagesBtn:()=>closeAllOverlays(),closePdfBtn:()=>closeAllOverlays(),closeFilesBtn:()=>closeAllOverlays(),closeAttachmentsBtn:()=>closeAllOverlays(),closeArchiveActionBtn:()=>closeAllOverlays(),closeRootTypeBtn:()=>closeAllOverlays(),closeAttachmentActionBtn:closeAttachmentAction,closeProjectsBtn:()=>closeAllOverlays(),closeProjectSetupBtn:()=>closeAllOverlays()};
  Object.entries(closeButtons).forEach(([id,fn])=>$(id).addEventListener('click',fn));els.scrim.addEventListener('click',()=>{if(!els.projectSetup.classList.contains('hidden')&&projectSetupMode==='onboarding')return;closeAllOverlays();});
  $('closeMediaViewerBtn').addEventListener('click',closeViewers);$('closePdfViewerBtn').addEventListener('click',closeViewers);
  $('deleteViewedImageBtn').addEventListener('click',()=>viewerAttachment&&removeAttachment('images',viewerAttachment.meta.id));$('downloadViewedImageBtn').addEventListener('click',()=>viewerAttachment&&downloadAttachment(viewerAttachment.meta));$('shareViewedImageBtn').addEventListener('click',()=>viewerAttachment&&shareAttachment(viewerAttachment.meta));
  $('deleteViewedPdfBtn').addEventListener('click',()=>viewerAttachment&&removeAttachment('pdfs',viewerAttachment.meta.id));$('downloadViewedPdfBtn').addEventListener('click',()=>viewerAttachment&&downloadAttachment(viewerAttachment.meta));$('shareViewedPdfBtn').addEventListener('click',()=>viewerAttachment&&shareAttachment(viewerAttachment.meta));

  $('menuBtn').addEventListener('click',()=>showSheet(els.menu));$('accountBtn').addEventListener('click',()=>showSheet(els.menu));$('exportBtn').addEventListener('click',exportData);$('importInput').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));
  $('installHelpBtn').addEventListener('click',()=>alert('Для установки на iPhone:\n\n1. Разместите папку приложения на HTTPS-хостинге.\n2. Откройте адрес в Safari.\n3. Нажмите «Поделиться».\n4. Выберите «На экран Домой».'));
  $('resetBtn').addEventListener('click',()=>{if(confirm('Удалить все проекты, личные цели и вложения текущего аккаунта?')){state=normalizeState(blankState());save({skipDrafts:true});closeAllOverlays(false);renderAll();openProjectSetup('onboarding');}});$('logoutBtn').addEventListener('click',logout);
  $('fitBtn').addEventListener('click',fitTree);$('centerBtn').addEventListener('click',centerTree);$('autoLayoutBtn').addEventListener('click',autoLayout);$('zoomInBtn').addEventListener('click',()=>zoom(.12));$('zoomOutBtn').addEventListener('click',()=>zoom(-.12));$('makeRootBtn').addEventListener('click',makeRoot);$('cancelLinkBtn').addEventListener('click',cancelLink);

  els.viewport.addEventListener('pointerdown',e=>{if(e.target.closest('.tree-node,.zoom-control,.link-mode-bar,.node-control-panel'))return;closeNodeControls();viewportDrag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:transform.x,oy:transform.y};els.viewport.setPointerCapture?.(e.pointerId);});
  els.viewport.addEventListener('pointermove',e=>{if(!viewportDrag||e.pointerId!==viewportDrag.id)return;transform.x=viewportDrag.ox+(e.clientX-viewportDrag.x);transform.y=viewportDrag.oy+(e.clientY-viewportDrag.y);applyTransform();});
  els.viewport.addEventListener('pointerup',()=>viewportDrag=null);els.viewport.addEventListener('pointercancel',()=>viewportDrag=null);
  els.viewport.addEventListener('wheel',e=>{e.preventDefault();const r=els.viewport.getBoundingClientRect();zoom(e.deltaY<0?.1:-.1,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  let pinch=null;els.viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){const[a,b]=e.touches;pinch={dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale:transform.scale};}},{passive:true});els.viewport.addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){const[a,b]=e.touches,d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);transform.scale=Math.max(.28,Math.min(1.8,pinch.scale*d/pinch.dist));applyTransform();}},{passive:true});els.viewport.addEventListener('touchend',()=>pinch=null,{passive:true});

  document.querySelectorAll('.auth-tab').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authMode)));$('authForm').addEventListener('submit',handleAuthSubmit);$('togglePasswordBtn').addEventListener('click',()=>{const visible=$('authPassword').type==='text';$('authPassword').type=visible?'password':'text';$('authPasswordConfirm').type=visible?'password':'text';$('togglePasswordBtn').textContent=visible?'○':'●';});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&currentUser)save({auto:true});});window.addEventListener('pagehide',()=>currentUser&&save({auto:true}));

  hydrateProjectIcons();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  initAuth();
})();
