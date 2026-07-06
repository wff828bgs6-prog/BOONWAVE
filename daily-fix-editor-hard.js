(()=>{
  if(window.__boonwaveEditorHardFix27)return;
  window.__boonwaveEditorHardFix27=true;

  const EDGE=16;
  const BOTTOM=170;

  const style=document.createElement('style');
  style.textContent=`
    #editorDialog,
    #editorDialog.app-dialog{
      width:100vw!important;
      max-width:100vw!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    #editorDialog .dialog-shell{
      width:100vw!important;
      max-width:100vw!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    #editorDialog .dialog-body{
      width:100vw!important;
      max-width:100vw!important;
      padding-left:0!important;
      padding-right:0!important;
      padding-bottom:calc(${BOTTOM}px + env(safe-area-inset-bottom))!important;
      overflow-x:hidden!important;
      box-sizing:border-box!important;
    }
    #editorBody{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      gap:18px!important;
      width:100vw!important;
      max-width:100vw!important;
      padding-left:0!important;
      padding-right:0!important;
      padding-bottom:calc(${BOTTOM}px + env(safe-area-inset-bottom))!important;
      overflow-x:hidden!important;
      box-sizing:border-box!important;
    }
    #editorDialog .dialog-footer{
      width:100vw!important;
      max-width:100vw!important;
      padding-left:${EDGE}px!important;
      padding-right:${EDGE}px!important;
      padding-bottom:calc(14px + env(safe-area-inset-bottom))!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
    }
  `;
  document.head.appendChild(style);

  function fix(){
    const body=document.getElementById('editorBody');
    const dialog=document.getElementById('editorDialog');
    if(!body||!dialog)return;

    const usable=Math.max(260, Math.floor(window.innerWidth - EDGE*2));
    const px=usable+'px';

    dialog.style.width='100vw';
    dialog.style.maxWidth='100vw';
    dialog.style.overflow='hidden';

    const shell=dialog.querySelector('.dialog-shell');
    if(shell){
      shell.style.width='100vw';
      shell.style.maxWidth='100vw';
      shell.style.overflow='hidden';
      shell.style.boxSizing='border-box';
    }

    const dialogBody=dialog.querySelector('.dialog-body');
    if(dialogBody){
      dialogBody.style.width='100vw';
      dialogBody.style.maxWidth='100vw';
      dialogBody.style.paddingLeft='0px';
      dialogBody.style.paddingRight='0px';
      dialogBody.style.overflowX='hidden';
      dialogBody.style.boxSizing='border-box';
      dialogBody.style.paddingBottom=`calc(${BOTTOM}px + env(safe-area-inset-bottom))`;
    }

    body.style.width='100vw';
    body.style.maxWidth='100vw';
    body.style.paddingLeft='0px';
    body.style.paddingRight='0px';
    body.style.overflowX='hidden';
    body.style.boxSizing='border-box';
    body.style.display='flex';
    body.style.flexDirection='column';
    body.style.alignItems='center';
    body.style.paddingBottom=`calc(${BOTTOM}px + env(safe-area-inset-bottom))`;

    const blocks=body.querySelectorAll('.field, label, .field-grid, .editor-group, .detail-section, section, form, .project-materials, .asset-editor');
    blocks.forEach(el=>{
      el.style.width=px;
      el.style.maxWidth=px;
      el.style.minWidth='0';
      el.style.boxSizing='border-box';
      el.style.marginLeft='auto';
      el.style.marginRight='auto';
    });

    const controls=body.querySelectorAll('input, textarea, select');
    controls.forEach(el=>{
      el.style.width='100%';
      el.style.maxWidth='100%';
      el.style.minWidth='0';
      el.style.boxSizing='border-box';
      el.style.marginLeft='0';
      el.style.marginRight='0';
    });
  }

  const observer=new MutationObserver(fix);
  const editor=document.getElementById('editorDialog');
  if(editor)observer.observe(editor,{childList:true,subtree:true,attributes:true});
  window.addEventListener('resize',fix,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(fix,250),{passive:true});
  setInterval(fix,600);
  requestAnimationFrame(fix);
})();
