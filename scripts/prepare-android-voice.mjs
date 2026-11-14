import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Run explicitly before rebuilding the local APK. Keep Android Studio's
// machine-generated project out of frontend commits.
export function prepareVoiceManifest(xml){
 // Keep offsets stable, but do not mistake commented-out permissions for grants.
 const active=xml.replace(/<!--[\s\S]*?-->/g,comment=>' '.repeat(comment.length));
 const closing=/<\/manifest\s*>/.exec(active);
 if(!/<manifest\b[^>]*xmlns:android=["']http:\/\/schemas\.android\.com\/apk\/res\/android["']/.test(active)||!closing)throw new Error('AndroidManifest.xml 格式无法识别，未修改文件。');
 // Capacitor 8's WebChromeClient requests both when WebView captures audio.
 const added=['RECORD_AUDIO','MODIFY_AUDIO_SETTINGS'].filter(name=>!new RegExp(`<uses-permission(?:-sdk-23)?\\b[^>]*android:name\\s*=\\s*["']android\\.permission\\.${name}["']`).test(active));
 const declarations=added.map(name=>`    <uses-permission android:name="android.permission.${name}" />\n`).join('');
 return {xml:xml.slice(0,closing.index)+declarations+xml.slice(closing.index),added};
}
async function main(){
 const manifest=fileURLToPath(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url));
 let xml;
 try{xml=await readFile(manifest,'utf8');}
 catch{throw new Error('未找到本机 Android 工程，请先在项目中创建或恢复 android 文件夹。');}
 const result=prepareVoiceManifest(xml);
 if(result.added.length){
  await writeFile(manifest,result.xml,'utf8');
  console.log(`已补充音频权限：${result.added.join('、')}。`);
 }else console.log('WebView 录音所需的两项音频权限均已声明。');
 console.log('请 cap sync android 并重新安装 APK；只同步网页不会更新 Android 权限。');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
