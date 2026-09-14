# Portal Control Center

Технический каркас: React + TypeScript + Vite, ESLint, Vitest, React Testing Library.

## Запуск

Требуется Node.js 20.19+ или 22.12+.

```bash
npm install
npm run dev     # дев-сервер
npm run build   # проверка типов и сборка в dist/
npm run test    # тесты (Vitest, однократный прогон)
npm run lint    # ESLint
```

## Структура

```
src/
  components/   UI-компоненты
  domain/       доменные типы и логика
  data/         исходные данные
  pages/        экраны
  tests/        тесты и настройка тестового окружения
```
