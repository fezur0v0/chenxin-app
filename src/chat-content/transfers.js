import {splitLiveReply} from './live.js';
const signature=part=>JSON.stringify([part.role,part.amount,part.note]);
export function transferStatus(message,index,part){
 return message?.transferStates?.find(item=>item.index===index&&item.signature===signature(part))?.status||part.status;
}
export function normalizeTransferFields(message){
 const result={},valid=item=>item&&Number.isInteger(item.index)&&item.index>=0&&item.index<12000&&typeof item.signature==='string'&&item.signature.length<=12000&&['done','refused'].includes(item.status);
 if(Array.isArray(message.transferStates)){
  const seen=new Set(),states=message.transferStates.filter(item=>valid(item)&&!seen.has(item.index)&&seen.add(item.index)).slice(0,200).map(({index,signature,status})=>({index,signature,status}));
  if(states.length)result.transferStates=states;
 }
 const receipt=message.transferReceipt;
 if(valid(receipt)&&typeof receipt.messageId==='string'&&receipt.messageId.length<=100&&typeof receipt.amount==='string'&&typeof receipt.note==='string')result.transferReceipt={index:receipt.index,signature:receipt.signature,status:receipt.status,messageId:receipt.messageId,amount:receipt.amount.slice(0,100),note:receipt.note.slice(0,500)};
 return result;
}
export function settleTransfer(state,id,index,status,now=Date.now()){
 if(!['done','refused'].includes(status))throw new Error('无效的转账操作。');
 const session=state.sessions.find(item=>item.id===state.active),message=session?.messages.find(item=>item.id===id);
 const part=message?.role==='assistant'?splitLiveReply(message.text)[index]:null;
 if(!part||part.kind!=='transfer'||part.role!=='assistant')throw new Error('这不是待你处理的转账。');
 if(transferStatus(message,index,part)!=='pending')throw new Error('这笔转账已经处理过了。');
 const data={index,signature:signature(part),status};
 message.transferStates=[...(message.transferStates||[]).filter(item=>item.index!==index),data];
 const receipt={id:crypto.randomUUID(),role:'user',text:`${status==='done'?'已收款':'已退还'} ${part.amount}`,time:now,status:'local',attachments:[],transferReceipt:{...data,messageId:id,amount:part.amount,note:part.note}};
 session.messages.push(receipt);return receipt;
}
