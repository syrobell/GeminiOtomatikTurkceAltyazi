# Antigravity Subs Generator

Adobe Premiere Pro için geliştirilmiş, Google Gemini AI kullanan otomatik altyazı oluşturma eklentisi.

## 🎯 Özellikler

- **AI Destekli Altyazı Oluşturma**: Google Gemini API'sini kullanarak videolarınızdan otomatik altyazı üretir
- **Çoklu Gemini Model Desteği**: Gemini Flash, Gemini Pro gibi farklı modeller arasından seçim yapabilme
- **Esnek Ses İşleme**: Birden fazla ses kanalını seçerek işleme alabilme
- **Work Area Desteği**: Sadece belirlediğiniz zaman aralığı için altyazı oluşturma
- **Token Tasarrufu**: Ses hızlandırma ile Gemini API maliyetlerini düşürme (opsiyonel)
- **Boşluk Doldurma**: Sessiz kısımlarda altyazının ekranda kalmasını sağlama
- **SRT Export**: Oluşturulan altyazıları SRT formatında dışa aktarma
- **AI İçerik Asistanı**: Altyazıları kullanarak sosyal medya için otomatik içerik oluşturma

## 📋 Gereksinimler

- **Adobe Premiere Pro**: Versiyon 14.0 veya üzeri (CC 2020+)
- **Google Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden ücretsiz alabilirsiniz
- **İşletim Sistemi**: Windows veya macOS

## 🚀 Kurulum

### Kolay Kurulum (Önerilen) 🎯

**ZXP kurulum paketi kullanarak** tek tıkla kurulum yapabilirsiniz!

#### 1. ZXP Installer İndirin

[ZXP Installer'ı buradan ücretsiz indirin](https://aescripts.com/learn/zxp-installer/)

#### 2. Extension'ı Yükleyin

1. `dist/Antigravity-Subs-Generator-v1.0.0.zxp` dosyasını **ZXP Installer** penceresine sürükleyip bırakın
2. Kurulum otomatik olarak tamamlanacaktır

#### 3. Premiere Pro'da Açın

1. Adobe Premiere Pro'yu açın (zaten açıksa yeniden başlatın)
2. Menüden: **Window** → **Extensions** → **Antigravity Subs Generator**
3. Panel açılmalı ve kullanıma hazır olmalıdır

> ✅ **Avantaj**: Developer mode'a gerek yok - hemen kullanmaya başlayabilirsiniz!

Detaylı kurulum kılavuzu için: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)

### Manuel Kurulum (Geliştiriciler İçin)

<details>
<summary>Geliştirme yapmak veya kaynak koddan kurmak için tıklayın</summary>

#### 1. Eklenti Dosyalarını Kopyalama

Eklentiyi Adobe Premiere Pro'nun CEP extensions klasörüne kopyalayın:

**Windows:**
```
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions
```

**macOS:**
```
~/Library/Application Support/Adobe/CEP/extensions/
```

#### 2. Debug Mode Etkinleştirme

**Windows:**
1. Windows tuşu + R → `regedit`
2. `HKEY_CURRENT_USER\Software\Adobe\CSXS.9` yoluna gidin (Premiere sürümünüze göre CSXS.9, 10 veya 11)
3. Yeni → String Value → `PlayerDebugMode` = `1`

**macOS:**
```bash
defaults write com.adobe.CSXS.9 PlayerDebugMode 1
```

#### 3. Eklentiyi Açma

1. Premiere Pro'yu açın
2. Menüden: **Window** → **Extensions** → **Antigravity Subs Generator**
3. Panel açılmalı ve kullanıma hazır olmalıdır

## ⚙️ Kullanım

### İlk Kurulum

1. **API Key Girişi**: 
   - Gemini API Key alanına [Google AI Studio](https://aistudio.google.com/app/apikey)'dan aldığınız API anahtarınızı girin
   
2. **Model Seçimi**:
   - "Fetch Models" düğmesine tıklayarak kullanılabilir modelleri getirin
   - Açılan listeden kullanmak istediğiniz modeli seçin (Önerilen: Gemini Flash 2.5)

### Altyazı Oluşturma

1. Premiere Pro'da bir sequence açın
2. Eklenti panelinde ayarlarınızı yapın:
   - **Max Words Per Line**: Satır başına maksimum kelime sayısı (varsayılan: 5)
   - **Active Audio Tracks**: Hangi ses kanallarının işleneceğini seçin
   - **Work Area Only**: Sadece belirlediğiniz alan için işlem yapmak isterseniz işaretleyin
   - **Fill Gaps**: Sessiz kısımlarda altyazının ekranda kalmasını isterseniz işaretleyin
   - **Token Saver**: API kullanımını azaltmak için ses hızlandırma isterseniz seçin

3. **"Generate Subtitles"** düğmesine tıklayın
4. İşlem tamamlandığında altyazılar otomatik olarak Premiere Pro projenize aktarılacaktır

### SRT Dışa Aktarma

1. Altyazılar oluşturulduktan sonra **"Export SRT"** düğmesi aktif olacaktır
2. Düğmeye tıklayın
3. SRT dosyası otomatik olarak proje klasörünüze kaydedilecektir

### AI İçerik Asistanı

1. Altyazılar oluşturulduktan sonra **🪄** (sihirli değnek) düğmesine tıklayın
2. Açılan pencerede:
   - **Video Context**: Video hakkında bilgi girin (kim, konu, platform)
   - **Your Request**: Ne tür içerik istediğinizi yazın (örn: "başlık, açıklama ve hashtag oluştur")
3. **"Generate Content"** düğmesine tıklayın
4. Oluşturulan içeriği kopyalayabilir ve sosyal medyada kullanabilirsiniz

## 🔧 Ayarlar

### Token Saver (Ses Hızlandırma)

Gemini API token kullanımını azaltmak için ses dosyasını hızlandırır:

- **1.0x (Off)**: Normal hız, hiç hızlandırma yok
- **1.5x (Safe)**: %33 token tasarrufu, önerilen
- **1.75x (Testing)**: Test amaçlı
- **2.0x (Aggressive)**: %50 token tasarrufu, agresif

> ⚠️ Not: Zaman damgaları otomatik olarak düzeltilir, çıktı doğru zamanlarda olur

### Ses Kanalları

A1, A2, A3, A4 kanallarından hangilerinin işleneceğini seçebilirsiniz. İşaretli olmayan kanallar sessiz alınır.

## ❓ Sorun Giderme

### Eklenti Görünmüyor

1. Debug mode ayarının doğru yapıldığından emin olun
2. Dosyaların doğru konuma kopyalandığını kontrol edin
3. Premiere Pro'yu tamamen kapatıp yeniden açın
4. CSXS sürüm numarasını kontrol edin (9, 10 veya 11)

### API Hatası

- API Key'in doğru girildiğinden emin olun
- İnternet bağlantınızı kontrol edin
- Google AI Studio'da API limitlerini kontrol edin

### Ses Dosyası Oluşturulamıyor

- Aktif bir sequence'ın açık olduğundan emin olun
- Ses kanallarının dolu olduğunu kontrol edin
- Premiere Pro projesinin kaydedilmiş olduğundan emin olun

### Altyazı İçe Aktarılamıyor

- SRT dosyasının oluşturulduğunu kontrol edin
- Premiere Pro projesinin kaydedilmiş olduğundan emin olun
- Dosya yolunda Türkçe karakter olup olmadığını kontrol edin

</details>

## 🛠️ Geliştirme

### ZXP Paketi Oluşturma

Yeni bir kurulum paketi oluşturmak için:

```bash
npm install
npm run build:zxp
```

Paket `dist/` klasöründe oluşturulacaktır.

## 📝 Lisans

MIT License

## 🤝 Destek

Sorularınız veya önerileriniz için iletişime geçebilirsiniz.

---

**Antigravity Subs Generator** - Dedeoğlu Medya - Adnan Dedeoğlu için geliştirilmiştir ❤️
