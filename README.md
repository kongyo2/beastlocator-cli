# BeastLocator CLI

`BeastLocator` Androidアプリの仕様を、`TypeScript + React + Ink`で対話型CLIに移植した版です。

## Important

- 目的地座標は **固定ハードコード** です。
- 固定値は `35.665554, 139.669717` のみです。
- `env` による目的地変更は実装していません。
- ランダム目的地機能は実装していません。

## Stack

- Runtime: Node.js (ESM / ESNext)
- UI: `ink`, `@inkjs/ui`
- Validation: `zod`
- Error Handling: `neverthrow`
- Linter: `oxlint`

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run lint:strict
npm run test
npm run build
npm run check
```

## Architecture

- `src/contracts`: API/型/スキーマ/エラー契約
- `src/domain`: 純粋ロジック（距離・方角・到達判定・進捗・デバッグ距離計算）
- `src/infra`: 永続化・逆ジオコーダ・OSSカタログ実装
- `src/application`: 状態遷移と副作用オーケストレーション
- `src/ui`: Ink画面とインタラクション

アプリコードでは例外を直接投げず、失敗は`Result`/`ResultAsync`で扱います。
