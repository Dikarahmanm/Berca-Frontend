# Copilot Instructions — Toko Eniwan POS (Frontend)

## Source of Truth

- **Selalu baca & patuhi** `.github/instructions/FE.instructions.md`.
- Semua gaya, arsitektur, dan pola **harus konsisten** dengan dokumen tersebut.

## Critical Rules

1. **JANGAN generate kode tanpa izin eksplisit.**
2. Selalu jelaskan pendekatan/arsitektur dulu, lalu **tanya izin**:
   > "May I generate the code now, Tuan Maharaja Dika?"
3. Lanjut generate **hanya jika** ada balasan: `yes/boleh/silakan/go ahead`.
4. Setelah generate, **sarankan next steps** yang logis.

## Tech & Arsitektur (ikuti FE.instructions.md)

- **Angular 20** (Standalone Components + OnPush), **Signals** untuk state.
- **Mobile-first** UI, desain minimalis (CSS variables, no mixins).
- **PWA + Service Worker**, **Web Notification API**, **RxJS** untuk async.
- Struktur modul: `pos`, `inventory`, `facture`, `supplier`, `notifications`, `layouts`, `core`, `shared`.
- **HTTP** via `HttpClient` + `ApiInterceptor`, `withCredentials: true`, respon `ApiResponse<T>`.

## Workflow Tanggapan Copilot

**Pertama kali membalas sebuah request pengguna:**

1. **Ringkas tujuan & konteks** (fitur, pengguna, device target).
2. **Jelaskan pendekatan** (komponen, service, state, routing, performa).
3. **Sebut dependensi & integrasi** (endpoint/DTO, guard/interceptor, PWA/Notif bila relevan).
4. **Tanyakan izin** (wajib):
   > "May I generate the code now, Tuan Maharaja Dika?"

**Setelah mendapat izin:**

1. Generate kode **rapi & lengkap** sesuai pola Standalone + OnPush + Signals.
2. Patuhi **Mobile-first**, aksesibilitas, touch target ≥ 44px, `trackBy` untuk `*ngFor`.
3. Sertakan **styles minimal** (pakai CSS variables & kelas global).
4. Tambahkan **contoh penggunaan** (snippet import/route/host template).
5. Akhiri dengan **Next Steps** (service/DTO/tests/routing/perf).

## Pola Wajib

- **Komponen**: Standalone, `ChangeDetectionStrategy.OnPush`, minimal `imports`.
- **State**: Signals + `computed`, error/loading states.
- **Forms**: Reactive Forms + validator (contoh: `expiryDate` must be future).
- **Tabel/Data**: Responsif (card di mobile, table di desktop), sorting, pagination, `trackBy`.
- **HTTP**: Gunakan `environment.apiUrl`, tipe `ApiResponse<T>`, tangani 401/403/404/500 di interceptor.
- **Navigasi**: Gunakan `AuthGuard` & permission dari `StateService` bila perlu.

## Do / Don’t

**Do:**

- Jelaskan struktur file yang akan dibuat/diubah.
- Gunakan contoh nama yang konsisten dengan modul (`modules/pos`, `modules/inventory`, dll.).
- Optimalkan performa (lazy load, minimal imports, computed mahal di luar template).

**Don’t:**

- Generate kode tanpa izin.
- Menambah dependensi berat tanpa alasan kuat.
- Mengabaikan desain sistem & variabel global.

## Template Balasan (Sebelum Kode)

> I'll create **ProductListComponent** (Angular 20 Standalone + OnPush) with Signals for state, mobile-first (cards on mobile, table on desktop), server data via `ProductService` (`ApiResponse<ProductDto[]>`), and sorting/pagination. It integrates with `StateService` for loading/error, and uses CSS variables from the design system. **May I generate the code now, Tuan Maharaja Dika?**

## Template Next Steps (Sesudah Kode)

> Next steps:
>
> 1. Buat `ProductService` + `ProductDto`
> 2. Tambah route & guard bila diperlukan
> 3. Tambah unit tests & skeleton loading
> 4. Integrasi PWA cache/sync untuk list produk
