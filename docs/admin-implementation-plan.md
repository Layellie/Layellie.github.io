# Güvenli Portföy Yönetim Paneli ve Modüler Proje Görseli Sistemi

## Özet

- Herkese açık portföy GitHub Pages üzerinde kalacak; mevcut tasarım, animasyonlar, SEO, terminal, GitHub istatistikleri ve responsive davranış korunacak.
- Yönetim paneli Cloudflare Worker Static Assets üzerinden API ile aynı origin’de yayınlanacak.
- Kimlik doğrulama için tek depoya kurulmuş bir GitHub App’in OAuth web akışı kullanılacak. Yalnızca `Layellie` kullanıcı adı ve yapılandırılmış sabit GitHub kullanıcı ID’si kabul edilecek.
- Yönetilebilir içerikler sürümlü ve Zod ile doğrulanan JSON dosyalarına taşınacak. Güncellemeler Worker üzerinden `main` dalına tek atomik commit olarak yazılacak.
- Session ve OAuth state için KV kullanılmayacak. Anında logout/replay koruması gerektiğinden Workers Free kapsamındaki, güçlü tutarlılığa sahip SQLite Durable Object kullanılacak.
- Uygulama, açık onaydan sonra aşamalı geliştirilecek; push, GitHub deployment veya Cloudflare deployment otomatik yapılmayacak.

## 1. Mevcut Mimari Analizi

- Depo React 18.3, Vite 6, Tailwind CSS 4, Framer Motion 11 ve Lucide React kullanan tek sayfalı bir uygulama. Kaynak kodun büyük bölümü yaklaşık 101 KB ve 2.840 satırlık `src/App.jsx` dosyasında.
- `CONTENT` iki bağımsız `tr`/`en` ağacından oluşuyor. Ortak alanlar iki tarafta elle tekrarlanıyor. Güncel içerikte ortak alan uyuşmazlığı bulunmasa da panel tabanlı düzenleme için bu yapı kırılgan.
- Mevcut yönetilebilir içerik:
  - 3 proje: `clipboard`, `standby`, `eyehealth`
  - 8 sertifika ve yaklaşık 645 KB boyutunda 8 mevcut PDF
  - 2 odak alanı, 7 ana yetenek kartı, 4 ek grup ve 14 ek yetenek
  - 3 sabit React proje görseli: `ClipboardMock`, `TimerMock`, `EyeHealthMock`
- Proje görseli seçimi `VISUALS[project.id]` eşlemesiyle yapılıyor. Görsel bulunamadığında alan sessizce boş kalıyor.
- Tema `src/index.css` içindeki koyu renk tokenları, General Sans/Clash Display fontları ve lime `#d6ff3f` vurgusuna dayanıyor.
- Responsive yapı Tailwind `sm/md/lg` kırılımlarıyla kurulmuş; mobil navigasyon, sertifika carousel’i, iki sütunlu proje detayları ve mobil mock-up düzenleri mevcut.
- Animasyon sistemi Framer Motion `Reveal`, scroll progress, komut paleti geçişleri, sayaçlar, marquee ve meteor animasyonlarından oluşuyor. CSS tarafında `prefers-reduced-motion` desteği var.
- Terminal, komut paleti ve GitHub repo filtreleme kodu doğrudan `CONTENT` içindeki proje/yetenek/sertifika verilerine bağlı.
- GitHub Pages workflow’u `main` push’unda Node 22, `npm ci`, Vite build, Pages artifact ve deployment adımlarını çalıştırıyor. Son `main` deployment başarılı.
- Depo public ve GitHub Pages kullanıcı sitesi olduğu için Vite `base: "/"` davranışı doğru.
- Mevcut projede test, lint veya type-check komutu yok.
- Geçici dış klasöre alınan production build başarılı: yaklaşık 364 KB JS ve 39 KB CSS. Standart `npm run build`, kaynak koddan bağımsız olarak yerel `dist/index.html` kilidi nedeniyle `EPERM` verdi; uygulama aşamasında kilitleyen süreç güvenli biçimde belirlenmeli.
- Çalışma ağacında kullanıcıya ait `src/index.css` biçimlendirme değişikliği ile `.claude/` ve `dist_check/` izlenmeyen içerikleri bulunuyor. Bunlar korunacak ve kapsam dışı kabul edilecek.

## 2. Önerilen Son Mimari

```text
Cloudflare Worker origin
├── Admin SPA (Static Assets)
├── /auth/* ve /api/*
└── Durable Object: OAuth state + session + yayın kilidi
          │
          │ GitHub App user access token
          ▼
GitHub repository/main
├── Doğrulanmış JSON içerikleri
├── Sertifika PDF'leri
└── Proje ekran görüntüleri
          │
          │ push
          ▼
GitHub Actions ──► GitHub Pages portföyü
```

- Public site JSON içeriklerini build sırasında import edecek; GitHub Pages ziyaretçilerinin Worker’a ihtiyacı olmayacak.
- Admin CRUD işlemleri önce tarayıcı belleği ve IndexedDB taslağı üzerinde çalışacak. Worker yalnızca içerik okuma, doğrulama, kimlik doğrulama ve yayınlama sınırında devreye girecek.
- Public ve admin uygulamaları aynı renderer, şema, icon allowlist ve içerik dönüştürücülerini kullanacak; böylece admin önizlemesi gerçek proje kartıyla aynı olacak.
- Worker, framework eklemeden TypeScript, Web Crypto ve yerel `fetch` ile geliştirilecek. GitHub işlemleri için ağır bir SDK eklenmeyecek.

## 3. Admin Panelinin Yayınlanması

- Admin Vite SPA, `dist-admin` çıktısıyla Cloudflare Worker Static Assets üzerinden yayınlanacak.
- Public ve admin uygulamaları aynı design token kaynağını kullanacak. General Sans/Clash Display fontları, `#08080a` canvas, koyu surface/elevated renkleri, ince gri line, `#d6ff3f` accent, yuvarlak köşeler ve mevcut spacing karakteri iki ayrı tema olarak kopyalanmayacak.
- Admin shell, dashboard ve editörler hazır mavi/gri SaaS veya Bootstrap teması kullanmayacak; ilk bakışta Layellie portföyünün yönetim yüzeyi olduğu anlaşılacak.
- `run_worker_first` yalnızca `/auth/*` ve `/api/*` yollarında etkin olacak. Admin JS/CSS/font dosyaları Worker çalıştırmadan statik sunulacak.
- SPA fallback Static Assets yapılandırmasıyla sağlanacak.
- Production cookie, login callback ve API aynı Worker origin’inde olacağı için üçüncü taraf cookie kullanılmayacak.
- GitHub Pages üzerindeki `/admin/`, `VITE_ADMIN_ORIGIN` tanımlıysa `location.replace` ile Worker adresine yönlendirecek. Değişken eksikse güvenli bir “Admin henüz yapılandırılmadı” sayfası gösterecek.
- Admin sayfalarında `noindex`, `nofollow` ve `X-Robots-Tag` kullanılacak.

## 4. GitHub Pages–Worker İlişkisi

- Public site Worker’a proxy edilmeyecek ve mevcut Pages adresi değişmeyecek.
- Admin’in gönderdiği commit mevcut `push: main` workflow’unu tetikleyecek. GitHub, GitHub App/OAuth tokenıyla yapılan push’ların workflow tetiklemesine izin veriyor.
- Mevcut Pages workflow’u public build için Cloudflare secret veya hazır Worker deploymentına bağımlı hale getirilmeyecek. Admin ve Worker kontrolleri ayrı, secretsız bir doğrulama workflowunda tutulacak.
- Cloudflare deployment workflow’a bağlanmayacak. Worker deploy’u yalnızca belgelenmiş, kullanıcı tarafından çalıştırılan manuel komut olacak.
- Public `/admin/` yönlendirmesi dışında iki origin arasında cookie veya içerik aktarımı yapılmayacak.

## 5. Kimlik Doğrulama Akışı

1. Kullanıcı Worker origin’indeki `/auth/github` adresinden giriş başlatır.
2. Worker rastgele OAuth `state`, PKCE verifier/challenge ve 10 dakikalık tek kullanımlık transaction oluşturur.
3. Transaction Durable Object’te tutulur; tarayıcıya yalnızca `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` transaction cookie’si verilir.
4. GitHub App OAuth callback’inde cookie, state ve PKCE `S256` doğrulanır.
5. Worker alınan user access token ile `/user` çağrısı yapar:
   - `login`, case-insensitive olarak `Layellie` olmalı.
   - Kullanıcının değiştirilemeyen sayısal ID’si `GITHUB_ALLOWED_USER_ID` ile eşleşmeli.
   - Token, yapılandırılmış GitHub App installation ve `Layellie.github.io` deposuna erişebilmelidir.
6. Başka kullanıcıların tokenı hemen iptal edilir, session oluşturulmaz ve genel bir 403 mesajı döndürülür.
7. Yetkili token, `SESSION_SECRET` üzerinden HKDF-SHA-256 ile türetilmiş ayrı AES-GCM anahtarıyla şifrelenerek Durable Object session kaydında tutulur. Secret metni doğrudan AES anahtarı yapılmaz; sabit uygulama bağlamı ve sürümlü salt/info kullanılır.
8. Session süresi en fazla 8 saat ve GitHub token süresinden kısa olacak; refresh token tutulmayacak.
9. Logout, önce GitHub’daki tek tokenı iptal etmeyi dener, ardından sonucu ne olursa olsun Durable Object session kaydını siler ve cookie’yi temizler.
10. Frontend yalnızca `/api/session` sonucu `Layellie` ise paneli açar; tüm API endpoint’leri aynı kontrolü yeniden yapar.

GitHub App seçimi OAuth App’e göre daha dar depo kurulumu ve ince izinler sağlar. Kullanıcı tarafından başlatılan işlemler için GitHub user access token kullanılacağından `GITHUB_PRIVATE_KEY`, `GITHUB_APP_ID`, installation token ve PAT gerekmeyecek.

## 6. Ücretsiz Kalma Stratejisi

- Admin static assets ücretsiz statik istek olarak sunulacak; API çağrıları Workers Free sınırlarında kalacak.
- KV kullanılmayacak. Session, OAuth state, CSRF, kesin rate limit sayaçları ve publish kilidi SQLite Durable Object’te tutulacak.
- Cloudflare Rate Limiting binding’in Workers Free kullanılabilirliği implementasyon sırasında resmi belge ve gerçek `wrangler` dry-run ile doğrulanacak. Ücretli özellik/hesap ayarı gerektirirse binding tamamen kaldırılacak.
- Binding kullanılabilirse yalnız kaba kötüye kullanım koruması sağlayacak; güvenlik kararı veya kesin sayaç olarak kullanılmayacak.
- Durable Object kesin limitleri:
  - Login başlangıcı: istemci anahtarı başına 10 istek/dakika
  - Authenticated API: session başına 60 istek/dakika
  - Validate: session başına 10 istek/dakika
  - Publish: session başına 3 istek/dakika ve aynı anda yalnızca 1 yayın
- OAuth state tüketimi, session, CSRF doğrulaması, publish kilidi ve publish sınırı eventually consistent altyapıya dayanmayacak.
- GitHub status polling yapılmayacak. Son deployment yalnızca kullanıcı yenilediğinde, en erken 30 saniyelik aralıklarla okunacak.
- Bir yayında en fazla 24 değişmiş repo yolu, 5 MiB/dosya, 8 MiB toplam medya ve 1 MiB JSON kabul edilecek.
- Free kota veya platform limiti aşılırsa otomatik ücretli plana geçilmeyecek. API güvenli biçimde yazmayı reddedecek; admin açıklayıcı hata gösterecek.

## 7. Yeni Dosya ve Klasör Yapısı

```text
src/
├── App.jsx
├── content/
│   ├── site.json
│   ├── projects.json
│   ├── certificates.json
│   ├── skills.json
│   ├── visuals.json
│   ├── schemas.js
│   ├── migrations.js
│   └── loadContent.js
├── components/
│   ├── projects/
│   └── project-visuals/
│       ├── ProjectVisual.jsx
│       ├── MockupRenderer.jsx
│       ├── moduleRegistry.jsx
│       └── legacyVisuals.jsx
└── admin/
    ├── main.jsx
    ├── AdminApp.jsx
    ├── api/
    ├── draft/
    ├── editors/
    ├── publish/
    └── components/

admin/index.html

worker/
├── src/
│   ├── index.ts
│   ├── auth/
│   ├── github/
│   ├── security/
│   └── durable/AdminSessionStore.ts
├── wrangler.jsonc
└── tsconfig.json

public/
├── admin/index.html
└── media/
    ├── projects/
    └── certificates/

scripts/migrate-content.mjs
tests/{content,admin,renderer,worker,visual}/
docs/{admin-architecture.md,admin-setup.md}
```

- `vite.config.js` public siteyi, ayrı admin Vite config’i `dist-admin` çıktısını üretecek.
- `package.json` içine `dev:site`, `dev:admin`, `dev:worker`, `build:site`, `build:admin`, `build:worker`, `test`, `test:e2e`, `lint` ve `check` komutları eklenecek.
- Runtime bağımlılıkları Zod ve erişilebilir drag-and-drop için `@dnd-kit` ile sınırlı tutulacak.

## 8. JSON Veri Şeması

Bütün dosyalarda `schemaVersion: 1`, benzersiz slug ID’leri ve array sırası kaynak sıralama olarak kullanılacak.

### Projeler

```json
{
  "schemaVersion": 1,
  "items": [{
    "id": "eyehealth",
    "publicationStatus": "published",
    "shared": {
      "github": "https://github.com/Layellie/EyeHealth",
      "year": "2026",
      "license": "MIT",
      "stack": ["C++20", "Qt 6.8"],
      "visual": {
        "mode": "builder",
        "visualId": "eyehealth",
        "fallbackComponentId": "legacy-eyehealth"
      }
    },
    "tr": {
      "name": "EyeHealth",
      "type": "Açık Kaynak · Göz Sağlığı",
      "description": "...",
      "features": [],
      "status": []
    },
    "en": {
      "name": "EyeHealth",
      "type": "Open Source · Eye Care",
      "description": "...",
      "features": [],
      "status": []
    }
  }]
}
```

- `publicationStatus` yalnızca `published` veya `draft`; public site yalnızca published kayıtları gösterir.
- Görsel union’ı builder, screenshot ve custom modlarını destekleyecek.

### Sertifikalar

- `shared`: ID, ISO tarih, kod, icon ID, ilişkili skill ID, PDF yolu.
- `tr/en`: başlık, kurum ve mevcut görünümü koruyan ilişkili yetenek etiketi.
- Mevcut `/sertifikalar/*.pdf` yolları değişmeden korunacak.
- Yeni dosyalar Worker tarafından `public/media/certificates/<id>/<uuid>.pdf` biçiminde adlandırılacak.

### Yetenekler

- `focusAreas`, `skillCards` ve `additionalGroups` ayrı sıralı koleksiyonlar olacak.
- Ortak alanlarda icon, certified ve `normal|wide` kart genişliği enum’u bulunacak.
- TR/EN alanlarında başlık/ad, açıklama ve etiket listeleri tutulacak.
- Grup içindeki her yetenek sabit ID alacak; sertifikalar bunlara referans verebilecek.
- Tailwind class adı JSON’a yazılmayacak.

### Görseller

- Her preset `shared + tr + en` kayıt yapısını kullanacak.
- Yerleşim yalnız sınırlandırılmış `colSpan`, `rowSpan`, mobil span ve yükseklik enum’larıyla tanımlanacak.
- Proje ID’leri ilk yayın sonrasında değiştirilemeyecek; kopyalamada güvenli yeni ID üretilecek.
- Serbest HTML, class, CSS, SVG veya JavaScript alanı olmayacak.

## 9. Eski Verilerin Migration Yöntemi

- Mevcut `IDENTITY` ve `CONTENT` yapısı salt-okunur legacy fixture olarak çıkarılacak.
- `migrateLegacyContent`, projeleri `id`, sertifikaları `code`, yetenekleri deterministik slug/konum eşlemesiyle birleştirecek.
- İki dilde ortak olması gereken alanlar farklıysa migration duracak.
- Tarihler ISO biçimine, Tailwind `span` değerleri enum’a dönüştürülecek.
- Test, migration çıktısından eski TR/EN view model’ini üretip mevcut içerikle deep-equal karşılaştıracak.
- Terminal, komut paleti, GitHub featured repo filtresi ve public bileşenler yeni normalize view model’i kullanacak.
- Eski üç proje önce legacy custom modunda çalışmaya devam edecek. Builder presetleri görsel testleri geçince builder’a çevrilecek; legacy registry silinmeyecek.

## 10. Mock-up Renderer Mimarisi

- `MockupRenderer`, JSON’u doğrulayıp yalnızca sabit registry’deki bileşenleri render edecek.
- Desteklenecek modüller: pencere/chrome, başlık, icon, kontrol noktaları, arama, liste, kod/terminal satırı, büyük metrik, küçük istatistik, dairesel/yatay progress, toggle, durum etiketi, bilgi kutusu, tablo, çizgi/sütun grafiği, alt durum çubuğu, icon-açıklama, rozet, teknoloji etiketi, buton, sekme grubu ve bildirim.
- Grafikler yalnız sayısal dizilerden renderer tarafından üretilen güvenli SVG kullanacak.
- Accent seçimi sabit palette’den yapılacak.
- Grid clamp/fallback kuralları hatalı span değerlerini güvenli aralığa çekecek. Bilinmeyen modül kontrollü fallback gösterecek.
- Üç legacy mock-upın bilgi yoğunluğu ve responsive düzeni ayrı builder presetleriyle yeniden üretilecek.
- Builder’da klavye destekli drag-and-drop, kopyalama, silme, modül ekleme, kontrollü genişlik/yükseklik ve 50 adımlık undo/redo bulunacak.
- Screenshot upload’larında PNG/JPEG/WebP; PDF upload’larında yalnızca PDF kabul edilecek. Extension, MIME, boyut ve magic-byte Worker’da yeniden doğrulanacak.

## 11. Admin Paneli Ekranları

- Login/kurulum, dashboard, projeler, sertifikalar, yetenekler, görsel oluşturucu ve doğrulama/yayın merkezi ekranları oluşturulacak.
- Dashboard istatistik kartları mevcut Yetenekler kartlarının yüzey, border, tipografi ve hover karakterini; içerik listeleri Projeler ve Sertifikalar kartlarının görsel hiyerarşisini yeniden kullanacak.
- Admin başlıkları public `SectionHeader`, kart yüzeyleri ve form shell’leri ortak `src/design` primitive/token katmanından beslenecek. Public ve admin için bağımsız tema dosyaları oluşturulmayacak.
- Admin geçişleri mevcut `Reveal` eğrisine benzeyen kısa ve kontrollü Framer Motion animasyonları kullanacak. Hafif radial/noise/meteor efekti yalnız okunabilirlik ve performansı bozmadığı geniş ekranlarda gösterilecek.
- Proje ekranı CRUD, kopyalama, sıralama, draft/published, TR/EN sekmeleri, gerçek kart önizlemesi ve üç visual mode sağlayacak.
- Sertifika ekranı CRUD, sıralama, PDF, icon ve skill ilişkisini yönetecek.
- Yetenek ekranı odak, ana kart ve ek grup koleksiyonlarını yönetecek.
- Görsel oluşturucu preset kopyalama, modül kütüphanesi, özellik paneli, grid ve desktop/mobile preview sağlayacak.
- Formlar erişilebilir label, hata bağlantısı, focus, dialog ve klavye davranışlarına sahip olacak.
- Tablet ve masaüstü admin düzeni responsive olacak; `prefers-reduced-motion` durumunda Reveal, drag geçişleri ve dekoratif arka plan hareketleri azaltılacak veya kapatılacak.
- Yerel taslaklar ve pending `Blob` dosyaları IndexedDB’de saklanacak; token/cookie verisi browser storage’a yazılmayacak.

## 12. GitHub Yayınlama Akışı ve API

Worker arayüzü:

- `GET /api/session`
- `GET /api/content`
- `POST /api/validate`
- `POST /api/publish`
- `GET /api/deployments?commit=<sha>`
- `POST /auth/logout`

Yayın akışı:

1. Admin remote JSON’ları, branch commit SHA’sını ve blob SHA’larını alır.
2. CRUD ve sıralama yerel draft üzerinde yapılır.
3. Validate hem istemci hem Worker şemasını çalıştırır.
4. Admin üç yönlü diff özeti ve son onay gösterir.
5. Worker güncel `main` ağacını tekrar okur; yönetilen blob değişmişse 409 döner.
6. İlgisiz HEAD değişikliği varsa güncel HEAD üzerine güvenli biçimde devam edilir.
7. Medya yolları Worker tarafından oluşturulur ve final JSON tekrar doğrulanır.
8. GitHub Git Database API ile bütün değişiklikler tek commit olur.
9. Commit mesajı `content: update portfolio from admin panel` olur.
10. Ref update `force: false` yapılır; son an yarışı conflict olarak döner.
11. Conflict ekranı reload, üç yönlü merge ve alan bazlı local/remote seçimi sunar.
12. Başarılı yanıtta commit bağlantısı ve kontrollü deployment yenilemesi sunulur.

Silinen legacy PDF’ler otomatik kaldırılmayacak. Yeni admin medyası yalnız açık seçim ve referans kalmaması durumunda silinebilecek.

## 13. Güvenlik Önlemleri

- GitHub App yalnız hedef depoya kurulacak; izinler Contents read/write, Actions read ve Metadata read ile sınırlı olacak.
- GitHub tokenı frontend’e gönderilmeyecek; Durable Object’te HKDF türevi anahtarla AES-GCM şifreli tutulacak.
- Session cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix’li olacak.
- State tek kullanımlık, PKCE `S256`, callback URL sabit ve config’den üretilecek.
- State-changing isteklerde Durable Object session’a bağlı CSRF ve exact Origin kontrolü zorunlu olacak.
- API/auth yanıtları `Cache-Control: no-store` kullanacak.
- Worker yalnız sabit JSON yolları ve allowlist media köklerine yazabilecek.
- URL doğrulaması alan bazlı allowlist uygulayacak.
- Dosya adı istemciden alınmayacak; path traversal engellenecek.
- `dangerouslySetInnerHTML` kullanılmayacak.
- Admin CSP ve güvenlik header’ları uygulanacak.
- Loglarda cookie, Authorization, OAuth code, state, CSRF ve medya içerikleri redakte edilecek.
- Secret/config eksikse sistem fail-closed çalışacak.

## 14. Test ve Doğrulama Yaklaşımı

- Vitest: şema, migration, bilingual eşleşme, URL, icon, dosya ve canonical JSON testleri.
- Admin: CRUD, kopyalama, silme onayı, sıralama, translation, draft ve undo/redo testleri.
- Renderer: her modül, üç preset, bilinmeyen modül ve invalid visual testleri.
- Worker: config, auth, kullanıcı kontrolü, state replay, PKCE, CSRF, origin, logout, Durable Object rate limit/publish kilidi ve GitHub hata testleri.
- Yayın: SHA conflict, ilgisiz HEAD değişikliği, ref yarışı, tek commit ve path sınırı testleri.
- Playwright: desktop/tablet/mobile, TR/EN ve legacy-builder görsel karşılaştırmaları.
- SEO, terminal, komut paleti, dil tercihi, mobile nav, sertifika carousel’i, GitHub fallback ve reduced-motion regresyonları korunacak.
- Kontroller: `npm install`, `npm ci`, lint, unit, e2e, public/admin/worker build ve secretsız CI dry-run.

## 15. Uygulama Aşamaları

1. Baseline ve koruma
2. Şema/migration
3. Public refactor
4. Renderer ve legacy fallback
5. Admin çekirdeği
6. Worker güvenliği ve Durable Object
7. GitHub yayınlama ve conflict
8. Deployment görünürlüğü
9. Workflow ve belgeler
10. Regresyon ve teslim

Her aşama ayrı doğrulanacak; kullanıcı onayı olmadan commit, push veya deployment yapılmayacak.

## 16. Riskler ve Geri Dönüş Stratejisi

- Builder görsel testleri geçmeden legacy mock-up referansları kaldırılmayacak.
- Legacy fixture ve deep-equal migration testi içerik kaybını engelleyecek.
- Ortak alanlar tek yerde, published TR/EN alanları zorunlu olacak.
- Blob SHA ve atomik non-force ref update olmadan commit yapılmayacak.
- Pages build hatasında son başarılı deployment korunacak; içerik commit’i gerektiğinde `git revert` ile geri alınabilecek.
- Worker rollback manuel olacak; public site Worker’dan bağımsız kalacak.
- Kota aşımında local draft korunacak.
- Token expiry/revocation yeniden login gerektirecek fakat taslağı silmeyecek.
- Yerel `dist` kilidi kaynak değişikliği veya zorla silme yapılmadan çözülecek.
- `src/index.css`, `.claude/` ve `dist_check/` kapsam dışı; değiştirilmeyecek, commit edilmeyecek, silinmeyecek veya formatlanmayacak.

## 17. Kullanıcının Manuel GitHub ve Cloudflare Ayarları

### GitHub App

1. Private GitHub App oluştur.
2. Homepage ve Worker callback URL’sini ayarla.
3. Device flow ve webhook’ları kapat.
4. Expiring user-to-server token özelliğini etkinleştir.
5. Contents read/write, Actions read, Metadata read izinlerini ver.
6. App’i yalnız `Layellie/Layellie.github.io` deposuna kur.
7. Client ID/client secret ve `Layellie` sayısal user ID’sini al.

### Cloudflare Workers Free

1. Workers Free planını kullan; ödeme gerektiren özellik açma.
2. İlk Worker deployment’ıyla gerçek origin’i öğren.
3. GitHub callback’i kesinleştir.
4. SQLite Durable Object binding/migration’ını oluştur.
5. Secret olarak `GITHUB_CLIENT_SECRET` ve `SESSION_SECRET` tanımla.
6. Non-secret olarak `GITHUB_CLIENT_ID`, `GITHUB_OWNER`, `GITHUB_REPOSITORY`, `GITHUB_DEFAULT_BRANCH`, `GITHUB_ALLOWED_USER`, `GITHUB_ALLOWED_USER_ID`, `ADMIN_ORIGIN`, `PUBLIC_SITE_ORIGIN` tanımla.
7. Worker/admin deploy’unu manuel çalıştır.
8. GitHub repository variable olarak `VITE_ADMIN_ORIGIN` ekle ve Pages’i yeniden build et.
9. Auth ve dry validation testlerinden sonra ilk gerçek publish’i ayrıca onayla.

`.dev.vars.example` ve setup belgelerinde yalnız placeholder bulunacak; gerçek secret, token veya cookie repoya yazılmayacak.
