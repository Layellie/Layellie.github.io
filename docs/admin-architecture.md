# Admin paneli mimarisi

Bu belge, public portföy ile güvenli yönetim düzlemi arasındaki sınırları ve alınan güvenlik kararlarını açıklar. Uygulama aylık sabit ücret gerektirmeden GitHub Free, GitHub Pages/Actions ve Cloudflare Workers Free üzerinde çalışacak şekilde tasarlanmıştır.

## Sistem sınırları

```text
GitHub Pages (public, statik)
  └─ Build-time doğrulanmış src/content/*.json

Cloudflare Worker origin (özel yönetim düzlemi)
  ├─ Static Assets: React admin SPA
  ├─ /auth/* ve /api/*
  └─ SQLite Durable Object
       ├─ OAuth transaction/state/PKCE verifier
       ├─ şifreli GitHub user access token + session + CSRF
       ├─ kesin rate-limit sayaçları
       └─ tek publish kilidi

GitHub repository/main
  └─ Worker tarafından tek atomik commit
       └─ mevcut GitHub Pages workflow'u
```

Public site Worker'a istek atmaz. Cloudflare kurulmamış, hatalı yapılandırılmış veya kota dışı kalmış olsa bile GitHub Pages build/deployment çalışmaya devam eder. `.github/workflows/deploy.yml` Cloudflare secret'ı, Worker binding'i veya Worker deployment'ı kullanmaz. Admin/Worker kontrolleri ayrı ve secretsız `admin-checks.yml` workflow'undadır; bu workflow deployment yapmaz.

## Ortak içerik ve tasarım altyapısı

- `src/content/*.json` sürümlü, ortak + `tr` + `en` kayıtlarıdır.
- `src/content/schemas.js` public site, admin önizlemesi ve Worker publish sınırında aynı Zod doğrulamasını uygular.
- Public ve admin aynı `src/index.css` tema kaynağını kullanır. Build-time Tailwind kaynak kapsamı iki bundle'ı ayırır; tokenlar kopyalanmaz.
- General Sans, Clash Display, `#08080a` canvas, koyu surface/elevated katmanları, ince `line` kenarlığı ve `#d6ff3f` accent her iki yüzeyde aynıdır.
- `ProjectVisual` builder/screenshot/custom union'ını; `MockupRenderer` yalnız sabit module registry'yi render eder.
- Legacy `ClipboardMock`, `TimerMock` ve `EyeHealthMock` public sitede güvenli fallback olarak korunur. Builder presetleri admin önizlemesinde kullanılabilir.

## Kimlik doğrulama

1. `/auth/github`, 32 bayt state ve 64 bayt PKCE verifier üretir.
2. State hash'i ve verifier 10 dakika süreyle Durable Object'te tutulur. Tarayıcı yalnız opaque transaction ID içeren `__Host-` cookie alır.
3. Callback state'i tek sefer tüketir; replay reddedilir.
4. GitHub App user access token alınır ve `/user` ile hem case-insensitive `Layellie` login'i hem değiştirilemez sayısal user ID doğrulanır.
5. Token'ın yapılandırılan tek depoya erişimi ayrıca kontrol edilir.
6. Yetkisiz token iptal edilir ve session oluşturulmaz.
7. Yetkili token, `SESSION_SECRET` doğrudan anahtar yapılmadan HKDF-SHA-256 ile türetilen 256-bit AES-GCM anahtarıyla şifrelenir.
8. Session en fazla 8 saat veya GitHub token ömründen 60 saniye kısa sürer. Refresh token saklanmaz.
9. `__Host-layellie-session` cookie'si `HttpOnly; Secure; SameSite=Lax; Path=/` kullanır.
10. Logout GitHub token'ını iptal etmeyi dener ve sonuçtan bağımsız olarak session'ı siler.

Frontend'deki kullanıcı adı görünümü güvenlik kararı değildir. Her API isteğinde Durable Object session kaydı, login ve sayısal ID Worker tarafından tekrar doğrulanır.

## CSRF, origin ve CORS

- Değişiklik yapan her istek exact `Origin` ve session'a bağlı rastgele CSRF token ister.
- CSRF hash'i Durable Object'te tutulur; token yalnız session endpoint'inden React belleğine gelir. Browser storage'a yazılmaz.
- Production'da admin SPA, cookie ve API aynı Worker origin'indedir; üçüncü taraf cookie yoktur.
- `ADMIN_DEV_ORIGIN` yalnız açıkça ayarlanırsa yerel origin olarak kabul edilir. Wildcard CORS yoktur.
- API/auth yanıtları `Cache-Control: no-store`, `X-Content-Type-Options`, frame ve robot engelleme header'ları kullanır.

## Durable Object ve rate limiting

Cloudflare'ın [Durable Objects fiyatlandırması](https://developers.cloudflare.com/durable-objects/platform/pricing/) SQLite backend'in Workers Free planında kullanılabildiğini ve kota aşımında ilgili işlemlerin başarısız olduğunu açıkça belirtir. Normal portföy yönetim kullanımında tek global object ve küçük satırlar ücretsiz sınırların çok altındadır.

Workers Rate Limiting binding'in güncel belgesi binding'i tanımlar; ancak Free plan uygunluğunu açıkça garanti eden bir fiyatlandırma ifadesi sunmaz. Ayrıca Cloudflare bu sayaçları [lokasyon bazlı, permissive ve eventually consistent](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#accuracy) olarak tanımlar. Bu nedenle binding yapılandırmaya eklenmemiştir.

Bütün limitler SQLite Durable Object'te güçlü tutarlılıkla uygulanır:

| İşlem | Kesin sınır |
| --- | --- |
| Login başlangıcı | istemci hash'i başına 10/dakika |
| Authenticated API | session başına 60/dakika |
| Validate | session başına 10/dakika |
| Deployment yenileme | session başına 1/30 saniye |
| Publish | session başına 3/dakika |
| Eşzamanlı publish | global olarak 1, 120 saniyelik güvenli lease |

OAuth replay, session, CSRF, publish sayacı ve publish kilidi KV veya eventually-consistent altyapıya dayanmaz. KV kullanılmaz.

## GitHub okuma ve yayınlama

Worker hedef branch ref'ini, commit ağacını ve beş yönetilen JSON blob'unu okur. Admin'e base commit SHA ve blob SHA map'i döner. Yayında:

1. İstemcinin base blob SHA'ları güncel uzak SHA'larla karşılaştırılır.
2. Herhangi bir yönetilen dosya değişmişse `409 CONTENT_CONFLICT` döner; yerel taslak korunur.
3. JSON yeniden doğrulanır. Bu panel sürümünde `site.json` salt okunurdur.
4. Upload extension, MIME, boyut ve magic-byte kontrollerinden geçer.
5. Dosya yolları Worker tarafından allowlist köklerinde rastgele üretilir; istemci dosya adı path olarak kullanılmaz.
6. Değişen JSON ve medya için Git blob'ları oluşturulur.
7. Güncel tree taban alınarak tek tree ve tek commit oluşturulur.
8. Commit mesajı `content: update portfolio from admin panel` olur.
9. `main` ref'i `force: false` ile güncellenir; son-an yarışı da conflict olur.

Yönetilen JSON yolları sabittir. Medya yalnız `public/media/projects/` veya `public/media/certificates/` altına eklenebilir. Legacy PDF'ler ve medya otomatik silinmez.

## Upload ve yayın sınırları

- Tek dosya: en fazla 5 MiB
- Tek publish toplam medya: en fazla 8 MiB
- JSON dosyası: en fazla 1 MiB
- Tek publish değişmiş repo yolu: en fazla 24
- Sertifika: yalnız PDF + `%PDF-` imzası
- Screenshot: PNG/JPEG/WebP + ilgili magic byte
- URL: proje depoları için canonical HTTPS `github.com/<owner>/<repo>`

Sınır veya free kota aşılırsa Worker yazmayı reddeder. Otomatik ücretli plan, ödeme yöntemi veya ücretli fallback yoktur. IndexedDB taslağı korunur.

## Secret yönetimi

Yalnız iki secret kullanılır:

- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`

Secret'lar `wrangler secret put` ile Cloudflare'da tutulur. GitHub App private key, App ID, PAT, signing secret veya KV yoktur. Secret/token değerleri Vite environment değişkeni, repo, log, hata mesajı, `localStorage` veya `sessionStorage` içine girmez.

## Güvenli başarısızlık ve geri dönüş

- Config eksik/geçersizse `/api/*` ve `/auth/*` `CONFIGURATION_ERROR` ile fail-closed olur.
- Public `/admin/`, `VITE_ADMIN_ORIGIN` yoksa yönlendirme yerine kurulum mesajı gösterir.
- Kalıcı `/media/...` önizlemeleri admin origin'ine göre çözülmez; Worker'ın doğruladığı non-secret `PUBLIC_SITE_ORIGIN` session yanıtıyla paylaşılan renderer'a aktarılır. Admin build'i CSP `img-src` allowlist'ini de aynı `worker/wrangler.jsonc` değerinden üretir; renderer/CSP drift'i oluşmaz. Public renderer root-relative davranışını korur.
- Ayrı Vite geliştirme origin'i `/api/*` ve `/auth/*` yollarını yapılandırılabilir local Wrangler origin'ine proxy'ler; non-JSON fallback yanıtları `API_UNREACHABLE` olarak görünür.
- Public Pages Worker'dan bağımsızdır.
- Builder verisi bozuksa renderer kontrollü fallback gösterir.
- Builder preset'i yoksa proje izin verilen legacy React fallback'ine döner.
- GitHub veya Cloudflare kotası aşılırsa publish olmaz; remote içerik değişmez.
- Hatalı içerik commit'i Git geçmişinden normal `git revert` ile geri alınabilir. Worker deployment rollback'i manuel yapılır.
