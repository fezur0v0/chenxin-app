// Page IDs are also desktop IDs. Keep them stable for saved layouts/backups.
export const APPS = [
 {id:'app-diary',name:'日记',icon:'diary',subtitle:'把普通的日子，慢慢记下来。'},
 {id:'app-music',name:'音乐',icon:'music',subtitle:'留一点旋律，陪着日常。'},
 {id:'app-gallery',name:'图库',icon:'gallery',subtitle:'喜欢的画面，放在这里。'},
 {id:'app-presets',name:'预设',icon:'presets',subtitle:'保存你喜欢的相处方式。'},
 {id:'app-worldbook',name:'世界书',icon:'worldbook',subtitle:'一起构建，属于你们的世界。'},
 {id:'app-archives',name:'档案',icon:'archives',subtitle:'关于你，也关于陪伴你的 TA。'},
 {id:'app-appearance',name:'外观',icon:'appearance',subtitle:'让这个小世界，更像你。'}
];
export const APP_TYPES = APPS.map(app=>app.id);
export const findApp = id => APPS.find(app=>app.id===id);
