export function diary() {
 const today=new Date();
 return `<section class="diary-paper app-panel glass"><time datetime="${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}"><strong>${String(today.getDate()).padStart(2,'0')}</strong><span>${today.toLocaleDateString('zh-CN',{year:'numeric',month:'long',weekday:'long'})}</span></time><div class="diary-lines"><h2>把今天留在这里。</h2><p>一件小事，一点心情，<br>都值得被记住。</p></div></section><p class="app-status">日记首页已准备好，独立日记编辑将在后续添加。</p><button class="app-link" data-action="chat">先去对话，说说今天</button>`;
}
