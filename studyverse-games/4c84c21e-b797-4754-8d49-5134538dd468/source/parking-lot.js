// Small DOM-only parking view. Item loading/submission stays in studyverse-session.js.
export function createParkingLot({bays, lot, car, scroller, onSelectionChange}) {
  let options = [];
  let index = 0;
  let locked = true;
  let parking = false;
  let buttons = [];

  function select(next) {
    if (locked || next < 0 || next >= options.length) return false;
    index = next;
    for (let i=0;i<buttons.length;i++) buttons[i].setAttribute('aria-pressed', String(i===index));
    car.style.left = String(((index+0.5)/options.length)*100)+'%';
    car.classList.remove('is-parked');
    const selected = buttons[index];
    // Scroll the lot rather than resizing answer text to unreadable widths.
    if (selected && selected.offsetLeft < scroller.scrollLeft) {
      scroller.scrollLeft = Math.max(0,selected.offsetLeft - 20);
    } else if (selected && selected.offsetLeft+selected.offsetWidth > scroller.scrollLeft+scroller.clientWidth) {
      scroller.scrollLeft = selected.offsetLeft+selected.offsetWidth-scroller.clientWidth+20;
    }
    onSelectionChange(options[index],index,options.length);
    return true;
  }

  function mount(nextOptions) {
    options = nextOptions;
    index = 0;
    locked = false;
    parking = false;
    car.classList.remove('is-parked');
    lot.style.setProperty('--bay-count', String(options.length));
    buttons = options.map((option,i) => {
      const button = document.createElement('button');
      button.type='button';
      button.className='bay';
      button.setAttribute('aria-label','Parking bay '+(i+1)+': '+option.text);
      button.setAttribute('aria-pressed','false');
      const letter=document.createElement('span');
      letter.className='bay-letter';
      letter.textContent=String(i+1);
      const answer=document.createElement('span');
      answer.className='bay-answer';
      answer.textContent=option.text;
      button.append(letter,answer);
      button.addEventListener('click',()=>select(i));
      return button;
    });
    bays.replaceChildren(...buttons);
    select(0);
  }

  function move(delta) {return select(index+delta);}
  function lock() {locked=true;for(const button of buttons) button.disabled=true;}
  async function park() {
    if (locked || parking || !options[index]) return null;
    parking=true;
    locked=true;
    lock();
    car.classList.add('is-parked');
    // The parking event precedes the one SDK submission, including reduced-motion mode.
    const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reducedMotion) await new Promise((resolve)=>setTimeout(resolve,440));
    return options[index].id;
  }
  function selectedIndex(){return index;}
  return {mount,move,park,lock,selectedIndex};
}
