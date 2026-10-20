import {escape} from '../../ui.js';

// Display-only formatting. Raw scene entries remain unchanged; HTML is escaped.
export function splitMoomContent(value,summary=''){
 const raw=typeof value==='string'?value:'',parts=[];
 if(typeof summary==='string'&&summary.trim())parts.push(summary.trim());
 let body=raw;
 while(/^\s*<think\s*>/i.test(body)){
  const start=body.match(/^\s*<think\s*>/i)[0].length,tail=body.slice(start),end=/<\/think\s*>/i.exec(tail);
  const thinking=(end?tail.slice(0,end.index):tail).trim();
  if(thinking&&!parts.includes(thinking))parts.push(thinking);
  body=end?tail.slice(end.index+end[0].length):'';
  if(!end)break;
 }
 return {body:body.trim(),reasoning:parts.join('\n\n')};
}

function closingMark(value,mark,start){
 let index=value.indexOf(mark,start);
 while(index>=0){let slashes=0;for(let i=index-1;i>=0&&value[i]==='\\';i--)slashes++;if(slashes%2===0)return index;index=value.indexOf(mark,index+mark.length);}
 return -1;
}

export function renderMoomInline(value,depth=0){
 if(depth>8)return escape(value);
 let result='',plain='',i=0;
 const flush=()=>{result+=escape(plain);plain='';};
 const quotes={'"':'"','“':'”','「':'」','『':'』'};
 while(i<value.length){
  const ch=value[i];
  if(ch==='\\'&&i+1<value.length&&/[*`"“”「」『』\\]/.test(value[i+1])){plain+=value[i+1];i+=2;continue;}
  if(ch==='`'){const end=closingMark(value,'`',i+1);if(end>i+1){flush();result+='<code data-moom-part="inline-code">'+escape(value.slice(i+1,end))+'</code>';i=end+1;continue;}}
  if(ch==='*'){
   const mark=value.startsWith('**',i)?'**':'*',end=closingMark(value,mark,i+mark.length);
   if(end>i+mark.length){flush();const part=mark==='**'?'emphasis':'action',tag=mark==='**'?'strong':'em';result+='<'+tag+' data-moom-part="'+part+'">'+renderMoomInline(value.slice(i+mark.length,end),depth+1)+'</'+tag+'>';i=end+mark.length;continue;}
  }
  if(quotes[ch]){
   const end=closingMark(value,quotes[ch],i+1);
   if(end>i+1){flush();result+='<span data-moom-part="dialogue">'+escape(ch)+renderMoomInline(value.slice(i+1,end),depth+1)+escape(quotes[ch])+'</span>';i=end+1;continue;}
  }
  plain+=ch;i++;
 }
 flush();return result;
}

export function renderMoomBody(value,{kind='narration'}={}){
 if(!value)return '';
 const paragraphs=value.replace(/\r\n?/g,'\n').split(/\n\s*\n/);
 return paragraphs.map(part=>{
  const content=renderMoomInline(part);
  if(kind==='dialogue'&&!/["“「『]/.test(part))return '<p class="moom-prose"><span data-moom-part="dialogue">「'+content+'」</span></p>';
  if(kind==='act'&&!part.includes('*'))return '<p class="moom-prose"><em data-moom-part="action">'+content+'</em></p>';
  return '<p class="moom-prose">'+content+'</p>';
 }).join('');
}
