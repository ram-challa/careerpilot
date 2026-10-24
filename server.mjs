import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {personalize,validOpenAIKey,AI_PROVIDER,AI_BUILD,DEFAULT_MODEL} from './ai.mjs';

try { process.loadEnvFile?.(fileURLToPath(new URL('.env',import.meta.url))); } catch {}
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.zip':'application/zip','.json':'application/json'};
const allowedOrigin=value=>/^http:\/\/(localhost|127\.0\.0\.1):(4173|4175)$/.test(value||'');
const build=AI_BUILD,provider=AI_PROVIDER;
const model=(process.env.OPENAI_MODEL||DEFAULT_MODEL).trim();
let apiKey=(process.env.OPENAI_API_KEY||'').trim(),busy=false,workspace=null;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>300000)throw Object.assign(Error('Request exceeds 300 KB.'),{status:413});chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(Error('Invalid JSON request.'),{status:400})}}
const server=http.createServer(async(req,res)=>{
  try{
    if(!/^((127\.0\.0\.1)|(localhost)):\d+$/.test(req.headers.host||'')){json(res,403,{error:'Local access only.'});return;}
    const url=new URL(req.url,'http://'+req.headers.host);
    if(url.pathname.startsWith('/api/')){
      const origin=req.headers.origin;
      if((origin&&!allowedOrigin(origin))||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'Only the local CareerPilot workspace can access this API.'});return;}
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-CareerPilot'});res.end();return;}
      if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{configured:validOpenAIKey(apiKey),model,busy,build,provider});return;}
      if(req.method==='GET'&&url.pathname==='/api/resume-source'){
        try{json(res,200,{text:await readFile(new URL('./resume.txt',import.meta.url),'utf8')})}catch{json(res,404,{error:'No local resume.txt found. Import your resume in My profile.'})}return;
      }
      if(req.method==='GET'&&url.pathname==='/api/workspace'){json(res,200,workspace||{jobs:[]});return;}
      if(req.method!=='POST'||req.headers['x-careerpilot']!=='1'||!String(req.headers['content-type']).startsWith('application/json')){json(res,400,{error:'Expected a CareerPilot JSON request.'});return;}
      const data=await body(req);
      if(url.pathname==='/api/config'){
        if(!validOpenAIKey(data.apiKey)){json(res,400,{error:'Enter a valid OpenAI API key beginning with sk-.'});return;}
        if(busy){json(res,409,{error:'Wait for the current revision before changing AI setup.'});return;}
        apiKey=data.apiKey.trim();json(res,200,{configured:true,model,provider});return;
      }
      if(url.pathname==='/api/workspace'){
        workspace={jobs:Array.isArray(data.jobs)?data.jobs.slice(0,100):[],selectedJobId:String(data.selectedJobId||'')};json(res,200,{ok:true});return;
      }
      if(url.pathname==='/api/personalize'){
        if(!validOpenAIKey(apiKey)){json(res,503,{error:'Add your OpenAI API key in AI setup before personalizing.',code:'key_missing'});return;}
        if(busy){json(res,409,{error:'A resume revision is already running. Please wait.'});return;}
        busy=true;
        try{json(res,200,await personalize({key:apiKey,model,source:data.resume,job:data.job}));}
        catch(e){json(res,e.status||422,{error:e.message||'Resume revision failed.'});}
        finally{busy=false;}
        return;
      }
      json(res,404,{error:'Unknown API endpoint.'});return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
    const full=path.resolve(root,name),relative=path.relative(root,full);
    if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
    const data=await readFile(full);
    res.writeHead(200,{'Content-Type':types[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(!res.headersSent){if(e.status)json(res,e.status,{error:e.message});else{res.writeHead(404);res.end('Not found')}}else res.end();}
});
let port=Number(process.env.PORT)||4173;
server.on('error',error=>{if(error.code==='EADDRINUSE'&&port===4173){port=4175;server.listen(port,'127.0.0.1');}else{console.error('Cannot start local server:',error.code);process.exitCode=1;}});
server.on('listening',()=>console.log(`Local: http://127.0.0.1:${port} · OpenAI model: ${model} · API key ${validOpenAIKey(apiKey)?'configured':'not configured'}`));
server.listen(port,'127.0.0.1');
