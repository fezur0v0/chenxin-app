import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {settleTransfer,transferStatus} from '../src/chat-content/transfers.js';
import {splitLiveReply} from '../src/chat-content/live.js';
import {chat} from '../src/views.js';
function fixture(){const state=createState();state.sessions[0].messages=[{id:'source',role:'assistant',text:'<live>\nchar：[转账] 52|奶茶钱\nchar：[转账] 88|打车费\nuser：[转账] 100|我的转账\n</live>',time:1,attachments:[]}];return state;}
test('each received transfer settles once and appends a persistent matching receipt',()=>{
 const state=fixture(),source=state.sessions[0].messages[0];
 const accepted=settleTransfer(state,'source',0,'done',2),rejected=settleTransfer(state,'source',1,'refused',3);
 assert.equal(accepted.transferReceipt.amount,'52');assert.equal(rejected.transferReceipt.amount,'88');
 assert.equal(accepted.role,'user');assert.equal(rejected.text,'已退还 88');
 assert.throws(()=>settleTransfer(state,'source',0,'refused'),/已经处理/);
 assert.throws(()=>settleTransfer(state,'source',2,'done'),/不是待你/);
 assert.equal(state.sessions[0].messages.length,3);
 const restored=normalizeState(JSON.parse(exportData(state))),saved=restored.sessions[0].messages[0];
 assert.equal(transferStatus(saved,0,splitLiveReply(saved.text)[0]),'done');
 assert.equal(transferStatus(saved,1,splitLiveReply(saved.text)[1]),'refused');
 assert.deepEqual(restored.sessions[0].messages[1].transferReceipt,accepted.transferReceipt);
 assert(!chat(restored).includes('data-transfer-action='));
 source.text=source.text.replace('52|奶茶钱','520|新转账');assert.equal(transferStatus(source,0,splitLiveReply(source.text)[0]),'pending');
});
test('corrupt transfer states are ignored and explicit refunded cards stay non-actionable',()=>{
 const state=fixture();state.sessions[0].messages[0].transferStates=[{index:-1,status:'done',signature:'bad'},{index:0,status:'other',signature:'bad'}];
 assert.equal(normalizeState(state).sessions[0].messages[0].transferStates,undefined);
 assert.equal(splitLiveReply('<live>char：[转账] 52|奶茶钱|已退还</live>')[0].status,'refused');
 const pending=chat(fixture());assert.equal((pending.match(/data-transfer-action="done"/g)||[]).length,2);
});
