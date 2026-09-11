# Модули

Справочник «что где лежит и за что отвечает». Для общей картины сначала
см. [architecture.md](architecture.md).

## `src/lib/` — серверная логика без React

| Файл | Отвечает за | Заметки |
|---|---|---|
| `db.ts` | Синглтон `PrismaClient` | Хранится в `globalThis` в dev, чтобы hot-reload Next.js не плодил новые соединения при каждом сохранении файла |
| `storage.ts` | Чтение/запись файлов фото в `UPLOAD_DIR` | `resolveUploadPath()` нормализует путь и **проверяет, что результат не выходит за пределы `UPLOAD_DIR`** — единственная защита от path traversal через `imagePath`/`thumbPath` |
| `image.ts` | `processSunsetImage()`: буфер → `{ full, thumb }` через `sharp` | `full` ≤1600px по большей стороне, `thumb` 120×120 (`cover`), оба WebP |
| `geocode.ts` | `reverseGeocode(lat, lng)` через Nominatim | Best-effort: любая ошибка/таймаут → `null`, загрузка фото не блокируется. Требует `NOMINATIM_USER_AGENT` в env — без него сразу возвращает `null` с предупреждением в лог |
| `auth.ts` | Подпись/проверка cookie сессии модератора, проверка пароля | HMAC-SHA256 от `SESSION_SECRET`, TTL 24ч, сравнение через `crypto.timingSafeEqual` (защита от timing-атак на пароль/подпись) |
| `types.ts` | Общие TS-типы для фронтенда (`SunsetMarker`, `SunsetDetail`, `TimeWindow`, …) | Держать в синхроне с формой ответов API-роутов вручную — общей схемы (zod/trpc) в проекте нет |

## `src/app/api/` — маршруты

| Маршрут | Метод | Доступ | Что делает |
|---|---|---|---|
| `/api/sunsets` | GET | публичный | Список `APPROVED` меток по фильтру `window` |
| `/api/sunsets` | POST | публичный | Загрузка нового фото → запись `PENDING` |
| `/api/sunsets/[id]` | GET | публичный | Полная карточка, только если `APPROVED` (иначе 404) |
| `/api/uploads/[...path]` | GET | публичный | Отдаёт файл фото по относительному пути |
| `/api/admin/login` | POST | публичный (защищён паролем) | Проверяет `ADMIN_PASSWORD`, ставит cookie |
| `/api/admin/logout` | POST | публичный | Удаляет cookie |
| `/api/admin/sunsets` | GET | требует cookie | Список `PENDING` |
| `/api/admin/sunsets/[id]/approve` | POST | требует cookie | `PENDING → APPROVED` |
| `/api/admin/sunsets/[id]/decline` | POST | требует cookie | Удаляет запись из БД и файлы с диска |

Проверка cookie не вынесена в middleware — каждый `admin/*`-роут сам вызывает
`isAdminRequest(req)` в начале. При добавлении нового admin-роута не забыть
эту проверку.

## `src/components/` — публичная карта

- **`MapApp.tsx`** — корневой клиентский компонент главной страницы. Держит
  состояние (`window`, список меток, открытая модалка, открыта ли форма
  добавления), подгружает `LeafletMapView` и `AddSunsetForm` через
  `next/dynamic(..., { ssr: false })` (см. [architecture.md](architecture.md#рендеринг-карты-и-ssr)).
- **`LeafletMapView.tsx`** — сама карта: `MapContainer` + `TileLayer` +
  `MarkerClusterGroup`. Каждая метка — `L.divIcon` с `<img>`-миниатюрой
  (класс `.thumb-marker`, стили в `globals.css`, т.к. HTML маркера рендерится
  вне React-дерева). `maxBounds`/`maxBoundsViscosity` ограничивают панораму
  широтой ±85.0511° (предел проекции Web Mercator, за которым тайлов физически
  нет) — см. [decisions.md](decisions.md#границы-карты).
- **`TimeFilter.tsx`** — переключатель Hour/Day/Week/Anytime, чисто
  презентационный, состояние живёт в `MapApp`.
- **`PhotoModal.tsx`** — полноэкранный просмотр фото, сам грузит
  `GET /api/sunsets/[id]` по `sunsetId` из пропсов.
- **`AddSunsetForm.tsx`** — форма загрузки. Поле «Where» делегировано
  `MiniLocationPicker`, поле «When» — `datetime-local`, по умолчанию текущее
  время устройства. После успешного `POST /api/sunsets` показывает экран
  подтверждения вместо мгновенного закрытия.
- **`MiniLocationPicker.tsx`** — мини-карта в форме. Три важных детали
  реализации:
  1. При маунте один раз пытается `navigator.geolocation.getCurrentPosition`
     молча (без индикатора и без ошибки при отказе) — если не получилось,
     остаётся дефолтный центр, переданный родителем (сейчас — Париж).
  2. `SizeFixer` вызывает `map.invalidateSize()` на следующий кадр после
     монтирования — без этого карта внутри модалки иногда мерила размер
     контейнера до завершения layout и оставалась пустой (см.
     [decisions.md](decisions.md#пустая-мини-карта)).
  3. Метка визуально «приколота» к центру контейнера через CSS
     (`.pin-drop-marker`, абсолютное позиционирование), а не через
     Leaflet-маркер — перемещается пользователь перетаскиванием самой карты
     (паттерн pin-drop), координаты обновляются по событию `moveend`.

## `src/components/admin/` — модерация

- **`LoginForm.tsx`** — форма пароля, `POST /api/admin/login`, при успехе
  `router.refresh()` (перерендер серверного `preadmin/page.tsx`, который и
  решает, что показывать).
- **`ModerationList.tsx`** — список `PENDING` с кнопками Allow/Decline;
  после действия просто убирает карточку из локального состояния (не
  перезапрашивает весь список).

`src/app/preadmin/page.tsx` — серверный компонент, читает cookie через
`cookies()` (Next 16: асинхронный API) и решает `LoginForm` vs
`ModerationList`. Сам не делает fetch — оба клиентских компонента дальше
сами общаются с API.

## Стили

CSS Modules на каждый компонент (`Component.module.css`). Общие/глобальные
вещи — в `src/app/globals.css`:
`leaflet/dist/leaflet.css`, `.thumb-marker*` (маркеры на карте, рендерятся
вне React через `L.divIcon`) и `.pin-drop-marker` (неподвижная метка
мини-карты). CSS `leaflet.markercluster` подключается прямо в
`LeafletMapView.tsx` (`react-leaflet-cluster/dist/assets/*.css`).
