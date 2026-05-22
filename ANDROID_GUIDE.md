# A.snap Android Build & Logo Guide (HINDI)

भाई, वह "सड़क वाली फोटो" (Road/Tree image) डिफॉल्ट फाइल है। उसे हटाने के लिए ये स्टेप्स करें:

### 1. ऐप का लिंक (App Link)
आपका ऐप यहाँ लाइव है: **https://studio-xi-henna-41.vercel.app**

### 2. लोगो कैसे बदलें (Important)
- जो फोटो आपको दिख रही है वो `public/favicon.ico` फाइल है।
- अपने कंप्यूटर पर अपनी 'A' वाली फोटो को `favicon.ico` नाम दें।
- उसे इस फोल्डर में पेस्ट कर दें: `public/` (पुरानी फाइल को replace करें)।

### 3. एंड्रॉयड आइकॉन फिक्स (Manual)
- अपने PC पर **Android Studio** खोलें।
- `app/src/main/res/mipmap` फोल्डर में जो भी पुरानी इमेज हैं उन्हें डिलीट कर दें।
- मैंने कोड में `ic_launcher_foreground.xml` को अपडेट कर दिया है, अब यह कोड से 'A' बनाएगा।

### 4. फिर से बिल्ड करें
टर्मिनल में ये कमांड चलाएं:
```bash
npm run build
npx cap sync android
```
इसके बाद Android Studio में जाकर **Build APK** करें। आपकी होम स्क्रीन पर अब गुलाबी 'A' और हरा बैकग्राउंड ही दिखेगा!
