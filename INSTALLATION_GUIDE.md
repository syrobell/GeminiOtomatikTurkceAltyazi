# Antigravity Subs Generator - Kurulum Kılavuzu

Adobe Premiere Pro için AI destekli altyazı oluşturma eklentisi.

## 📦 Kolay Kurulum (Önerilen)

### Adım 1: ZXP Installer İndirin

**ZXP Installer**, Adobe extension'larını kolayca yüklemek için ücretsiz bir araçtır.

1. [ZXP Installer'ı buradan indirin](https://aescripts.com/learn/zxp-installer/)
2. İndirdiğiniz dosyayı çalıştırın ve kurulumu tamamlayın

### Adım 2: Extension'ı Yükleyin

1. `Antigravity-Subs-Generator-v1.0.0.zxp` dosyasını bulun
2. Dosyayı **ZXP Installer** penceresine sürükleyip bırakın
3. Kurulum otomatik olarak tamamlanacaktır

### Adım 3: Premiere Pro'da Açın

1. **Adobe Premiere Pro**'yu açın (zaten açıksa yeniden başlatın)
2. Menüden: **Window** → **Extensions** → **Antigravity Subs Generator**
3. Panel açılacak ve kullanıma hazır olacaktır

## 🚀 İlk Kullanım

### API Key Ayarı

1. [Google AI Studio](https://aistudio.google.com/app/apikey)'dan **ücretsiz** Gemini API key alın
2. Extension panelindeki **API Key** alanına yapıştırın
3. **"Fetch Models"** düğmesine tıklayın
4. Model listesinden birine seçin (Önerilen: **Gemini Flash 2.5**)

### Altyazı Oluşturma

1. Premiere Pro'da bir sequence açın
2. Extension panelinde ayarlarınızı yapın:
   - **Max Words Per Line**: Satır başına kelime sayısı (varsayılan: 5)
   - **Active Audio Tracks**: Hangi ses kanallarını işlemek istediğinizi seçin
   - **Work Area Only**: Sadece belirlediğiniz zaman aralığını işler
   - **Fill Gaps**: Sessiz kısımlarda altyazının ekranda kalmasını sağlar
   - **Token Saver**: API kullanımını azaltır (1.5x önerilir)

3. **"Generate Subtitles"** düğmesine tıklayın
4. Altyazılar otomatik olarak projenize eklenecektir

## 🔧 Ek Özellikler

### SRT Export
- Altyazılar oluşturulduktan sonra **"Export SRT"** düğmesine tıklayın
- SRT dosyası proje klasörünüze kaydedilir

### AI İçerik Asistanı
- Altyazılardan sosyal medya içeriği oluşturmak için **🪄** düğmesine tıklayın
- Video hakkında bilgi verin ve ne tür içerik istediğinizi yazın
- AI sizin için başlık, açıklama ve hashtag oluşturacaktır

## ❓ Sorun Giderme

### Extension Görünmüyor
- Premiere Pro'yu **tamamen kapatıp** yeniden açın
- ZXP Installer'da kurulumun başarılı olduğunu kontrol edin

### API Hatası
- API Key'in doğru girildiğinden emin olun
- İnternet bağlantınızı kontrol edin
- [Google AI Studio](https://aistudio.google.com/app/apikey)'da API limitlerini kontrol edin

### Ses Dosyası Oluşturulamıyor
- Aktif bir sequence'ın açık olduğundan emin olun
- Ses kanallarında içerik olduğunu kontrol edin
- Premiere Pro projesini kaydedin

## 📝 Geliştirici Modu (Geliştiriciler İçin)

Eğer geliştirme yapıyorsanız veya extension'ı manuel olarak kurmak istiyorsanız:

### Manuel Kurulum

1. Extension dosyalarını kopyalayın:
   - **Windows**: `C:\Users\[KullanıcıAdı]\AppData\Roaming\Adobe\CEP\extensions\`
   - **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/`

2. Debug mode'u etkinleştirin:
   - **Windows**: Registry Editor'da `HKEY_CURRENT_USER\Software\Adobe\CSXS.9` altına `PlayerDebugMode` = `1` ekleyin
   - **macOS**: Terminal'de `defaults write com.adobe.CSXS.9 PlayerDebugMode 1` çalıştırın

3. Premiere Pro'yu yeniden başlatın

### Build ZXP Paketi

Yeni bir ZXP paketi oluşturmak için:

```bash
npm run build:zxp
```

Paket `dist/` klasörüne kaydedilecektir.

## 🤝 Destek

Sorularınız için iletişime geçebilirsiniz.

---

**Antigravity Subs Generator** - Dedeoğlu Medya için geliştirilmiştir ❤️
