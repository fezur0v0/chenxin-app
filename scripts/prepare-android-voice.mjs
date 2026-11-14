import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Run explicitly before rebuilding the local APK. Keep Android Studio's
// machine-generated project out of frontend commits.
const manifest=fileURLToPath(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url));
let xml;
try{xml=await readFile(manifest,'utf8');}
catch{throw new Error('未找到本机 Android 工程，请先在项目中创建或恢复 android 文件夹。');}
if(!/<manifest\b[^>]*xmlns:android=["']http:\/\/schemas\.android\.com\/apk\/res\/android["']/.test(xml)||!/<\/manifest\s*>/.test(xml))throw new Error('AndroidManifest.xml 格式无法识别，未修改文件。');
if(/<uses-permission\b[^>]*android:name\s*=\s*["']android\.permission\.RECORD_AUDIO["']/.test(xml)){
 console.log('麦克风权限已声明，可继续同步并重新打包。');
}else{
 xml=xml.replace(/<\/manifest\s*>/,'    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>');
 await writeFile(manifest,xml,'utf8');
 console.log('已补充麦克风权限声明。请 cap sync android 并重新安装 APK，首次录音时允许麦克风。');
}
