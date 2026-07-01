import store from '../state/store.js';
import { CARD_VIEW_MODES, CARD_VIEW_SECTIONS, normalizeNodeView } from '../domain/node.js';
import { updateCardView } from '../services/card-view-service.js';

const LABELS = Object.freeze({ cover:'Обложка', type:'Тип карточки', status:'Статус', title:'Название', description:'Описание', meta:'Дополнительные данные', progress:'Прогресс' });

function ensureStyles(){
  if(document.getElementById('boonwave-card-display-styles'))return;
  const style=document.createElement('style');
  style.id='boonwave-card-display-styles';
  style.textContent=`.card-display-sheet[hidden]{display:none}.card-display-sheet{position:fixed;inset:0;z-index:150;display:grid;align-items:end;background:rgba(3,4,10,.72);backdrop-filter:blur(10px)}.card-display-panel{max-height:90svh;overflow:auto;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border:1px solid var(--bw-border-soft);border-radius:28px 28px 0 0;background:var(--bw-bg-surface-strong)}.card-display-head{display:flex;align-items:center;justify-content:space-between}.card-display-head h2{margin:0;font-size:21px}.card-display-close{width:44px;height:44px;border:0;border-radius:50%;background:var(--bw-bg-control);color:var(--bw-text-primary);font-size:25px}.card-display-modes{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:16px 0;padding:5px;border:1px solid var(--bw-border-soft);border-radius:17px;background:var(--bw-bg-control)}.card-display-modes button{min-height:46px;border:0;border-radius:13px;background:transparent;color:var(--bw-text-secondary)}.card-display-modes button[aria-pressed="true"]{background:var(--bw-bg-control-active);color:var(--bw-text-primary)}.card-display-preview{min-height:270px;display:grid;place-items:center;padding:22px;border:1px solid var(--bw-border-soft);border-radius:24px;background:var(--bw-bg-canvas);overflow:hidden}.card-display-preview .card{position:relative!important;transform:none!important;pointer-events:none}.card-display-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.card-display-option{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 12px;border:1px solid var(--bw-border-soft);border-radius:14px;background:var(--bw-bg-control);color:var(--bw-text-secondary);font-size:12px}.card-display-option input{width:20px;height:20px;accent-color:rgb(var(--bw-brand-violet))}.card-display-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.card-display-actions button{min-height:50px;border:1px solid var(--bw-border-soft);border-radius:16px;background:var(--bw-bg-control);color:var(--bw-text-primary);font-weight:700}.card-display-actions .save{border:0;background:linear-gradient(135deg,rgb(var(--bw-brand-violet)),rgb(var(--bw-brand-cyan)));color:#fff}@media(max-width:390px){.card-display-options{grid-template-columns:1fr}}`;
  document.head.append(style);
}

function applyVisibility(element,view){
  const visible=view.visible[view.mode];
  for(const section of CARD_VIEW_SECTIONS){
    const key=`show${section[0].toUpperCase()}${section.slice(1)}`;
    element.dataset[key]=String(Boolean(visible[section]));
  }
}

export class CardDisplayController{
  constructor({root=document.body,getCardElement}={}){
    if(!(root instanceof Element))throw new TypeError('CardDisplayController expects a root element.');
    ensureStyles();
    this.root=root;
    this.getCardElement=typeof getCardElement==='function'?getCardElement:(id)=>document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
    this.cardId=null;
    this.draftView=null;
    this.abortController=new AbortController();
    this.createSheet();
  }

  createSheet(){
    const sheet=document.createElement('section');
    sheet.className='card-display-sheet';sheet.hidden=true;sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`<div class="card-display-panel" role="dialog" aria-modal="true" aria-labelledby="cardDisplayTitle"><div class="card-display-head"><h2 id="cardDisplayTitle">Формат отображения</h2><button class="card-display-close" type="button" aria-label="Закрыть">×</button></div><div class="card-display-modes"><button type="button" data-display-mode="compact">Компактная</button><button type="button" data-display-mode="standard">Рабочая</button></div><div class="card-display-preview" aria-label="Предпросмотр миниатюры"></div><div class="card-display-options"></div><div class="card-display-actions"><button type="button" data-display-cancel>Отмена</button><button class="save" type="button" data-display-save>Сохранить</button></div></div>`;
    this.root.append(sheet);this.sheet=sheet;this.preview=sheet.querySelector('.card-display-preview');this.options=sheet.querySelector('.card-display-options');
    for(const section of CARD_VIEW_SECTIONS){const label=document.createElement('label');label.className='card-display-option';label.innerHTML=`<input type="checkbox" data-display-section="${section}"><span>${LABELS[section]}</span>`;this.options.append(label);}
    const signal=this.abortController.signal;
    sheet.querySelector('.card-display-close').addEventListener('click',()=>this.close(),{signal});
    sheet.querySelector('[data-display-cancel]').addEventListener('click',()=>this.close(),{signal});
    sheet.querySelector('[data-display-save]').addEventListener('click',()=>this.save(),{signal});
    sheet.addEventListener('click',(event)=>{if(event.target===sheet)this.close();},{signal});
    for(const button of sheet.querySelectorAll('[data-display-mode]'))button.addEventListener('click',()=>this.setMode(button.dataset.displayMode),{signal});
    this.options.addEventListener('change',(event)=>{const input=event.target.closest('[data-display-section]');if(!input||!this.draftView)return;this.draftView.visible[this.draftView.mode][input.dataset.displaySection]=input.checked;this.renderPreview();},{signal});
  }

  open(cardId){
    const card=store.getState().cards[cardId];if(!card)return false;
    this.cardId=cardId;this.draftView=structuredClone(normalizeNodeView(card.view));this.sheet.hidden=false;this.sheet.setAttribute('aria-hidden','false');this.syncControls();this.renderPreview();return true;
  }

  setMode(mode){if(!this.draftView||!CARD_VIEW_MODES.includes(mode))return;this.draftView.mode=mode;this.syncControls();this.renderPreview();}

  syncControls(){
    if(!this.draftView)return;
    for(const button of this.sheet.querySelectorAll('[data-display-mode]'))button.setAttribute('aria-pressed',String(button.dataset.displayMode===this.draftView.mode));
    for(const input of this.options.querySelectorAll('[data-display-section]'))input.checked=Boolean(this.draftView.visible[this.draftView.mode][input.dataset.displaySection]);
  }

  renderPreview(){
    if(!this.cardId||!this.draftView)return;
    const card=store.getState().cards[this.cardId];const source=this.getCardElement(this.cardId);
    if(!card||!(source instanceof Element)){this.preview.textContent='Предпросмотр недоступен';return;}
    const clone=source.cloneNode(true);clone.removeAttribute('data-card-id');clone.removeAttribute('aria-keyshortcuts');clone.dataset.selected='true';clone.dataset.linkSource='false';clone.dataset.viewMode=this.draftView.mode;clone.tabIndex=-1;applyVisibility(clone,this.draftView);
    const heading=clone.querySelector('h2');if(heading)heading.textContent=this.draftView.mode==='compact'?(this.draftView.compactLabel||String(card.title??'').trim().split(/\s+/)[0]||card.title):card.title;
    const frame=this.draftView.mode==='compact'?this.draftView.coverFrames.compact:this.draftView.coverFrames.working;const image=clone.querySelector('.card-cover img');if(image){image.style.transform=`scale(${frame.scale})`;image.style.objectPosition=`${frame.positionX}% ${frame.positionY}%`;}clone.dataset.coverShape=frame.shape;clone.querySelectorAll('button').forEach((button)=>button.remove());this.preview.replaceChildren(clone);
  }

  async save(){
    if(!this.cardId||!this.draftView)return;
    const button=this.sheet.querySelector('[data-display-save]');button.disabled=true;
    try{await updateCardView(this.cardId,structuredClone(this.draftView));this.close();}catch(error){console.error('Card display save failed:',error);button.disabled=false;}
  }

  close(){this.sheet.hidden=true;this.sheet.setAttribute('aria-hidden','true');this.sheet.querySelector('[data-display-save]').disabled=false;this.preview.replaceChildren();this.cardId=null;this.draftView=null;}
  destroy(){this.abortController.abort();this.sheet.remove();}
}

export default CardDisplayController;
