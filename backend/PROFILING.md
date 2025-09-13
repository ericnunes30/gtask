# Profiling e Benchmark (0x + autocannon)

Este guia mostra como identificar gargalos de performance no backend (NestJS) usando:

- 0x: gera flamegraphs para ver quais funções/módulos consomem mais CPU.
- autocannon: dispara carga HTTP para reproduzir o cenário durante o profiling.

## Pré‑requisitos

- Ter as variáveis de ambiente configuradas em `backend/.env` (porta padrão: 3334; prefixo: `api/v1`).
- Dependências já adicionadas ao projeto: `0x` e `autocannon` (devDependencies).

## Scripts disponíveis

- `npm run profile`: compila e inicia o servidor sob o profiler 0x.
- `npm run bench`: roda um teste de carga padrão em `http://localhost:3334/api/v1/`.
- `npm run bench:custom -- <URL>`: permite escolher a URL a ser testada.
- `npm run bench:discover`: varre controllers e gera `./.bench/routes.json`.
- `npm run bench:all:get -- -c 50 -d 20 -p 10`: testa todas as rotas GET descobertas.
- `npm run profile:all:get -- -c 50 -d 20 -p 10`: sobe 0x, roda o `bench:all:get` e encerra gerando flamegraph.
- `npm run bench:report`: lê os últimos resultados e mostra ranking (p95, RPS).

### WebSocket (Socket.IO)

- `npm run ws:bench -- -c 200 -d 30`: abre N conexões autenticadas, faz join/leave de salas e contabiliza tráfego/erros.
- `npm run ws:profile -- -c 200 -d 30`: sobe o servidor sob 0x e executa o `ws:bench`.

Notas:
- A autenticação WS usa `handshake.auth.token` (JWT). O script cria um usuário temporário e realiza login via REST.
- URL base WS: `WS_URL` (padrão `http://localhost:3334`). Caminho padrão do Socket.IO (`/socket.io`).
- O teste exercita handlers `join-task-room` e `leave-task-room`. Ajuste para emitir outros eventos conforme necessário.

Autenticação com usuário existente
- Para usar um usuário existente nas cargas (REST e WS), informe as credenciais:

```
npm run bench:all:get -- --email "<EMAIL>" --password "<SENHA>"
npm run ws:bench -- --email "<EMAIL>" --password "<SENHA>"
```

- Alternativamente, defina as variáveis de ambiente `BENCH_EMAIL` e `BENCH_PASSWORD`.

## Passo a passo sugerido

1) Terminal A — iniciar o profiler

```
cd backend
npm run profile
```

Isso vai compilar o projeto e iniciar o servidor com o 0x. Mantenha este terminal aberto durante o teste de carga.

2) Terminal B — disparar a carga com o autocannon

Escolha um endpoint relevante (ex.: rota pesada que você suspeita ser gargalo). Exemplos:

- Rota simples (raiz com prefixo):

```
cd backend
npm run bench
```

- Rota customizada:

```
cd backend
npm run bench:custom -- http://localhost:3334/api/v1/tasks
```

Você pode ajustar parâmetros do autocannon adicionando flags após a URL (por exemplo `-c 100 -d 30 -p 10`).

3) Encerrar o servidor perfilado

Após o fim do benchmark, volte ao Terminal A e pressione Ctrl+C para encerrar o servidor. O 0x irá processar os dados e gerar os arquivos no diretório `backend/0x/` (HTML/Speedscope).

4) Analisar o flamegraph e o ranking

Abra o relatório gerado em `backend/0x/` no navegador. Procure pelas “larguras” de blocos (tempo de CPU) e identifique funções/módulos quentes. Combine com logs/metrics para contexto de I/O (ex.: queries). 

Para ver rapidamente os gargalos por rota, rode:

```
npm run bench:report
```

Ele lista por p95 (ms) e por RPS.

## Dicas práticas

- Prefira rodar em modo mais próximo de produção (`NODE_ENV=production`) e com a base de dados real (ou uma cópia).
- Rode um benchmark por endpoint crítico para separar gargalos por caso de uso.
- Para endpoints I/O-bound (DB, rede), combine com métricas do banco (ex.: `EXPLAIN ANALYZE` no Postgres) e logs de latência.
- Garanta que Sentry/logs não dominem o custo do request ao medir lógica de negócio. Se necessário, desative temporariamente sampling/nível de log.
- Repita após otimizações para confirmar ganho.

## Exemplos de comandos úteis

- Aumentar concorrência e duração:

```
npm run bench:custom -- http://localhost:3334/api/v1/tasks -c 100 -d 45 -p 10
```

- Testar autenticação (se necessário), use headers:

```
autocannon -c 50 -d 30 -H "Authorization=Bearer <TOKEN>" http://localhost:3334/api/v1/secure-endpoint
```

## Onde ficam os resultados

- Relatórios 0x: `backend/0x/` (HTML e/ou Speedscope JSON)
- Logs do servidor: `backend/server.log` (pode impactar levemente CPU; ajuste se necessário)
