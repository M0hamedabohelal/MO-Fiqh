import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAjrviU8gJ0mGrJKN9oD_8b-o9eBvcikY8',
  authDomain: 'fiqh-app-9f98c.firebaseapp.com',
  projectId: 'fiqh-app-9f98c',
  storageBucket: 'fiqh-app-9f98c.firebasestorage.app',
  messagingSenderId: '726782247777',
  appId: '1:726782247777:web:db957f096a0e984c56fb20'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newTerms = {
  'الاستجمار': 'تطهير موضع خروج النجاسة ومسحه بمادة جامدة طاهرة (كالحجارة أو المناديل) دون استخدام الماء.',
  'مُنْقٍ': 'الشيء المُنظِّف الذي يقلع أثر النجاسة تماماً ويُنقّي الموضع.',
  'إداوة': 'إناء صغير مصنوع من الجلد يُحمل فيه الماء للطهارة والشرب.',
  'عَنَزَة': 'عصا قصيرة تشبه العُكاز في طرفها حديدة مدببة، كان النبي ﷺ يغرزها في الأرض أمامه كـ \"سترة\" أثناء الصلاة في الفضاء.',
  'فليستطب': 'فليتطهّر ويستجمر بالحجارة لإزالة الخبث وطيب الموضع.',
  'رَجِيع': 'رَوث الحيوانات وفضلاتها الجافة.',
  'استدبار': 'جعل الشيء خلف الظهر (عكس الاستقبال والمواجهة).',
  'الملاعن': 'الأفعال أو الأماكن التي إذا فعل فيها الإنسان سوءاً تسببت في جلب لعنة الناس وغضبهم عليه (مثل تلويث الظلال وموارد المياه).',
  'قارعة الطريق': 'ممر الناس الرئيسي ووسط الطريق المسلوك.',
  'المُتَخَلِّي / يَتَخَلّى': 'الشخص الذي ينفرد بنفسه في خلوة لقضاء حاجته من بول أو غائط.',
  'البَراز': 'في الأصل هو المكان الفضاء الواسع الخالي من الناس، واستُعير للتعبير عن قضاء الحاجة.',
  'الجُحْر': 'الشق أو الحفرة في الأرض أو الجدران والتي تتخذها الهوام والحشرات مأوى لها.',
  'يَشُوصُ فاه': 'يَدلك أسنانه بالسواك ويُنظف فمه بعناية وبحركة عرضية أو طولية لإزالة ما علق به.'
};

async function upload() {
  for (const [term, definition] of Object.entries(newTerms)) {
    console.log('Uploading ' + term + '...');
    await setDoc(doc(db, 'glossary', term), { definition });
  }
  console.log('Done!');
  process.exit(0);
}

upload().catch(console.error);
