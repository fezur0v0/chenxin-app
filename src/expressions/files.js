// Read only Word's text document. Never load embedded media, links or macros.
export async function readStickerFile(file){
 if(file.size>2*1024*1024)throw new Error('导入文件不能超过 2MB。');
 const extension=file.name.split('.').at(-1).toLowerCase();
 if(['txt','json'].includes(extension))return (await file.text()).replace(/^\uFEFF/,'');
 if(extension!=='docx')throw new Error('请选择 TXT、JSON 或 DOCX 文件。');
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('DOCX 文件损坏，无法读取。');
 let offset=view.getUint32(end+16,true);const count=view.getUint16(end+10,true);let xml='';
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw new Error('DOCX 目录损坏。');
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),expanded=view.getUint32(offset+24,true),nameSize=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=new TextDecoder().decode(bytes.subarray(offset+46,offset+46+nameSize));offset+=46+nameSize+extra+comment;
  if(name!=='word/document.xml')continue;
  if(flags&1||![0,8].includes(method)||expanded>2*1024*1024||local+30>bytes.length)throw new Error('无法读取加密、过大或不支持的 DOCX 文档。');
  if(view.getUint32(local,true)!==0x04034b50)throw new Error('DOCX 内容损坏。');
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);if(start+size>bytes.length)throw new Error('DOCX 内容不完整。');
  let data=bytes.slice(start,start+size);
  if(method===8){
   let stream;try{stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{throw new Error('此浏览器暂不支持 DOCX 解压，请另存为 TXT 或 JSON 后导入。');}
   const reader=stream.getReader(),chunks=[];let length=0;
   try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>2*1024*1024)throw new Error('DOCX 文字超过 2MB。');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
   data=new Uint8Array(length);let position=0;for(const chunk of chunks){data.set(chunk,position);position+=chunk.length;}
  }
  if(data.length!==expanded)throw new Error('DOCX 内容不完整。');xml=new TextDecoder().decode(data);break;
 }
 if(!xml||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('没有找到可读取的 DOCX 正文。');
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('DOCX 正文损坏。');
 const read=node=>node.nodeType===3?'':node.localName==='t'?node.textContent:['br','cr'].includes(node.localName)?'\n':node.localName==='tab'?'\t':[...node.childNodes].map(read).join('');
 return [...doc.getElementsByTagNameNS('*','p')].map(read).join('\n');
}
