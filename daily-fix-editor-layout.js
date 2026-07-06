(()=>{
  if(window.__boonwaveEditorLayoutFix26)return;
  window.__boonwaveEditorLayoutFix26=true;

  const style=document.createElement('style');
  style.textContent=`
    #editorDialog.app-dialog,
    #editorDialog{
      width:100vw!important;
      max-width:100vw!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }

    #editorDialog .dialog-shell{
      width:100vw!important;
      max-width:100vw!important;
      min-width:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }

    #editorDialog .dialog-header,
    #editorDialog .dialog-footer{
      width:100vw!important;
      max-width:100vw!important;
      min-width:0!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
    }

    #editorDialog .dialog-body,
    #editorBody{
      width:100vw!important;
      max-width:100vw!important;
      min-width:0!important;
      box-sizing:border-box!important;
      overflow-x:hidden!important;
      padding-left:18px!important;
      padding-right:18px!important;
    }

    #editorDialog .dialog-body{
      padding-bottom:calc(156px + var(--safe-bottom, env(safe-area-inset-bottom)))!important;
      scroll-padding-bottom:calc(156px + var(--safe-bottom, env(safe-area-inset-bottom)))!important;
    }

    #editorBody{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      gap:18px!important;
      padding-bottom:calc(156px + var(--safe-bottom, env(safe-area-inset-bottom)))!important;
    }

    #editorBody > *,
    #editorBody .field,
    #editorBody label,
    #editorBody .field-grid,
    #editorBody .editor-group,
    #editorBody .detail-section,
    #editorBody .project-materials,
    #editorBody .asset-editor,
    #editorBody section,
    #editorBody form,
    #editorBody div{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }

    #editorBody .field,
    #editorBody label.field,
    #editorBody .editor-field{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      gap:8px!important;
    }

    #editorBody .field-grid,
    #editorBody [class*="grid"]{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:18px!important;
    }

    #editorBody input,
    #editorBody textarea,
    #editorBody select{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
      margin-left:0!important;
      margin-right:0!important;
    }

    #editorDialog .dialog-footer{
      grid-template-columns:auto minmax(0,1fr) auto auto!important;
      gap:10px!important;
      padding-left:18px!important;
      padding-right:18px!important;
      padding-bottom:calc(14px + var(--safe-bottom, env(safe-area-inset-bottom)))!important;
    }

    #editorDialog .dialog-footer button{
      max-width:100%!important;
      box-sizing:border-box!important;
    }

    @media(max-width:430px){
      #editorDialog .dialog-body,
      #editorBody{
        padding-left:16px!important;
        padding-right:16px!important;
      }
      #editorDialog .dialog-footer{
        padding-left:16px!important;
        padding-right:16px!important;
      }
    }
  `;
  document.head.appendChild(style);

  function applyEditorLayoutFix(){
    const body=document.getElementById('editorBody');
    if(!body)return;
    body.style.paddingBottom='calc(156px + var(--safe-bottom, env(safe-area-inset-bottom)))';
    body.querySelectorAll('input, textarea, select').forEach(el=>{
      el.style.width='100%';
      el.style.maxWidth='100%';
      el.style.minWidth='0';
      el.style.boxSizing='border-box';
    });
  }

  const observer=new MutationObserver(applyEditorLayoutFix);
  const editor=document.getElementById('editorDialog');
  if(editor)observer.observe(editor,{childList:true,subtree:true,attributes:true});
  setInterval(applyEditorLayoutFix,1000);
  requestAnimationFrame(applyEditorLayoutFix);
})();
