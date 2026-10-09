# E-Okul Öğretmen + YBS (demo)

Bu ZIP, öğretmen paneli ile YBS yönetim panelini aynı uygulamada içerir. React + Vite ve Firebase Authentication / Cloud Firestore kullanır. Öğrenci isimleri ve okul numaraları demo amaçlı, kurgusal verilerdir. Bu proje resmi MEB E-Okul sistemiyle entegre değildir.

## 1. Firebase hazırlığı

1. Firebase Console'da `ambul-b4bd0` projesini açın.
2. **Authentication → Sign-in method** bölümünde **Email/Password** sağlayıcısını etkinleştirin.
3. Firestore Database'i oluşturun.
4. `.env.example` dosyasını `.env` adıyla kopyalayın ve `VITE_FIREBASE_API_KEY` alanına kendi Firebase Web uygulaması config'indeki `apiKey` değerini yapıştırın. Diğer proje bilgileri `src/firebase.js` içinde `ambul-b4bd0` için ayarlanmıştır.
5. Firebase CLI ile doğru projeyi seçip kuralları ve indeksleri yayınlayın:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   # ambul-b4bd0 projesini seçin
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   `firestore.rules` dosyası erişim yetkilerini; `firestore.indexes.json` dosyası gerekli sorgu indekslerini tanımlar. Kuralları yayınlamadan gerçek öğrenci verisi kullanmayın.

## 2. İlk YBS hesabı ve kullanıcı profilleri

Hesaplar Firebase Console → Authentication → Users bölümünden yönetici tarafından oluşturulur. Ardından Firestore'da `users` koleksiyonuna **belge kimliği olarak Authentication UID** kullanılacak şekilde aşağıdaki profillerden birini ekleyin. Bu profil belgeleri uygulama içinden oluşturulamaz/değiştirilemez; rol yükseltmesini engellemek için yönetici tarafından eklenir.

**YBS hesabı** — örnek `users/{YBS_UID}` belgesi:

```json
{
  "role": "ybs",
  "displayName": "Okul Yönetimi",
  "email": "ybs@okul.edu.tr"
}
```

**Öğretmen hesabı** — örnek `users/{OGRETMEN_UID}` belgesi:

```json
{
  "role": "teacher",
  "displayName": "Mahmut Yücel Durmuş",
  "subject": "Türkçe",
  "email": "mahmut@okul.edu.tr"
}
```

**Veli hesabı** — VBS ZIP'ini de aynı Firebase projesine bağlayın ve `users/{VELI_UID}` belgesini oluşturun:

```json
{
  "role": "vbs",
  "displayName": "Demo Veli",
  "email": "veli@ornek.com"
}
```

E-postaları ve UID değerlerini kendi Authentication hesaplarınıza göre değiştirin. `role` sadece `ybs`, `teacher` veya `vbs` olabilir. İlk YBS profili Firestore Console'dan oluşturulmalıdır; YBS profili oluşturulmadan panel öğrenci verisi ekleyemez.

## 3. Çalıştırma

```bash
npm install
npm run dev
```

Vite'ın gösterdiği yerel adresi açın. Giriş işlemi Firebase Authentication ile yapılır; uygulamada herkese açık kayıt formu bulunmaz.

## 4. İş akışı

- YBS → **Genel Bakış → Demo öğrencileri oluştur**: 5, 6, 7 ve 8. sınıfların A–M şubelerine 18'er kurgusal öğrenci ekler (toplam 936).
- Öğretmen → **Devamsızlık Gir**: tarih, sınıf, şube ve 1–8. ders seçilir. Tüm öğrenciler varsayılan olarak **Var** gelir. Öğretmen “Yok olarak işaretle” seçip yoklamayı kaydeder.
- Yoklama, aynı tarih/sınıf/şube/ders birleşimi için tek bir kayıttır. Kaydedildikten sonra öğretmen de YBS de ham yoklamayı güncelleyemez veya silemez.
- YBS → **Devamsızlık Yönetimi**: yok olan öğrenciler için **Özürlü / Özürsüz** kararı ve açıklama kaydedilir. Bu karar ayrı belgede saklanır ve VBS'de görünür.
- Öğretmen → **Not İşlemleri**: sınıf/şube, 1–3. dönem, sınav/sözlü ve 1–5. değerlendirme seçilir. Girilen puanlar 0–100 aralığındadır; aynı değerlendirme daha sonra düzenlenebilir.
- YBS → **Öğrenci / Veli Bağla**: Firebase Authentication'daki veli hesabının UID'sini ilgili öğrenciye bağlayın. VBS, bağlı öğrenci belgelerinin alt koleksiyonlarını canlı dinler.

## 5. Firestore veri yapısı

- `users/{uid}` — yönetici tarafından atanan rol ve profil.
- `students/{studentId}` — öğrenci, okul numarası, sınıf/şube ve `parentUid` bağlantısı.
- `attendanceSessions/{sessionId}` — öğretmenin gönderdiği değiştirilemez yoklama oturumu.
- `students/{studentId}/attendance/{sessionId}` — öğrenciye özel, değiştirilemez var/yok kaydı.
- `students/{studentId}/attendanceReasons/{sessionId}` — YBS'nin özürlü/özürsüz kararı.
- `students/{studentId}/grades/{gradeId}` — düzenlenebilir sınav/sözlü puanı.

## Güvenlik notları

Firebase Web `apiKey` istemci uygulamalarında kullanılır; tek başına veri yetkilendirmesi değildir. Erişimi Firestore Security Rules ve Authentication belirler. Kurallar öğretmenlerin yalnız kendi notlarını yazmasına, veli hesabının yalnız bağlandığı öğrenciyi görmesine ve yoklama belgelerinin değiştirilememesine göre hazırlanmıştır. Yayına almadan önce Firebase Rules Playground / Emulator Suite ile kendi projenizde test edin ve öğrenci verilerini yalnızca yetkili hesaplarda kullanın.
