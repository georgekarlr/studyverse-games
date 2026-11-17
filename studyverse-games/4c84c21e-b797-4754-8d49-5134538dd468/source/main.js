// Local private preview: GameSDK.module receives only synthetic Study Item content.
// Public Game release and official grading are not enabled here.
const stage=document.querySelector('#game-screen');
async function startGamePreview(){
 const item=await GameSDK.module.getItem();
 if(!stage)return;
 const content=item.content;
 const heading=document.createElement('h2');
 heading.textContent='Synthetic '+item.item_type.replaceAll('_',' ')+' preview';
 const prompt=document.createElement('p');
 prompt.textContent=content.question||content.prompt||content.front||
  content.instructions||'Explore this synthetic Study Item.';
 stage.replaceChildren(heading,prompt);
 if(item.item_type==='multiple_choice'){
  const feedback=document.createElement('p');
  feedback.setAttribute('role','status');
  for(const option of content.options){
   const button=document.createElement('button');
   button.type='button';
   button.textContent=option.text;
   button.addEventListener('click',async()=>{
    for(const choice of stage.querySelectorAll('button'))choice.disabled=true;
    try{
     const receipt=await GameSDK.module.submitAnswer({
      item_id:item.id,response:{value:option.id}
     });
     feedback.textContent=receipt.message||'Synthetic response accepted.';
    }catch(error){
     feedback.textContent=error instanceof Error?error.message:'Preview response unavailable.';
    }
   });
   stage.append(button);
  }
  stage.append(feedback);
 }else{
  const details=document.createElement('pre');
  details.textContent=JSON.stringify(content,null,2);
  stage.append(details);
 }
}
void startGamePreview().catch(error=>{
 if(stage)stage.textContent=error instanceof Error?error.message:'Preview unavailable.';
});
