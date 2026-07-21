# Admin paneli kurulum rehberi

Bu adımlar kullanıcı tarafından manuel yapılır. Komutlar deployment oluşturabilir; hazır olduğunda kendin çalıştır. Repo hiçbir gerçek secret içermez.

## 1. Gereksinimler

- GitHub Free hesabı ve `Layellie/Layellie.github.io` yönetim yetkisi
- Cloudflare Workers Free hesabı
- Node.js 22
- Wrangler için `npx wrangler login`

Temiz checkout sonrasında bağımlılıkları repo kökünde kur:

```bash
npm ci
```

Cloudflare hesabında ücretli özellik, KV, D1, R2 veya ödeme gerektiren rate-limit özelliği açma. Sistem yalnız Worker Static Assets ve SQLite Durable Object kullanır.

## 2. GitHub App oluştur

GitHub'da **Settings → Developer settings → GitHub Apps → New GitHub App** yolunu aç.

Önerilen ayarlar:

1. GitHub App name: hesabında benzersiz bir ad, ör. `Layellie Portfolio Admin`.
2. Homepage URL: `https://layellie.github.io`.
3. Callback URL: son Worker origin'i + `/auth/callback`, ör. `https://layellie-portfolio-admin.<workers-subdomain>.workers.dev/auth/callback`.
4. Webhook: **Inactive**. Bu mimari webhook kullanmaz.
5. Device flow: kapalı.
6. Expiring user authorization token: açık bırak.
7. Repository permissions:
   - **Contents: Read and write**
   - **Actions: Read-only**
   - **Metadata: Read-only** (GitHub otomatik verir)
8. Organization/account permissions ve user permissions: ek izin verme.
9. Installation kapsamı: yalnız kendi hesabın.
10. App'i **Only select repositories** ile yalnız `Layellie.github.io` deposuna kur.

App sayfasından **Client ID** değerini al ve yeni bir **Client secret** üret. Private key üretme; bu mimari `GITHUB_PRIVATE_KEY` veya `GITHUB_APP_ID` kullanmaz.

Değiştirilemez sayısal kullanıcı ID'sini al:

```bash
gh api users/Layellie --jq .id
```

Bu değer kullanıcı adı ele geçirilmesi/değişmesi riskine karşı ikinci Worker-side kontroldür.

## 3. Worker non-secret yapılandırması

`worker/wrangler.jsonc` içindeki placeholder'ları değiştir:

```json
"vars": {
  "GITHUB_CLIENT_ID": "github-app-client-id",
  "GITHUB_OWNER": "Layellie",
  "GITHUB_REPOSITORY": "Layellie.github.io",
  "GITHUB_DEFAULT_BRANCH": "main",
  "GITHUB_ALLOWED_USER": "Layellie",
  "GITHUB_ALLOWED_USER_ID": "sayisal-user-id",
  "ADMIN_ORIGIN": "https://worker-adin.workers.dev",
  "PUBLIC_SITE_ORIGIN": "https://layellie.github.io"
}
```

`ADMIN_ORIGIN` yalnız origin olmalı: path, query, kullanıcı bilgisi veya fragment ekleme. Custom domain kullanılacaksa aynı değeri GitHub App callback'inde de güncelle. Bu repo domain ayarını otomatik değiştirmez. `PUBLIC_SITE_ORIGIN`, admin önizlemelerindeki kalıcı `/media/...` yollarının çözüleceği GitHub Pages origin'idir; Worker session yanıtında non-secret olarak admin'e aktarılır. Eksik veya geçersiz olduğunda Worker fail-closed olur ve admin medya yolunu kendi origin'ine düşürmez. Admin production build'i aynı değeri `admin/public/_headers` şablonundaki `img-src` allowlist'ine yazar; böylece renderer ile CSP ayrı ayrı yapılandırılmaz. Origin değiştiğinde `_headers` dosyasını elle düzenleme, `worker/wrangler.jsonc` değerini güncelleyip admin build'ini yeniden üret.

`ADMIN_DEV_ORIGIN`, production `ADMIN_ORIGIN` değeri korunarak ayrıca bir yerel state-changing origin allowlist'e alınacaksa kullanılabilir. Aşağıdaki Vite proxy akışında `ADMIN_ORIGIN` doğrudan yerel admin origin'i olduğundan gerekli değildir.

## 4. Cloudflare secrets

Secret değerlerini terminal geçmişi veya dokümana kopyalama. İnteraktif Wrangler komutlarını çalıştır ve değerleri prompt'a gir:

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.jsonc
npx wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
```

`SESSION_SECRET` en az 32 rastgele bayt entropiye sahip olmalı. Örneğin değeri kendin üretip doğrudan Wrangler prompt'una yapıştırabilirsin:

```bash
openssl rand -base64 48
```

Worker bu metni doğrudan AES anahtarı yapmaz; HKDF-SHA-256 ile sürümlü salt/info bağlamında AES-256-GCM anahtarı türetir.

Kullanılan production değişkenleri:

| Ad | Tür | Amaç |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | non-secret | GitHub App OAuth client |
| `GITHUB_CLIENT_SECRET` | secret | OAuth code exchange/token revoke |
| `GITHUB_OWNER` | non-secret | hedef repo sahibi |
| `GITHUB_REPOSITORY` | non-secret | hedef repo |
| `GITHUB_DEFAULT_BRANCH` | non-secret | `main` |
| `GITHUB_ALLOWED_USER` | non-secret | zorunlu `Layellie` login |
| `GITHUB_ALLOWED_USER_ID` | non-secret | değiştirilemez sayısal GitHub ID |
| `SESSION_SECRET` | secret | HKDF anahtar materyali |
| `ADMIN_ORIGIN` | non-secret | Worker/admin same-origin |
| `PUBLIC_SITE_ORIGIN` | non-secret | public site origin |
| `ADMIN_DEV_ORIGIN` | opsiyonel non-secret | açık yerel origin allowlist |
| `ADMIN_WORKER_DEV_ORIGIN` | opsiyonel Vite non-secret | `/api` ve `/auth` proxy hedefi; varsayılan `http://127.0.0.1:8787` |

`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, PAT ve KV binding kullanılmaz.

## 5. Yerel geliştirme

Public site:

```bash
npm run dev:site
```

Vite admin UI ve local Worker geliştirmesi iki terminalde çalıştırılır. `worker/.dev.vars` içinde `ADMIN_ORIGIN=http://localhost:5174` olmalı; local GitHub App callback'i de `http://localhost:5174/auth/callback` olarak ayarlanmalıdır.

Terminal 1 — Worker (`http://127.0.0.1:8787`):

```bash
Copy-Item worker/.dev.vars.example worker/.dev.vars
# worker/.dev.vars içindeki placeholder'ları yerel değerlerle değiştir
npm run dev:worker
```

`dev:worker`, temiz checkout'ta bulunmayan `dist-admin` assets'ini başlamadan önce bir kez `build:admin` ile üretir. Assets zaten varsa gereksiz build yapmaz; production Worker aynı `worker/wrangler.jsonc` static-assets yapılandırmasını kullanmaya devam eder.

Terminal 2 — admin Vite (`http://localhost:5174`):

```bash
npm run dev:admin
```

Vite `/api/*` ve `/auth/*` yollarını Worker'a proxy'ler; böylece cookie, CSRF ve OAuth callback'leri tarayıcı açısından admin origin'inde kalır. Worker farklı bir portta çalışıyorsa non-secret hedefi admin komutundan önce ayarla:

```powershell
$env:ADMIN_WORKER_DEV_ORIGIN='http://127.0.0.1:8790'
npm run dev:admin
```

`worker/.dev.vars` gitignore kapsamındadır. Production secret'larını yerel dosyada kullanmak zorunda değilsin; ayrı bir test GitHub App/secret tercih et. Worker çalışmıyorsa admin HTML fallback'i oturum verisi saymaz ve görünür bağlantı hatası gösterir. Production admin build'i bu geliştirme proxy'sine bağlı değildir.

## 6. Test ve build

```bash
npm ci
npm test
npm run test:worker
npm run typecheck:worker
npm run build:site
npm run build:admin
npm run build:worker
```

`build:worker` yalnız Wrangler `--dry-run` yapar; deployment oluşturmaz. Hepsini sırayla çalıştırmak için `npm run check` kullanılabilir.

`npm run build:admin`, `worker/wrangler.jsonc` içindeki `PUBLIC_SITE_ORIGIN` değerini doğrular ve `dist-admin/_headers` dosyasını build sırasında üretir. Yalnız temiz bir HTTPS origin kabul edilir; genel `https:` veya `*` kaynakları CSP'ye eklenmez. Build sonrasında `img-src` içinde `'self'`, `data:`, `blob:` ve tam public origin bulunmalıdır.

## 7. Manuel Worker deployment

Hazır olduğunda:

```bash
npm run build:admin
npx wrangler deploy --config worker/wrangler.jsonc
```

İlk deploy, `AdminSessionStore` için `v1` SQLite Durable Object migration'ını oluşturur ve admin Static Assets'i aynı Worker origin'inde yayınlar. Deploy sonrası:

1. Gerçek Worker URL'sinin `ADMIN_ORIGIN` ile birebir aynı olduğunu doğrula.
2. GitHub App callback URL'sini `<ADMIN_ORIGIN>/auth/callback` yap.
3. GitHub App'in yalnız hedef depoya kurulu olduğunu tekrar kontrol et.
4. Worker URL'sinde giriş yap; `Layellie` dışı hesabın 403 aldığını doğrula.
5. İlk publish öncesi yalnız **Doğrula** işlemini çalıştır.

## 8. GitHub Pages `/admin/` yönlendirmesi

GitHub deposunda **Settings → Secrets and variables → Actions → Variables** altında repository variable ekle:

- Name: `VITE_ADMIN_ORIGIN`
- Value: gerçek Worker origin'i, ör. `https://layellie-portfolio-admin.<subdomain>.workers.dev`

Mevcut Pages workflow'u bu non-secret variable'ı build step'ine şu eşlemeyle aktarır:

```yaml
env:
  VITE_ADMIN_ORIGIN: ${{ vars.VITE_ADMIN_ORIGIN }}
```

Variable yoksa ifade boş değere çözülür; public build yine başarılı olur ve `/admin/` güvenli bir “henüz yapılandırılmadı” sayfası gösterir. Public deployment hiçbir Cloudflare secret'ına veya çalışan Worker'a bağlı değildir.

## 9. Kota ve hata davranışı

- Static Assets istekleri Worker çalıştırmadan sunulur; yalnız `/auth/*` ve `/api/*` Worker'a gider.
- Dashboard deployment durumu otomatik poll edilmez; kullanıcı yeniler ve en erken 30 saniyede bir sorgulanır.
- SQLite Durable Object Free kota aşımında ilgili API işlemi başarısız olur; sistem ücretli plana geçmez.
- GitHub API rate limit dolarsa `GITHUB_QUOTA_EXCEEDED` gösterilir ve commit oluşturulmaz.
- Publish kilitliyse `PUBLISH_LOCKED`; dosya değiştiyse `CONTENT_CONFLICT`; config eksikse `CONFIGURATION_ERROR` döner.
- Her hata durumunda yerel IndexedDB taslağı korunur.

## 10. Operasyon kontrol listesi

- [ ] GitHub App yalnız tek depoya kurulu
- [ ] Contents write ve Actions read dışında gereksiz izin yok
- [ ] `GITHUB_ALLOWED_USER_ID` sayısal ve doğru
- [ ] İki secret yalnız Cloudflare secret store'da
- [ ] `.dev.vars` repoda değil
- [ ] Worker origin ve callback birebir aynı
- [ ] `npm run check` başarılı
- [ ] Public GitHub Pages build Worker olmadan başarılı
- [ ] Yetkisiz hesap reddediliyor
- [ ] İlk publish diff özeti manuel kontrol edildi
