---
name: developer
description: This skill should be used when working on the World of Sunsets codebase (Next.js sunset-photo map app) — when asked to "add a feature", "fix a bug", "change the map", "change the moderation flow", "add an API route", "change the database schema", or any code change inside this repository. Provides project orientation, how to run/build/verify, and known gotchas that are not obvious from the code alone.
---

# Разработка World of Sunsets

Карта закатов на Next.js: пользователи загружают фото → модерация на
`/preadmin` → одобренные фото видны на карте мира (Leaflet/OpenStreetMap) с
кластеризацией меток и фильтром по времени.

Этот файл — быстрая ориентация и предупреждение о неочевидных ловушках.
Подробности — в `docs/`, а не здесь (не дублировать, а ссылаться):

- **`docs/requirements.md`** — что сервис обязан делать.
- **`docs/architecture.md`** — стек, структура репозитория, модель данных,
  потоки данных запрос-к-запросу.
- **`docs/modules.md`** — что лежит в каждом файле `src/lib/` и
  `src/components/`, какой API-роут за что отвечает.
- **`docs/decisions.md`** — почему сделано именно так, включая уже
  найденные и исправленные баги (не наступать на те же грабли повторно).

Перед нетривиальным изменением прочитать соответствующий раздел
`docs/architecture.md` или `docs/modules.md` — там короче и точнее, чем
разбираться по коду с нуля.

## Быстрый старт

```bash
npm install
npm run dev      # http://localhost:3000, http://localhost:3000/preadmin
npm run build    # обязательно прогонять перед тем, как считать задачу сделанной
npm run lint
```

`.env` в репозитории уже настроен для локальной разработки (SQLite в
`data/db.sqlite`, фото в `data/uploads/`, `ADMIN_PASSWORD=changeme`). Обе
директории `data/` гитигнорены — не коммитить.

Менять схему БД:

```bash
# отредактировать prisma/schema.prisma, затем:
npx prisma migrate dev --name <описание_изменения>
```

## Критичные ловушки

Прочитать перед тем, как трогать соответствующую область — иначе легко
воспроизвести уже однажды исправленный баг.

1. **Любой компонент с картой должен грузиться через
   `next/dynamic(() => import(...), { ssr: false })`.** `leaflet` обращается
   к `window` на уровне импорта модуля — без `ssr:false` сборка (`npm run
   build`) падает с `ReferenceError: window is not defined` на прегенерации
   `/`. Уже подключены так: `LeafletMapView` и `AddSunsetForm` (в
   `MapApp.tsx`) — если добавляется третий компонент с картой внутри (или
   компонент, который *импортирует* что-то, что тянет `leaflet`), его тоже
   нужно так подключать. Подробности: `docs/architecture.md#рендеринг-карты-и-ssr`.

2. **Не апгрейдить Prisma не глядя.** Зафиксирована версия `6.19.3` — на
   `latest` в какой-то момент попадает `8.0.0-rc.*`, у которой ломаный граф
   зависимостей (`ETARGET`) и другой подход к конфигурации БД (driver
   adapters вместо `datasource { url = env(...) }`). Перед апгрейдом версии
   в `package.json` проверить, что это не `-rc.`/`-dev.` тег, и прочитать
   `docs/decisions.md#prisma-6193-а-не-latest`.

3. **SQLite-путь в `.env` резолвится относительно `prisma/schema.prisma`,
   не от корня репозитория.** `DATABASE_URL="file:../data/db.sqlite"` →
   реальный файл в `<repo>/data/db.sqlite`. В Railway-проде путь абсолютный
   (`file:/data/db.sqlite`), там этой тонкости нет.

4. **Карте на главной странице запрещено уезжать за полюса** —
   `maxBounds`/`maxBoundsViscosity` в `LeafletMapView.tsx`, привязаны к
   пределу проекции Web Mercator (±85.0511°). Если меняется логика
   границ/зума, проверить, что пустое пространство за полюсами по-прежнему
   недостижимо (см. `docs/decisions.md#границы-карты`).

5. **Мини-карта в форме добавления требует `map.invalidateSize()` после
   монтирования** (компонент `SizeFixer` в `MiniLocationPicker.tsx`) —
   иначе внутри модалки Leaflet иногда замеряет контейнер как 0×0 и
   остаётся пустой. Если мини-карта снова перестанет рисовать тайлы —
   начать отсюда, не с сети/тайлового сервера.

6. **`storage.ts` — единственная защита от path traversal.**
   `resolveUploadPath()` проверяет, что итоговый путь не выходит за
   `UPLOAD_DIR`. Любой новый код, работающий с `imagePath`/`thumbPath` из
   БД или с пользовательским вводом, обязан идти через эту функцию, а не
   собирать пути к файлам напрямую через `path.join`.

7. **Каждый `admin/*`-роут сам проверяет cookie** через
   `isAdminRequest(req)` — общего middleware нет. Новый admin-роут без этой
   проверки в начале хендлера будет публично доступен.

8. **`ESLint` включает `react-hooks/set-state-in-effect`.** Паттерн
   `useEffect(() => { doAsyncFetch() }, [])`, где `doAsyncFetch` синхронно
   вызывает `setState` до `await`, будет падать на линте. Смотреть, как это
   обойдено в `MapApp.tsx`/`ModerationList.tsx`/`PhotoModal.tsx` —
   везде используется локальный флаг `cancelled`, проверяемый перед
   `setState` внутри `.then()`, а не вызов стейт-сеттера синхронно в теле
   эффекта.

## Как проверять изменения

`npm run build` и `npm run lint` — обязательный минимум, но они не ловят
ошибки поведения (Leaflet — рантайм-библиотека, многие баги проявляются
только в браузере). Полная проверка «руками»:

**Через API (быстро, без браузера)** — поднять `npm run dev` и прогнать
реальный цикл через `curl`: загрузить фото (`POST /api/sunsets`, multipart:
`image`, `takenAt`, `lat`, `lng`), залогиниться в `/api/admin/login`,
проверить `/api/admin/sunsets` (pending), approve/decline, проверить, что
`/api/sunsets` отдаёт фото только после approve, а decline реально удаляет
файлы из `data/uploads/<id>/`. Это ловит регрессии в бизнес-логике
(валидация, геокодирование, статус-переходы) без браузера.

**Через браузер (нужно для UI/карты)** — headless Chromium через
Playwright, если не установлен: `npm install -D playwright && npx
playwright install chromium` (это тяжёлая одноразовая загрузка ~300MB,
после проверки — `npm uninstall playwright`, в проекте нет этой зависимости
постоянно). Открыть `http://localhost:3000`, скриншот; для мини-карты —
открыть форму «Add sunset» и подождать ~1с (даёт время на попытку
геолокации и подгрузку тайлов) перед скриншотом; для границ карты —
симулировать `mouse.down/move/up` через `.leaflet-container` и убедиться,
что карта не показывает пустое пространство.

## Деплой

Не выполнять деплой самостоятельно без явной просьбы пользователя — это
затрагивает внешний сервис (Railway) и общий git-репозиторий. Инструкция
для пользователя — в корневом `README.md`.

## Язык

README, `docs/` и этот скилл — на русском (по решению пользователя). Код,
идентификаторы и комментарии в коде — на английском, как в остальной
экосистеме Next.js/TypeScript; не переводить их при правках.
