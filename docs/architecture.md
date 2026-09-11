# Архитектура

## Стек

| Слой | Технология | Зачем именно она |
|---|---|---|
| Фреймворк | Next.js 16 (App Router, TypeScript) | Один процесс отдаёт и фронтенд, и API — не нужен отдельный бэкенд-сервис для прототипа |
| Карта | Leaflet + тайлы OpenStreetMap | Бесплатно, без API-ключей, в отличие от Google Maps |
| Кластеризация меток | `react-leaflet-cluster` (обёртка над `leaflet.markercluster`) | Готовая реализация схлопывания меток в круг с числом + zoom по клику |
| База данных | SQLite (через Prisma ORM) | Ноль внешних сервисов для локальной разработки; в проде — файл на Railway Volume |
| Хранилище фото | Локальная файловая система (`UPLOAD_DIR`) | В проде — та же Railway Volume, что и под БД |
| Обработка изображений | `sharp` | Генерация уменьшенной (`full`, ≤1600px) и превью (`thumb`, 120×120) версий в WebP |
| Геокодирование | Публичный Nominatim API (OpenStreetMap) | Бесплатно; см. лимиты в [decisions.md](decisions.md) |
| Авторизация модерации | Cookie с HMAC-подписью, без БД сессий | Одна страница, один пароль из env — не нужна полноценная auth-система |

Полное обоснование каждого выбора — в [decisions.md](decisions.md).

## Структура репозитория

```
src/
  app/                      # Next.js App Router
    page.tsx                # главная страница (рендерит MapApp)
    preadmin/page.tsx        # серверная проверка cookie → LoginForm | ModerationList
    api/
      sunsets/               # GET (список approved), POST (загрузка нового фото)
      sunsets/[id]/           # GET детали одного approved-фото
      uploads/[...path]/      # отдаёт файлы фото из UPLOAD_DIR
      admin/login|logout/     # выдача/удаление cookie сессии
      admin/sunsets/          # GET список pending (требует cookie)
      admin/sunsets/[id]/approve|decline/
  components/                # клиентские React-компоненты (см. modules.md)
    admin/                    # LoginForm, ModerationList
  lib/                        # общая серверная логика, без React
    db.ts                     # синглтон Prisma Client
    storage.ts                # чтение/запись файлов в UPLOAD_DIR
    image.ts                  # sharp: full + thumb
    geocode.ts                # обратное геокодирование через Nominatim
    auth.ts                   # подпись/проверка cookie сессии, проверка пароля
    types.ts                  # общие TS-типы фронта (SunsetMarker, SunsetDetail, …)
prisma/
  schema.prisma               # модель Sunset
  migrations/                 # история миграций SQLite
data/                         # локальный дев: db.sqlite + uploads/ (гитигнор)
docs/                         # этот каталог
.claude/skills/developer/     # скилл для разработки через Claude Code
```

## Модель данных

Единственная сущность — `Sunset` (`prisma/schema.prisma`):

```prisma
model Sunset {
  id        String       @id @default(cuid())
  imagePath String       // путь к полноразмерному фото относительно UPLOAD_DIR
  thumbPath String       // путь к миниатюре
  takenAt   DateTime     // UTC — время съёмки, введённое пользователем
  lat       Float
  lng       Float
  placeName String?      // кэш результата обратного геокодирования
  colorR    Int          // средний цвет фото (0-255 на канал),
  colorG    Int          // вычисляется один раз при загрузке —
  colorB    Int          // используется цветовым фильтром на карте
  status    SunsetStatus @default(PENDING)  // PENDING | APPROVED | DECLINED
  createdAt DateTime     @default(now())
}
```

`DECLINED` как статус в схеме не используется — Decline сразу удаляет запись
(см. `api/admin/sunsets/[id]/decline/route.ts`). Значение оставлено в enum
для читаемости и на случай, если понадобится «мягкое» отклонение вместо
удаления.

## Потоки данных

### 1. Загрузка фото (`POST /api/sunsets`)

```
Браузер (AddSunsetForm)
  → multipart FormData: image, takenAt (ISO UTC), lat, lng
  → POST /api/sunsets
      1. валидация (тип файла, размер ≤10MB, диапазоны lat/lng, дата)
      2. sharp: буфер изображения → full.webp + thumb.webp
      3. storage.writeUploadFile() — запись обоих файлов в UPLOAD_DIR/<id>/
      4. geocode.reverseGeocode(lat, lng) — запрос к Nominatim, best-effort
      5. prisma.sunset.create({ status: PENDING, ... })
  ← { id }
```

Время (`takenAt`) пересчитывается в UTC на клиенте: `datetime-local`
интерпретируется браузером как локальное время устройства, а
`new Date(value).toISOString()` уже даёt корректный UTC — ручная работа с
часовым поясом на сервере не нужна.

### 2. Модерация

```
GET  /api/admin/sunsets            — список PENDING (требует валидную cookie)
POST /api/admin/sunsets/[id]/approve  — status → APPROVED
POST /api/admin/sunsets/[id]/decline  — DELETE строки + deleteSunsetFiles(id)
POST /api/admin/reset                 — DELETE всех строк + всех файлов (полный сброс, необратимо)
```

Каждый admin-роут сам проверяет cookie через `isAdminRequest()`
(`lib/auth.ts`) — отдельного middleware нет, проверка инлайн в каждом
хендлере.

### 3. Просмотр карты

```
GET /api/sunsets?window=hour|day|week|anytime
  → prisma.sunset.findMany({ status: APPROVED, takenAt: { gte: now - window } })
  → [{ id, thumbUrl, lat, lng }]   (без деталей — для меток на карте)

GET /api/sunsets/[id]
  → полная запись, только если status === APPROVED
  → { id, imageUrl, thumbUrl, takenAt, lat, lng, placeName }
```

### 4. Отдача файлов

`GET /api/uploads/[...path]` читает файл из `UPLOAD_DIR` через
`storage.readUploadFile()` и отдаёт с `Content-Type: image/webp` и
годовым `Cache-Control`. Путь нормализуется и проверяется на выход за
пределы `UPLOAD_DIR` (защита от path traversal).

## Рендеринг карты и SSR

Leaflet обращается к `window` уже на этапе импорта модуля — это ломает
серверный рендеринг Next.js. Поэтому все компоненты, которые (прямо или
транзитивно) импортируют `leaflet`/`react-leaflet`, подключаются через
`next/dynamic(..., { ssr: false })`:

- `LeafletMapView` (главная карта) — подключается динамически в `MapApp`.
- `AddSunsetForm` — тоже подключается динамически в `MapApp`, потому что
  сам импортирует `MiniLocationPicker`, а тот — `react-leaflet`.

Если в будущем понадобится ещё один компонент с картой внутри, его тоже
нужно подключать через `dynamic(..., { ssr: false })`, иначе сборка упадёт
с `ReferenceError: window is not defined` на статической прегенерации
страницы (это уже происходило один раз в истории проекта — см.
[decisions.md](decisions.md)).

## Цветовой фильтр на карте

Поверх тайлов рисуется полупрозрачный градиент из цветов загруженных фото —
там, где фото много, цвет насыщенный и совпадает с тем, что преобладает на
снимках рядом; вдали от любых фото — прозрачно, видна обычная карта.

- При загрузке (`POST /api/sunsets`) `lib/image.ts` считает средний цвет
  фото через `sharp().stats()` и сохраняет его как `colorR/G/B` (0-255 на
  канал) в записи `Sunset`.
- `GET /api/sunsets` отдаёт этот цвет вместе с каждой меткой (`color: [r,g,b]`),
  уже отфильтрованной по `window` — то есть оверлей красится только по
  фото, видимым в текущем фильтре времени.
- `lib/colorFilterLayer.ts` — кастомный `L.Layer` (не React-компонент:
  Leaflet-слои создаются через `L.Layer.extend()` и добавляются
  императивно). Рисует низкое разрешение (56×36) цветовой сетки в отдельный
  `<canvas>` внутри собственного Leaflet pane, затем растягивает эту сетку
  на весь экран (`ctx.drawImage` с масштабированием) — получается плавный
  градиент вместо резких квадратов, и не нужно на каждый пиксель экрана
  считать расстояние до всех фото.
- Каждая ячейка сетки: инверсно-взвешенное по расстоянию (IDW) среднее
  цветов всех фото из текущего фильтра — вес фото `= 1 / max(расстояние_км,
  MIN_DISTANCE_KM)`, цвет ячейки — взвешенное среднее (нормировка на сумму
  весов), альфа-канал отдельно затухает с той же суммой весов. Формулы,
  константы и почему это IDW, а не буквально «сумма/count» — см.
  [decisions.md](decisions.md#цветовой-фильтр-медианный-цвет-по-региону).
- Пересчитывается на события карты `moveend`/`zoomend`/`resize` — не на
  каждый кадр перетаскивания, поэтому не проседает по производительности
  даже при активном использовании мыши.
- `components/ColorFilterOverlay.tsx` — единственная точка контакта с React:
  создаёт слой один раз через `useMap()`, дальше только вызывает
  `layer.setPhotos()` при изменении списка (смена фильтра времени, новые
  approved-фото).
