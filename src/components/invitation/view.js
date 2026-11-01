import {escape} from '../../ui.js';
import {icon} from '../../icons.js';

// Pure presentation: no moom/store access. Every content value is escaped.
const attrs=data=>`data-invitation-id="${escape(data.id)}" data-invitation-source="${escape(data.sourceId||'')}"`;
function portrait(person){
 const src=person?.avatar;
 const safe=typeof src==='string'&&src.length<1200000&&/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(src);
 return `<span data-invitation-part="portrait">${safe?`<img src="${escape(src)}" alt="">`:`<span>${escape((person?.name||'').slice(0,1))}</span>`}</span>`;
}
const stamp=person=>`<span class="invitation-stamp" data-invitation-part="stamp" aria-hidden="true">${portrait(person)}</span>`;
const stageLabel=stage=>({deferred:'稍后赴约',active:'已赴约',paused:'已赴约',ended:'已结束'})[stage]||'';

export function invitationEnvelope(data){
 const label=stageLabel(data.stage);
 return `<button type="button" class="invitation-envelope" data-invitation-skin="stationery" data-invitation-view="closed" data-invitation-part="envelope" data-invitation-action="open" ${attrs(data)} aria-haspopup="dialog" aria-label="打开来自${escape(data.sender.name)}的邀请函${label?'，'+label:''}"><span class="invitation-fold" data-invitation-part="fold" aria-hidden="true"></span><span class="invitation-flap" data-invitation-part="flap" aria-hidden="true"></span><span class="invitation-caption" data-invitation-part="caption">Invitation</span><span class="invitation-addressee" data-invitation-part="recipient">To ${escape(data.recipient.name)}</span>${stamp(data.sender)}<span class="invitation-seal" data-invitation-part="seal" aria-hidden="true">${icon('moon-star')}</span><span class="invitation-brand" data-invitation-part="brand">moom${label?`<small data-invitation-part="stage">${label}</small>`:''}</span><span class="invitation-signature" data-invitation-part="signature">From ${escape(data.sender.name)}</span></button>`;
}

export function invitationLetter(data){
 const pending=['invited','deferred'].includes(data.stage);
 const acceptLabel=pending?'接受邀请':data.stage==='ended'?'重读这一幕':'进入这一幕';
 return `<div class="invitation-scene" data-invitation-view="open"><div class="invitation-open-envelope" data-invitation-part="envelope"><span class="invitation-back-flap" data-invitation-part="flap" aria-hidden="true"></span><article class="invitation-letter" data-invitation-part="letter"><span class="invitation-letter-brand" data-invitation-part="brand">moom</span>${stamp(data.sender)}<h2 class="invitation-letter-caption" data-invitation-part="caption">Invitation</h2><h3 data-invitation-part="title">${escape(data.title)}</h3><p data-invitation-part="message">${escape(data.message||'留一点时间，一起走进新的一幕。')}</p><div class="invitation-people" data-invitation-part="people"><span>${portrait(data.sender)}<strong>${escape(data.sender.name)}</strong></span><i aria-hidden="true">&amp;</i><span>${portrait(data.recipient)}<strong>${escape(data.recipient.name)}</strong></span></div><dl class="invitation-details"><div data-invitation-part="time"><dt>邀约时间</dt><dd>${escape(data.when||'时间待定')}</dd></div><div data-invitation-part="place"><dt>地点</dt><dd>${escape(data.place||'地点待定')}</dd></div></dl><p class="invitation-letter-signature" data-invitation-part="signature">From ${escape(data.sender.name)}</p></article><span class="invitation-pocket" data-invitation-part="pocket" aria-hidden="true"></span></div><div class="invitation-actions" data-invitation-part="actions"><button type="button" data-invitation-action="wait" data-invitation-part="wait" aria-label="${pending?'暂缓这份邀请':'关闭邀请函'}">wait</button><button type="button" data-invitation-action="accept" data-invitation-part="accept" aria-label="${acceptLabel}">Readily</button></div><p class="invitation-error" data-invitation-part="error" role="alert" hidden></p>${!pending?`<p class="invitation-stage" data-invitation-part="stage">${data.stage==='ended'?'这一幕已结束，可重读记录。':'这份邀请已接受，可回到这一幕。'}</p>`:''}</div>`;
}
