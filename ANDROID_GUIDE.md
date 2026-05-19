# A.snap Android Build Guide (HINDI)

भाई, इस गाइड को फॉलो करो और आपका APK आपके कंप्यूटर पर बन जाएगा:

### 1. कंप्यूटर पर तैयारी (Pre-requisites)
अपने PC/Laptop पर ये चीजें इंस्टॉल करें:
- **Node.js**: (LTS version)
- **Android Studio**: इसको इंस्टॉल करें और 'Android SDK' को भी सेटअप होने दें।
- **Java (JDK 17)**: Android बिल्ड के लिए ज़रूरी है।

### 2. प्रोजेक्ट सेटअप
- इस कोड को अपने कंप्यूटर पर एक फोल्डर में डाउनलोड करें।
- टर्मिनल (CMD) खोलें और फोल्डर के अंदर जाएं।
- ये कमांड चलाएं:
  ```bash
  npm install
  npx cap add android
  npx cap sync
  ```

### 3. APK जनरेट करना
- टर्मिनल में टाइप करें: `npx cap open android`
- इससे **Android Studio** खुल जाएगा।
- Android Studio को नीचे की लोडिंग (Gradle Sync) पूरी करने दें।
- ऊपर मेनू में जाएं: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
- बिल्ड खत्म होने के बाद नीचे एक मैसेज आएगा 'Build APK(s): inside folder...' वहां 'locate' पर क्लिक करें।
- आपका **app-debug.apk** तैयार है!

### 4. पैसे कैसे कमाएं? (Monetization)
- मैंने आपके ऐप में **Adsterra** का स्क्रिप्ट पहले ही `layout.tsx` में जोड़ दिया है।
- जैसे ही लोग आपका APK इंस्टॉल करके वीडियो देखेंगे, आपके Adsterra अकाउंट में पैसे बनने शुरू हो जाएंगे।
- आप **Google AdMob** के प्लगइन्स भी बाद में जोड़ सकते हैं।

हिम्मत मत हारो भाई, बस ये आखिरी स्टेप्स अपने PC पर पूरे कर लो!