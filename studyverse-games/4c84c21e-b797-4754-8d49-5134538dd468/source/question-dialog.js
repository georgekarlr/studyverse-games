// Accessible, pause-on-open read-only Study Item overlay. Never receives an answer key.
export function createQuestionDialog({trigger,backdrop,closeButton,resumeButton,questionNode,optionsNode,onOpen,onClose}) {
  const panel=document.getElementById('question-dialog-panel');
  let opened=false;
  let restoreFocus=null;
  function setItem(item) {
    questionNode.textContent=item?.question||'No Study Item is loaded. Open a private Module Preview or try a sample drive.';
    const choices=(item?.options||[]).map((option,index)=>{
      const row=document.createElement('li');
      const number=document.createElement('span');
      number.className='option-number';
      number.textContent=String(index+1);
      const label=document.createElement('span');
      label.className='option-text';
      label.textContent=option.text;
      row.append(number,label);
      return row;
    });
    optionsNode.replaceChildren(...choices);
  }
  function open() {
    if(opened)return;
    restoreFocus=document.activeElement;
    opened=true;
    onOpen();
    backdrop.classList.remove('is-hidden');
    closeButton.focus();
  }
  function close() {
    if(!opened)return;
    opened=false;
    backdrop.classList.add('is-hidden');
    onClose();
    if(restoreFocus?.isConnected && typeof restoreFocus.focus==='function')restoreFocus.focus();
    else trigger.focus();
    restoreFocus=null;
  }
  function onKey(event) {
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab')return;
    const focusables=[closeButton,document.getElementById('demo'),
      document.getElementById('again'),resumeButton]
      .filter(node=>node&&!node.disabled&&!node.classList.contains('is-hidden'));
    if(!focusables.length){event.preventDefault();panel.focus();return;}
    const [first]=focusables;
    const last=focusables.at(-1);
    if(event.shiftKey && (document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey && (document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
  }
  trigger.addEventListener('click',open);
  closeButton.addEventListener('click',close);
  resumeButton.addEventListener('click',close);
  backdrop.addEventListener('pointerdown',(event)=>{if(event.target===backdrop)close();});
  document.addEventListener('keydown',onKey);
  setItem(null);
  return {setItem,open,close,isOpen:()=>opened};
}
