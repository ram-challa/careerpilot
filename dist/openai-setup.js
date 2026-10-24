import {api} from './api-client.js';

export function mountOpenAISetup(form,{onSaved=()=>{}}={}){
  const field=form.querySelector('[data-openai-key]'),save=form.querySelector('[data-openai-save]'),output=form.querySelector('[data-openai-status]');
  const message=(text,error=false)=>{output.textContent=text;output.classList.toggle('error',error);};
  save.disabled=true;
  api('/api/status').then(result=>{message(`${result.model} · ${result.configured?'An OpenAI key is already configured for this session. You can return to Resume studio.':'Enter your OpenAI API key below.'}`);save.disabled=false;}).catch(error=>message(error.message,true));
  form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const result=await api('/api/config',{apiKey:field.value});message(`OpenAI setup saved for this server session. Model: ${result.model}. The first personalization request verifies API access.`);onSaved(result);}catch(error){message(error.message,true);}finally{field.value='';save.disabled=false;}};
}
