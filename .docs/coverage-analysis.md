# Análise: Coverage do Backend Gerado na Raiz

## Problema

O relatório de cobertura do Jest do backend está sendo gerado em `G:/novosApps/manager-group/coverage/` em vez de `G:/novosApps/manager-group/backend/coverage/`.

## Causa Raiz

No `backend/package.json`, a configuração inline do Jest define:

```json
{
  "jest": {
    "rootDir": ".",
    "coverageDirectory": "../coverage"
  }
}
```

Como `rootDir` é `.` (backend) e `coverageDirectory` é `../coverage`, o relatório sobe um nível e grava na raiz do monorepo.

O Quality Gate (`backend/scripts/quality-gate.ts`) espera o resumo em:

```ts
const summaryPath = path.join(BACKEND_DIR, 'coverage', 'coverage-summary.json');
```

Ou seja, espera `backend/coverage/coverage-summary.json`. Atualmente, quando o coverage é gerado na raiz, o gate não encontra o arquivo no backend e reporta:

> "sem testes/cobertura gerada (jest --passWithNoTests sem specs)"

## Impactos

1. **Diretório `coverage/` na raiz** polui o workspace e pode ser commitado por engano (embora já esteja no `.gitignore` raiz).
2. **Quality Gate 2.3 falha** mesmo quando os testes rodam, porque procura o `coverage-summary.json` no lugar errado.
3. **Configuração de cobertura muito ampla**: `collectCoverageFrom: ["**/*.(t|j)s"]` inclui arquivos fora do `src/` (ex.: `dist`, `node_modules`, scripts de bench).

## Solução Proposta

### 1. Corrigir `backend/package.json`

```json
{
  "jest": {
    "rootDir": ".",
    "testMatch": ["**/src/**/*.spec.ts", "**/test/**/*.spec.ts"],
    "collectCoverageFrom": [
      "src/**/*.(t|j)s",
      "!src/**/*.d.ts",
      "!src/database/migrations/**/*.ts",
      "!src/console.ts"
    ],
    "coverageDirectory": "./coverage"
  }
}
```

- `coverageDirectory` passa a apontar para `backend/coverage`.
- `collectCoverageFrom` limita a análise ao `src/`, excluindo migrations e tipos.

### 2. Garantir `.gitignore`

O `backend/.gitignore` já ignora `/coverage`. O `.gitignore` raiz também já ignora `coverage`. Nenhuma mudança adicional é necessária, mas vale confirmar que `coverage-summary.json` nunca será commitado.

### 3. Validar Quality Gate

Após a correção, rodar:

```bash
cd backend
npm run test:cov
npm run quality-gate
```

O critério 2.3 deve encontrar `backend/coverage/coverage-summary.json` e avaliar corretamente a cobertura.

## Validação

| Verificação | Status Esperado |
|---|---|
| `npm run test:cov` | ✅ gera `backend/coverage/coverage-summary.json` |
| `npm run quality-gate` | ✅ N1 12/12; N2 2.3 lê coverage do path correto |
| `tsc --noEmit` | ✅ zero erros |
| `npm run lint` | ✅ zero erros |
