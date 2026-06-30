import store from '../state/store.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { CardDetailController } from './card-detail-controller.js';
import { NODE_TYPE_LABELS } from '../domain/node-schemas.js';
import { CARD_VIEW_SECTIONS, normalizeNodeView } from '../domain/node.js';
import { updateCardNode } from '../services/node-service.js';
import { getPrimarySelfNode } from '../services/self-node-service.js';
import { loadMedia } from '../services/media-service.js';
import { loadWorkspace, saveCamera } from '../services/workspace-service.js';
import { HOME_CAMERA_DURATION_MS, getCameraForCard, interpolateCamera } from '../canvas/camera-navigation.js';
import { getCoverMediaId, collectActiveCoverMediaIds, getCoverFallback, getCardProgress } from '../ui/card-presentation.js';
import { CoverLoadCoordinator } from '../ui/cover-load-coordinator.js';

const STATUS_LABELS=Object.freeze({preparation:'Подготовка',planned:'Запланировано',active:'Активно',draft:'Черновик',in_progress:'В работе',paused:'На паузе',completed:'Завершено'});

function ensureViewStyles(){
  if(document.getElementById('boonwave-card-view-styles'))return;
  const style=document.createElement('style');style.id='boonwave-card-view-styles';
  style.textContent=`.card{overflow:visible}.card[data-position-locked="true"]{cursor:default}.card-cover{position:relative;display:none;overflow:hidden;border:0;background:rgba(var(--node-rgb),.12)}.card-cover img{display:block;width:100%;height:100%;object-fit:cover;transform-origin:center;pointer-events:none}.card-cover-fallback{position:absolute;inset:0;display:none;place-items:center;font-size:38px;font-weight:800;color:rgba(255,255,255,.82);background:linear-gradient(145deg,rgba(var(--node-rgb),.34),rgba(var(--node-rgb),.12))}.card-full{display:none;margin-top:14px;padding-top:12px;border-top:1px solid rgba(var(--node-rgb),.22);color:var(--bw-text-secondary);font-size:11px;line-height:1.5;white-space:pre-wrap}.card-progress{position:relative;height:5px;margin-top:13px;border-radius:999px;background:rgba(143,151,184,.18);overflow:hidden}.card-progress>span{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,rgb(var(--bw-brand-violet)),rgb(var(--bw-brand-cyan)))}.card[data-view-mode="compact"]{width:132px;min-height:96px;padding:8px;border-radius:26px}.card[data-view-mode="compact"] .card-cover{width:116px;height:116px}.card[data-view-mode="compact"] h2{margin:8px 2px 2px;font-size:14px;line-height:1.1;text-align:center}.card[data-view-mode="compact"] p,.card[data-view-mode="compact"] .card-meta{font-size:10px}.card[data-view-mode="standard"]{width:230px;min-height:138px;padding:18px}.card[data-view-mode="standard"][data-show-cover="true"] .card-cover{display:block;width:calc(100% + 36px);height:92px;margin:-18px -18px 14px;border-radius:var(--bw-radius-card) var(--bw-radius-card) 16px 16px}.card[data-view-mode="compact"][data-show-cover="true"] .card-cover{display:block}.card[data-view-mode="detail"]{width:100%;min-height:250px;padding:22px}.card[data-view-mode="detail"] .card-cover{display:block;width:100%;height:180px;margin-bottom:16px;border-radius:20px}.card[data-view-mode="detail"] .card-full{display:block}.card[data-show-cover="false"] .card-cover,.card[data-show-type="false"] .card-type,.card[data-show-status="false"] .card-status,.card[data-show-title="false"] h2,.card[data-show-description="false"] p,.card[data-show-meta="false"] .card-meta,.card[data-show-progress="false"] .card-progress{display:none!important}.card[data-show-type="false"][data-show-status="false"] .card-head{display:none}.card[data-has-cover="false"][data-show-cover="true"] .card-cover{display:block}.card[data-has-cover="false"][data-show-cover="true"] .card-cover-fallback{display:grid}.card[data-has-cover="false"] .card-cover img{display:none}.card[data-cover-shape="rounded-square"] .card-cover{border-radius:24px}.card[data-cover-shape="circle"] .card-cover{border-radius:50%}.card[data-cover-shape="portrait"][data-view-mode="compact"] .card-cover{width:90px;height:116px;margin-inline:auto;border-radius:20px}.card[data-cover-shape="landscape"][data-view-mode="compact"] .card-cover{width:116px;height:82px;margin:17px 0;border-radius:18px}`;
  document.head.append(style);
}

function getNodeMeta(card){const data=card.data??{};if(card.type==='project')return[STATUS_LABELS[data.status]??data.status,data.address].filter(Boolean);if(card.type==='process'||card.type==='goal'){const progress=Number.isFinite(data.progress)?`${Math.round(data.progress)}%`:null;return[STATUS_LABELS[data.status]??data.status,progress].filter(Boolean);}if(card.type==='person')return[data.role,data.organization].filter(Boolean);if(card.type==='idea')return[STATUS_LABELS[data.status]??data.status,data.category].filter(Boolean);return[];}
function getCompactLabel(card,view){return view.compactLabel||String(card.title??'').trim().split(/\s+/)[0]||NODE_TYPE_LABELS[card.type];}
function formatFullData(card){return Object.entries(card.data??{}).filter(([,value])=>value!==''&&value!==null&&value!==undefined).filter(([key])=>!['coverMediaId','avatarMediaId','images','documents','files','attachments'].includes(key)).map(([key,value])=>`${key}: ${typeof value==='object'?JSON.stringify(value):value}`).join('\n');}
function collectChangedCardIds(nextCards={},previousCards={}){const ids=new Set([...Object.keys(nextCards),...Object.keys(previousCards)]);return[...ids].filter((id)=>nextCards[id]!==previousCards[id]);}
function visibilityKey(section){return`show${section[0].toUpperCase()}${section.slice(1)}`;}

export class WorkspaceController{
  constructor({canvas,world,initialSelectedCardId=null}){
    if(!(canvas instanceof Element)||!(world instanceof Element))throw new TypeError('WorkspaceController expects canvas and world elements.');
    ensureViewStyles();this.canvas=canvas;this.world=world;this.initialSelectedCardId=initialSelectedCardId;this.cardTapHandler=null;this.cardEditHandler=null;this.cardDisplayHandler=null;this.backgroundTapHandler=null;this.linkSourceProvider=null;this.linkModeProvider=null;this.cameraSaveTimer=null;this.cameraAnimationFrame=null;this.gestureMachine=null;this.cardController=null;this.detailController=null;this.linksRenderer=null;this.unsubscribe=null;this.mediaUrls=new Map();this.coverLoads=new CoverLoadCoordinator();this.abortController=new AbortController();
  }

  setCardTapHandler(handler){this.cardTapHandler=typeof handler==='function'?handler:null;}
  setCardEditHandler(handler){this.cardEditHandler=typeof handler==='function'?handler:null;}
  setCardDisplayHandler(handler){this.cardDisplayHandler=typeof handler==='function'?handler:null;}
  setBackgroundTapHandler(handler){this.backgroundTapHandler=typeof handler==='function'?handler:null;}
  setLinkSourceProvider(provider){this.linkSourceProvider=typeof provider==='function'?provider:null;}
  setLinkModeProvider(provider){this.linkModeProvider=typeof provider==='function'?provider:null;}

  async init({onEmpty}={}){
    await loadWorkspace();if(Object.keys(store.getState().cards).length===0&&typeof onEmpty==='function'){await onEmpty();await loadWorkspace();}
    const cards=store.getState().cards;const selectedCardId=this.initialSelectedCardId&&cards[this.initialSelectedCardId]?this.initialSelectedCardId:null;store.setState({selectedCardId});this.renderCards();this.applyCamera();this.mountCore();this.bindStore();this.bindCanvas();return this;
  }

  createCardElement(){
    const element=document.createElement('article');element.className='card';element.innerHTML='<div class="card-cover"><img alt=""><div class="card-cover-fallback" aria-hidden="true"></div></div><div class="card-head"><div class="card-type"></div><div class="card-status"></div></div><h2></h2><p></p><div class="card-meta"></div><div class="card-full"></div><div class="card-progress"><span></span></div>';return element;
  }

  async applyCover(element,card,view){
    const image=element.querySelector('.card-cover img');const fallback=element.querySelector('.card-cover-fallback');const mediaId=getCoverMediaId(card);const request=this.coverLoads.begin(card.id,mediaId);const frame=view.mode==='compact'?view.coverFrames.compact:view.coverFrames.working;image.style.transform=`scale(${frame.scale})`;image.style.objectPosition=`${frame.positionX}% ${frame.positionY}%`;element.dataset.coverShape=frame.shape;fallback.textContent=getCoverFallback(card);element.dataset.hasCover='false';image.removeAttribute('src');image.alt='';if(!mediaId)return;
    let url=this.mediaUrls.get(mediaId);if(!url){const loaded=await loadMedia(mediaId);if(!loaded?.blob||!this.coverLoads.isCurrent(request))return;url=URL.createObjectURL(loaded.blob);this.mediaUrls.set(mediaId,url);}const currentCard=store.getState().cards[card.id];if(!this.coverLoads.isCurrent(request)||element.dataset.cardId!==card.id||getCoverMediaId(currentCard)!==mediaId)return;image.src=url;image.alt=card.title?`Обложка: ${card.title}`:'Обложка карточки';element.dataset.hasCover='true';
  }

  cleanupUnusedMediaUrls(cards=store.getState().cards){const activeIds=collectActiveCoverMediaIds(cards);for(const[mediaId,url]of this.mediaUrls){if(activeIds.has(mediaId))continue;URL.revokeObjectURL(url);this.mediaUrls.delete(mediaId);}}

  updateCardElement(element,card,state,linkSourceId){
    const meta=getNodeMeta(card);const view=normalizeNodeView(card.view);const progress=getCardProgress(card);const visible=view.visible[view.mode];element.dataset.nodeType=card.type;element.dataset.viewMode=view.mode;element.dataset.selected=String(state.selectedCardId===card.id);element.dataset.linkSource=String(linkSourceId===card.id);element.dataset.positionLocked=String(Boolean(state.cardsLocked));for(const section of CARD_VIEW_SECTIONS)element.dataset[visibilityKey(section)]=String(Boolean(visible[section]));element.style.transform=`translate3d(${card.x}px, ${card.y}px, 0)`;element.tabIndex=0;element.setAttribute('role','group');element.setAttribute('aria-keyshortcuts','Space Enter');element.setAttribute('aria-label',`${NODE_TYPE_LABELS[card.type]??card.type}: ${card.title}. Удерживайте для редактирования. Двойное нажатие открывает карточку полностью.`);element.querySelector('.card-type').textContent=NODE_TYPE_LABELS[card.type]??card.type;element.querySelector('.card-status').textContent=meta[0]??'';element.querySelector('h2').textContent=view.mode==='compact'?getCompactLabel(card,view):card.title;element.querySelector('p').textContent=card.description;element.querySelector('.card-meta').textContent=meta.slice(1).join(' • ');element.querySelector('.card-full').textContent=formatFullData(card)||'Дополнительная информация пока не заполнена';const progressElement=element.querySelector('.card-progress');progressElement.hidden=progress===null;progressElement.querySelector('span').style.width=`${progress??0}%`;this.applyCover(element,card,view).catch((error)=>console.error('Cover render failed:',error));
  }

  renderCards(cardIds=null){
    const state=store.getState();const linkSourceId=this.linkSourceProvider?.()??null;if(cardIds===null){const existing=new Map([...this.world.querySelectorAll('[data-card-id]')].map((element)=>[element.dataset.cardId,element]));for(const card of Object.values(state.cards)){let element=existing.get(card.id);if(!element){element=this.createCardElement();element.dataset.cardId=card.id;this.world.append(element);}existing.delete(card.id);this.updateCardElement(element,card,state,linkSourceId);}for(const element of existing.values()){this.coverLoads.delete(element.dataset.cardId);element.remove();}this.cleanupUnusedMediaUrls(state.cards);return;}for(const id of[...new Set(cardIds.filter(Boolean))]){const card=state.cards[id];let element=this.world.querySelector(`[data-card-id="${CSS.escape(id)}"]`);if(!card){this.coverLoads.delete(id);element?.remove();continue;}if(!element){element=this.createCardElement();element.dataset.cardId=card.id;this.world.append(element);}this.updateCardElement(element,card,state,linkSourceId);}this.cleanupUnusedMediaUrls(state.cards);
  }

  getCardElement(cardId){return this.world.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);}
  applyCamera(){const{camera}=store.getState();this.world.style.transform=`translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`;}
  scheduleCameraSave(camera){clearTimeout(this.cameraSaveTimer);this.cameraSaveTimer=setTimeout(()=>saveCamera(camera).catch((error)=>console.error('Camera save failed:',error)),180);}
  getViewportCenter(){const{camera}=store.getState();return{x:(window.innerWidth/2-camera.x)/camera.zoom-115,y:(window.innerHeight/2-camera.y)/camera.zoom-69};}
  cancelCameraAnimation(){if(this.cameraAnimationFrame!==null)cancelAnimationFrame(this.cameraAnimationFrame);this.cameraAnimationFrame=null;}
  getHomeTargetPoint(){const header=document.querySelector('.app-header')?.getBoundingClientRect();const dock=document.querySelector('.mobile-dock')?.getBoundingClientRect();const top=Math.max(70,(header?.bottom??70)+12);const bottom=Math.min(window.innerHeight-80,(dock?.top??window.innerHeight-80)-12);return{x:window.innerWidth/2,y:top+Math.max(80,bottom-top)/2};}

  focusSelfCard(){
    const state=store.getState();const selfCard=getPrimarySelfNode(state.cards);if(!selfCard)return false;const element=this.getCardElement(selfCard.id);const point=this.getHomeTargetPoint();const target=getCameraForCard({card:selfCard,cardWidth:element?.offsetWidth??selfCard.width,cardHeight:element?.offsetHeight??selfCard.height,targetX:point.x,targetY:point.y});const from={...state.camera};this.gestureMachine?.cancelInteraction();this.cancelCameraAnimation();if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){store.setState({camera:target,selectedCardId:selfCard.id});return true;}const startedAt=performance.now();const animate=(now)=>{const progress=Math.min(1,(now-startedAt)/HOME_CAMERA_DURATION_MS);store.setState({camera:interpolateCamera(from,target,progress),selectedCardId:selfCard.id});if(progress<1)this.cameraAnimationFrame=requestAnimationFrame(animate);else{this.cameraAnimationFrame=null;store.setState({camera:target,selectedCardId:selfCard.id});}};this.cameraAnimationFrame=requestAnimationFrame(animate);return true;
  }

  mountCore(){
    this.gestureMachine=new GestureMachine(this.canvas,{allowPanFromInteractive:()=>Boolean(store.getState().cardsLocked)});this.detailController=new CardDetailController({root:document.body,onEdit:(card)=>this.cardEditHandler?.(card),onDisplay:(card)=>this.cardDisplayHandler?.(card)});this.cardController=new CardController(this.world,{onCommit:(card)=>updateCardNode(card.id,{x:card.x,y:card.y}),onTap:(card)=>this.cardTapHandler?.(card),onLongPress:(card)=>{if(this.linkModeProvider?.())return false;this.gestureMachine?.cancelInteraction();return this.cardEditHandler?.(card);},onDoubleTap:(card,element)=>{if(this.linkModeProvider?.())return false;this.gestureMachine?.cancelInteraction();return this.detailController.open(card,element);},canOpenFullscreen:()=>!this.linkModeProvider?.(),canMoveCard:()=>!store.getState().cardsLocked});this.linksRenderer=createLinksRenderer(this.world);
  }

  bindStore(){this.unsubscribe=store.subscribe((next,previous)=>{const changedIds=new Set();if(next.cards!==previous.cards)for(const id of collectChangedCardIds(next.cards,previous.cards))changedIds.add(id);if(next.selectedCardId!==previous.selectedCardId){if(previous.selectedCardId)changedIds.add(previous.selectedCardId);if(next.selectedCardId)changedIds.add(next.selectedCardId);}if(next.cardsLocked!==previous.cardsLocked)for(const id of Object.keys(next.cards))changedIds.add(id);if(changedIds.size>0)this.renderCards([...changedIds]);if(next.camera!==previous.camera){this.applyCamera();this.scheduleCameraSave(next.camera);}});}
  bindCanvas(){this.canvas.addEventListener('pointerdown',()=>this.cancelCameraAnimation(),{capture:true,signal:this.abortController.signal});this.canvas.addEventListener('click',(event)=>{if(event.target.closest('[data-card-id]'))return;store.setState({selectedCardId:null});this.backgroundTapHandler?.();},{signal:this.abortController.signal});}

  destroy(){clearTimeout(this.cameraSaveTimer);this.cancelCameraAnimation();saveCamera().catch(()=>{});this.abortController.abort();this.unsubscribe?.();this.linksRenderer?.destroy();this.cardController?.destroy();this.detailController?.destroy();this.gestureMachine?.destroy();for(const url of this.mediaUrls.values())URL.revokeObjectURL(url);this.mediaUrls.clear();this.coverLoads.clear();}
}

export default WorkspaceController;
