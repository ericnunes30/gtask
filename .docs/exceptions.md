# Exceções do Quality Gate

## 1.7 — Dependências mortas (depcheck)

As dependências abaixo são mantidas intencionalmente, mesmo sendo reportadas como "não utilizadas" pelo depcheck, porque são ferramentas de infraestrutura/auditoria ou dependências transitórias necessárias ao workflow:

- @types/jest: tipos do Jest usados pelo TypeScript/ESLint para checagem dos arquivos `.spec.ts`.
- @nestjs/schematics: dependência do @nestjs/cli para scaffolding (nest generate).
- @types/pg: tipos do driver PostgreSQL — mantido para compatibilidade com queries nativas.
- depcheck: ferramenta usada pelo próprio critério 1.7 do Quality Gate.
- jscpd: ferramenta usada pelo critério 2.10 do Quality Gate (detecção de duplicação de código).
- tsconfig-paths: usado no script test:debug para resolução de paths do Jest.
- unimported: ferramenta usada pelo critério 1.12 do Quality Gate.

## 1.12 — Arquivos mortos (unimported)

Alguns padrões são ignorados propositalmente no .unimportedrc.json:

- src/database/**: arquivos de configuração do TypeORM CLI e migrations são referenciados via glob em app.module.ts e executados pelo CLI, não importados estaticamente.
- src/config/*.debug.ts: scripts de debug opcionais.
- src/modules/whatsapp/**: módulo de integração futura, fora do escopo ativo.
- bufferutil e utf-8-validate: dependências opcionais de performance do ws (WebSocket), resolvidas automaticamente quando presentes.
