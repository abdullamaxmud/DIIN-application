# DIIN

**Af-Soomaali** · [English below](#english)

DIIN waa app bilaash ah (PWA) oo leh: Quraanka (qoraalka Cuthmaani – Xafs, tarjumaadda Soomaaliga iyo codka shuyuukh badan), Khatmi / Wird, Adkaarta Xisnul Muslim oo leh tiriye, waqtiyada salaadda (GPS), jihada Qiblada iyo ogeysiisyo dhab ah (Web Push).

---

## Ilaha (Sources)

Wax kasta oo diini ah waxaa laga soo qaaday il la xaqiijiyay. **Waxba lama tarjumin lamana sameynin AI.**

| Qaybta | Ilaha |
|---|---|
| Qoraalka Quraanka | Quran.com API v4 — `text_uthmani` (Xafs), boggaga Madani 604 |
| Tarjumaadda Soomaaliga | Quran.com — Mahmud Muhammad Abduh (translation id 46) |
| Codka | Quran.com `/resources/recitations` + `/chapter_recitations` (faylasha QuranicAudio) — 11 qaari oo la hubiyay |
| Adkaarta (Carabi + tirada) | Xisnul Muslim, Saciid bin Cali bin Wahf Al-Qaxdaani — hisnmuslim.com (API-ga rasmiga ah) |
| Macnaha adkaarta (Soomaali) + tixraacyada | "Xisnul Muslim – Dhufeyska Muslinka" (islamic-invitation.com), lagu xiray lambarka Xisnul Muslim |
| Waqtiyada salaadda | Adhan.js (xisaab offline). Soomaaliya / Afrika = Egyptian General Authority |
| Jihada Qiblada | Adhan.js iyo GPS; compass-ka waxaa lagu saxaa World Magnetic Model 2025 (Waqooyiga dhabta ah) |

Xogta asalka ah waxay ku jirtaa `data/quran.json` iyo `data/hisn.json`. `npm run build` ayaa si toos ah uga dhisa `public/data/` (faylal yaryar oo suurad kasta iyo cutub kasta gaar u ah).

> ⚠️ **Dib-u-eegis:** Erayada interface-ka Soomaaliga (`src/i18n/so.json`) waxaa qoray AI. Qof af-Soomaali ku hadla ha dib u eego ka hor inta aan la daabicin. (Kani **ma khuseeyo** Quraanka iyo macnaha adkaarta — kuwaas waa ilo la daabacay.)

---

## Ku shaqee kombiyuutarkaaga

Waxaad u baahan tahay **Node.js 22.12 ama ka dambeeya** (nodejs.org).

```powershell
npm install
npm run dev
```

Fur `http://localhost:5173`.

| Amar | Waxa uu qabto |
|---|---|
| `npm run dev` | server horumarin |
| `npm test` | 46 tijaabo (khatmiga, jadwalka ogeysiisyada, salaadda, xogta) |
| `npm run build` | wuxuu dhisaa `dist/` (app-ka diyaarka ah) |
| `npm run preview` | wuxuu tusaa `dist/` sidii online |
| `npm run icons` | wuxuu dib u sameeyaa calaamadaha app-ka |

---

## Online — BILAASH (Cloudflare)

App-ku hadda wuu online yahay, wuxuuna ku shaqeeyaa qorshaha **bilaashka ah** ee Cloudflare:

| Qaybta | Ciwaanka |
|---|---|
| App-ka (website) | **https://diin.diin-push.workers.dev** |
| Server-ka ogeysiisyada | https://diin-push.diin-push.workers.dev (`/api/health` → `{"ok":true}`) |
| Database (D1) | `diin` |

### Sida loo cusbooneysiiyo app-ka
Kadib markaad wax ka beddesho code-ka, ka qor galka ugu sarreeya:

```powershell
npm run build
```

```powershell
npx wrangler deploy
```

Isticmaaleyaashu waxay helayaan nooca cusub marka labaad ee ay furaan app-ka (service worker-ka ayaa marka hore soo dejiya).

Haddii aad wax ka beddesho server-ka ogeysiisyada (`worker/`):

```powershell
cd worker
```

```powershell
npm run deploy
```

### Faylasha muhiimka ah
- `wrangler.toml` (galka sare) — website-ka (faylal kaliya, `dist/`).
- `worker/wrangler.toml` — server-ka: database-ka, `ALLOWED_ORIGIN`, cron-ka daqiiqad kasta.
- `.env.production` — ciwaanka server-ka iyo **furaha guud** (public key). Wax sir ah kuma jiraan.
- `worker/.vapid-private.json` — **furaha sirta ah**. Qof ha tusin, GitHub-na ha gelin (`.gitignore` ayaa ka reebaya). Nuqul ka kaydi meel ammaan ah; haddii uu lumo, waa la samayn karaa mid cusub laakiin isticmaale kasta waa inuu mar kale "Oggolow ogeysiisyada" taabtaa. Cloudflare wuxuu u hayaa sida sirta `VAPID_PRIVATE_JWK`.

### Haddii aad mar kale meel cusub ka dejinayso (akoon kale)
1. `npx wrangler login`
2. Gudaha `worker/`: `npm install`, kadib `npx @pushforge/builder vapid` (kaydi labada fure).
3. `npx wrangler d1 create diin` → ku dheji `database_id` gudaha `worker/wrangler.toml`.
4. `npx wrangler d1 execute diin --remote --file=schema.sql`
5. `worker/wrangler.toml` → `ALLOWED_ORIGIN` = ciwaanka app-ka (`/` la'aan dhammaadka), `ADMIN_CONTACT` = ciwaanka app-ka ama `mailto:`.
6. `npx wrangler secret put VAPID_PRIVATE_JWK` → ku dheji furaha sirta ah oo dhan.
7. `npm run deploy`
8. Galka sare: ku qor `.env.production` `VITE_PUSH_API` (ciwaanka server-ka) iyo `VITE_VAPID_PUBLIC_KEY`, kadib `npm run build` iyo `npx wrangler deploy`.

> **iPhone:** ogeysiisyadu waxay shaqeeyaan oo keliya marka app-ka lagu daro shaashadda hore (Safari → Share → "Add to Home Screen"), iOS 16.4 ama ka dambeeya.

### Xadka qorshaha bilaashka ah (si daacad ah)
- **D1:** 5 milyan oo saf-akhris maalintii. Cron-ku daqiiqad kasta wuxuu akhriyaa dhammaan isdiiwaangeliyeyaasha → qiyaastii **3,000 isticmaale** ilaa xadka.
- **Workers:** 100,000 codsi maalintii; CPU-ga xaddidan ee wareeg kasta. Haddii boqollaal qof oo isku magaalo ah isku daqiiqad ogeysiis u baahdaan, qaarkood way dib u dhici karaan.
- Haddii app-ku koro, qorshaha **Workers Paid** ($5 bishii) ayaa xalliya labadaba. Website-ka laftiisa (faylasha) waa bilaash.

---

## Akoonnada, kaydinta horumarka iyo Dashboard-ka

- **Furitaanka:** animation-ka DIIN (index.html) ayaa soo baxa marka app-ka la furo.
- **Gelitaanka:** qof kasta wuxuu ku galaa **Google** ama **email iyo password**. Email-ka waa in link-ga xaqiijinta la taabto ka hor inta aan app-ka la gelin.
- **Kaydinta:** horumarka (wirdka, khatmiga, meesha akhriska, adkaarta, dookhyada) waxaa server-ka loo diraa 3 ilbiriqsi kadib isbeddel kasta. Qofka Google ku galay wuxuu dib ugu helayaa taleefan kasta.
- **Siyaasadda Asturnaanta:** `/asturnaanta`. Qofku halkaas ayuu ka bixi karaa ama ka tirtiri karaa akoonkiisa.
- **Dashboard-ka maamulaha:** `/admin`. Wuxuu muujiyaa booqdayaasha, inta soo degsatay, wadamada, qaybaha la isticmaalo iyo liiska dadka (magac, magaalo, horumar).

### Furaha dashboard-ka (adiga kaliya)
Gudaha `worker`:

```powershell
npx wrangler secret put ADMIN_KEY
```

Qor fure adag (ugu yaraan 16 xaraf). Kadib fur `/admin` oo geli furahaas. Furaha waxaa lagu kaydiyaa Cloudflare oo keliya.

### Gelitaanka (Firebase Authentication, bilaash)
Project-ka Firebase waa `diin-eb366` (qorshaha Spark, kaar la'aan). Waxaa daaran **Email/Password** iyo **Google**, ciwaanka `diin.diin-push.workers.dev`-na waa la oggolaaday.

- Xogta Firebase ee website-ka waxay ku jirtaa `.env.production.local` (GitHub lama geliyo). Haddii aad kombiyuutar kale ka dhisayso, ka soo qaad **Firebase console → Project settings → Your apps** (eeg `.env.example`).
- Server-ku wuxuu hubiyaa saxiixa Firebase, wuxuuna diidaa email aan la xaqiijin.
- Haddii aad domain cusub qaadato, ku dar **Authentication → Settings → Authorised domains**.
- Xadka bilaashka ah: 1,000 email xaqiijin ah iyo 150 dib-u-dejin password ah maalintii.

---

## Ciwaan gaar ah (domain) — mar dambe

1. Iibso domain (tusaale `diin.so`).
2. Cloudflare → **Workers & Pages** → `diin` → **Settings → Domains & Routes** → ku dar domain-ka.
3. Beddel `ALLOWED_ORIGIN` ee `worker/wrangler.toml` oo noqda domain-ka cusub, kadib `npm run deploy` gudaha `worker`.
4. Isticmaaleyaasha hore waa inay mar kale "Oggolow ogeysiisyada" taabtaan (ogeysiisyadu waxay ku xiran yihiin ciwaanka).

---

## Ka samee APK (Android) — bilaash

1. Fur **pwabuilder.com** oo geli ciwaanka app-kaaga: `https://diin.diin-push.workers.dev`.
2. Riix **Package for stores** → **Android** → **Generate Package**.
3. Soo deji zip-ka. Waxaa ku jira:
   - `.apk` — si toos ah ugu rakib taleefannada (tijaabo / la wadaag)
   - `.aab` — Google Play (akoonka Play wuxuu ku kacaa $25 hal mar — ikhtiyaari)
   - **signing key** — kaydi meel ammaan ah; waxaad u baahan doontaa cusbooneysiin kasta
4. App-ku wuxuu had iyo jeer furaa website-ka, sidaa darteed cusbooneysiin kasta oo aad daabacdo (`npx wrangler deploy`) si toos ah ayay u gaartaa APK-ga.

Android/Chrome: app-ka laftiisa wuxuu leeyahay badhanka **"Soo Degso App-ka"**.

---

## Qaab-dhismeedka

```
data/            xogta asalka ah (quran.json, hisn.json) — ha beddelin gacanta
scripts/         build-data.mjs (u kala jaraa xogta), gen-icons.mjs
src/i18n/so.json dhammaan erayada interface-ka
src/lib/         salaadda, khatmiga, kaydinta (IndexedDB), codka, push
src/pages/       shaashadaha
src/sw.ts        service worker (offline + push)
worker/          Cloudflare Worker + D1 + cron (ogeysiisyada)
```

---
---

<a id="english"></a>
# DIIN — English

DIIN is a free PWA: Quran (Uthmani Hafs text, Somali translation, many reciters), Khatma / daily Wird planner, Hisn al-Muslim adhkar with a counter, GPS-based prayer times, a Qibla compass and real Web Push notifications. The whole UI is in Somali; Arabic appears only in Quran and adhkar text.

## Sources

Every religious text comes from a verified source. **Nothing was translated or generated by AI.**

| Part | Source |
|---|---|
| Quran text | Quran.com API v4 — `text_uthmani` (Hafs), Madani 604 page numbers |
| Somali translation | Quran.com — Mahmud Muhammad Abduh (translation id 46) |
| Audio | Quran.com `/resources/recitations` + `/chapter_recitations` (QuranicAudio files) — 11 verified reciters |
| Adhkar (Arabic + repeat counts) | Hisn al-Muslim by Sa'id bin Ali bin Wahf al-Qahtani — hisnmuslim.com official API |
| Adhkar Somali meanings + hadith references | "Xisnul Muslim – Dhufeyska Muslinka" (islamic-invitation.com), matched by Hisn al-Muslim number |
| Prayer times | Adhan.js (offline). Method chosen from the device time zone; Somalia / Africa = Egyptian General Authority |
| Qibla | Adhan.js and GPS; compass corrected to true north with the World Magnetic Model 2025 |

Source data lives in `data/quran.json` and `data/hisn.json`. `npm run build` (via `prebuild`) splits it into small per-surah and per-chapter files in `public/data/`.

> ⚠️ **Review needed:** the Somali UI strings in `src/i18n/so.json` were written with AI help and should be reviewed by a native speaker before launch. This does **not** apply to the Quran or adhkar meanings, which come from published sources.

## Local development

Requires **Node.js ≥ 22.12**.

```powershell
npm install
npm run dev
```

`npm test` runs 46 tests (khatma calculation, notification scheduling, prayer adapter, data integrity). `npm run build` builds `dist/`. `npm run preview` serves it.

Stack: Vite + TypeScript + Tailwind v4 + vite-plugin-pwa (injectManifest, `src/sw.ts`), React code running on Preact (aliased in `vite.config.ts` for a ~90 KB bundle), IndexedDB storage, Adhan.js.

## Live deployment (Cloudflare, free)

| Part | Address |
|---|---|
| App (website) | **https://diin.diin-push.workers.dev** |
| Push server | https://diin-push.diin-push.workers.dev (`/api/health` → `{"ok":true}`) |
| Database | D1 `diin` |

The website is served as a Worker with static assets (root `wrangler.toml`, `not_found_handling = "single-page-application"`). Current wrangler versions route Pages projects through Workers anyway. The push backend is the separate Worker in `worker/`, with a cron trigger that runs every minute.

**Update the app:** `npm run build` then `npx wrangler deploy` (project root). Users get the new version on their second visit, after the service worker updates. **Update the push server:** `cd worker` then `npm run deploy`.

**Keys:**
- `.env.production` holds only public values: the push server URL and the VAPID public key.
- The private key is in `worker/.vapid-private.json`, which is git-ignored, and is stored in Cloudflare as the secret `VAPID_PRIVATE_JWK`.
- Back it up and never share it. If it is lost, generate a new pair; every user will then need to re-enable notifications.

**Redeploy from scratch (another account):**
1. Run `npx wrangler login`.
2. In `worker/`, run `npm install`, then `npx @pushforge/builder vapid`.
3. Run `npx wrangler d1 create diin` and paste the printed `database_id` into `worker/wrangler.toml`.
4. Run `npx wrangler d1 execute diin --remote --file=schema.sql`.
5. In `worker/wrangler.toml`, set `ALLOWED_ORIGIN` (the site URL, no trailing slash) and `ADMIN_CONTACT` (the site URL or a `mailto:` address).
6. Run `npx wrangler secret put VAPID_PRIVATE_JWK`.
7. Run `npm run deploy`.
8. In the project root, set `VITE_PUSH_API` and `VITE_VAPID_PUBLIC_KEY` in `.env.production`, then run `npm run build` and `npx wrangler deploy`.

iPhone: push works only after "Add to Home Screen" (iOS 16.4+).

**Free-tier limits:**
- D1 allows 5M row reads a day. The cron reads every subscription each minute, which caps the free plan at roughly **3,000 subscribers**.
- Workers Free also limits CPU time per invocation, so a very large burst of notifications in the same minute may be delayed.
- Workers Paid ($5/month) removes both limits. Serving the static site stays free.

## Accounts, saved progress and the admin dashboard

- **Opening animation:** inline in `index.html`, so it paints before any script; removed by `src/main.tsx` after 1.8 s, or on tap.
- **Sign-in gate:** everyone signs in with **Google** or a **verified email and password** (Firebase Authentication). Earlier guests are asked to connect an account, and their saved progress moves to it.
- **Sync:** progress keys (`src/lib/syncKeys.ts`) carry change times. `src/components/AppServices.tsx` sends changes to `/api/sync` 3 s after an edit and on backgrounding, and pulls newer values on return. Per key, the newest change wins. Google users get their progress back on any device.
- **Privacy page:** `/asturnaanta`, with sign-out and account deletion (`/api/me/delete`).
- **Admin dashboard:** `/admin` shows visitors, installs, countries, section usage and a user list with progress. The password is the Worker secret `ADMIN_KEY` (`npx wrangler secret put ADMIN_KEY` in `worker/`).
- **Firebase Authentication:**
  - project `diin-eb366` (Spark plan) with Email/Password and Google enabled;
  - only `@firebase/app` and `@firebase/auth` are installed, loaded lazily on the sign-in and account screens;
  - web config lives in `.env.production.local` (git-ignored; see `.env.example`), the Worker has `FIREBASE_PROJECT_ID`;
  - the Worker verifies the RS256 signature, issuer, audience, times and `email_verified` before opening a session;
  - add any new domain under Authentication → Settings → Authorised domains.
- **Statistics:**
  - anonymous random device id, one ping per new section per day (`src/lib/track.ts`);
  - city and country come from Cloudflare's `request.cf`, not from GPS.

## Custom domain (later)

1. Add the domain under **Workers & Pages → diin → Settings → Domains & Routes**.
2. Update `ALLOWED_ORIGIN` in `worker/wrangler.toml` and redeploy the Worker.
3. Push subscriptions are tied to the origin, so users must enable notifications again on the new domain.

## Android APK (free)

1. Open **pwabuilder.com** and enter the site URL.
2. Choose **Package for stores → Android**.
3. The zip contains:
   - an installable `.apk`;
   - an `.aab` for Google Play (a one-time $25 developer fee, optional);
   - the signing key, which you must keep for future updates.
4. The APK loads the live site, so every `npx wrangler deploy` updates it automatically.

## Project layout

```
data/            verified source data (do not edit by hand)
scripts/         build-data.mjs (splits data), gen-icons.mjs
src/i18n/so.json every UI string
src/lib/         prayer, khatma, IndexedDB store, audio, push
src/pages/       screens
src/sw.ts        service worker (offline cache + push)
worker/          Cloudflare Worker + D1 + cron (notifications)
```
