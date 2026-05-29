# Samet Kaşmer — Portfolyo

Bilgisayar Programcısı & Sistem Geliştirici (Layellie) için tek sayfalık,
premium hisli kişisel portfolyo. **React + Vite + Tailwind CSS v4 + Framer
Motion + Lucide React** ile geliştirildi.

## Özellikler

- Devasa, modern tipografi ve bolca beyaz alan (Webflow tarzı estetik)
- Yüksek kontrastlı, monokrom **dark mode** + ince akıl yeşili aksan
- Scroll ile **fade-in-up** animasyonları, kayan şerit ve zarif hover efektleri
- Asimetrik / **bento-box** yetenek gridi
- Gerçek mock arayüzler içeren devasa proje kartları
- Sabit navigasyon, mobil menü ve scroll ilerleme çubuğu
- Tüm içerik tek bir `DATA` nesnesinde — kolayca güncellenebilir

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
```

Üretim derlemesi:

```bash
npm run build
npm run preview
```

## Yayınlama (GitHub Pages)

Site GitHub Pages'te `https://layellie.github.io/` adresinde yayınlanır.
Kaynak kod `main` dalında, derlenmiş site `gh-pages` dalında tutulur.

Değişiklik sonrası tek komutla yeniden yayınla:

```bash
npm run deploy   # build alır + gh-pages dalına gönderir
```

> Domain bağladıktan sonra `index.html` içindeki `og:url`, `og:image`,
> `twitter:image` ve `canonical` adreslerini gerçek domaininle değiştir.

## İçeriği güncelleme

Tüm kişisel bilgiler, yetenekler ve projeler `src/App.jsx` dosyasının en
üstündeki **`DATA`** nesnesinde tutulur. Yeni bir proje eklemek için
`DATA.projects` dizisine bir nesne ekleyin; özel bir görsel istiyorsanız
`VISUALS` eşlemesine `id` ile bir bileşen bağlayabilirsiniz.

## Teknolojiler

| Katman      | Teknoloji                  |
| ----------- | -------------------------- |
| Çatı        | React 18 + Vite            |
| Stil        | Tailwind CSS v4            |
| Animasyon   | Framer Motion              |
| İkonlar     | Lucide React               |
| Fontlar     | Clash Display, General Sans (Fontshare) |
