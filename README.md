# World of Sunsets

Карта, на которую люди загружают фотографии закатов. Каждое фото проходит
модерацию, прежде чем появиться на публичной карте.

Подробная документация — в [`docs/`](docs/README.md). Гайд для разработки
через Claude Code — в [`.claude/skills/developer/SKILL.md`](.claude/skills/developer/SKILL.md).

## Стек

- Next.js (App Router, TypeScript) — один сервис для фронтенда и API
- Leaflet + тайлы OpenStreetMap, кластеризация меток через `react-leaflet-cluster`
- SQLite (через Prisma) для данных, локальная файловая система для фото
- Обратное геокодирование через публичный Nominatim API

## Локальная разработка

```bash
npm install
npm run dev
```

Откройте http://localhost:3000. `.env` уже настроен для локальной разработки
(файл SQLite в `data/db.sqlite`, фото в `data/uploads/`, обе директории в
`.gitignore`).

Смените `ADMIN_PASSWORD` в `.env`, прежде чем полагаться на `/preadmin`
всерьёз — по умолчанию там `changeme`.

### Модерация

Откройте http://localhost:3000/preadmin, введите `ADMIN_PASSWORD`. Там
показан список фото на модерации с кнопками Allow/Decline. Decline удаляет
файлы фото и запись из базы; Allow делает фото видимым на публичной карте.

## Деплой на Railway

1. Создайте проект в Railway и подключите этот git-репозиторий.
2. Добавьте **Volume**, примонтированный на `/data`. На нём хранится и файл
   базы SQLite, и загруженные фото — поэтому сервис должен оставаться в
   одном инстансе (без горизонтального масштабирования), что и так требуется
   самим механизмом Volume.
3. Задайте переменные окружения сервиса:
   - `DATABASE_URL=file:/data/db.sqlite`
   - `UPLOAD_DIR=/data/uploads`
   - `ADMIN_PASSWORD=<настоящий пароль>`
   - `SESSION_SECRET=<длинная случайная строка>`
   - `NOMINATIM_USER_AGENT=WorldOfSunsets/1.0 (you@example.com)` (по
     [политике использования Nominatim](https://operations.osmfoundation.org/policies/nominatim/)
     нужен реальный контакт)
4. `git push` — Railway соберёт проект через `npm run build` и запустит
   `npm run start`, который перед `next start` выполняет
   `prisma migrate deploy` (миграции трогают Volume только в рантайме, не на
   этапе сборки).

## Известные ограничения

- Только один инстанс, поскольку и SQLite, и хранилище фото живут на одном
  Volume. Для прототипа этого достаточно; при необходимости масштабирования
  за пределы одного инстанса стоит пересмотреть (Postgres + объектное
  хранилище) — подробнее в [`docs/decisions.md`](docs/decisions.md).
- Обратное геокодирование использует публичный эндпоинт Nominatim (один
  запрос на загрузку, результат кэшируется в записи) — укладывается в его
  политику использования при таком объёме, но при реальном масштабе
  потребуется собственный инстанс Nominatim.
- Карта — 2D (Leaflet/OpenStreetMap), не 3D-глобус: см. обоснование в
  [`docs/decisions.md`](docs/decisions.md).
