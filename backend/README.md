# Manager Group - Backend

## Testes E2E

Os testes end-to-end (E2E) validam a API completa com um banco PostgreSQL real.

### Requisitos

- Docker e Docker Compose instalados
- Node.js e `npm` (para execução local)

### Configuração

As variáveis de ambiente para os testes estão em `.env.test`:

```env
NODE_ENV=test
PORT=3335
DB_HOST=localhost
DB_PORT=5435
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=manager_group_test
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

> O banco de testes roda na porta `5435` (mapeada do container Docker) para evitar conflito com instâncias locais do Postgres.

### Executar E2E localmente

Certifique-se de que o Postgres de testes está acessível na porta `5435` (pode subir manualmente com `docker-compose -f ../docker-compose.test.yml up -d`):

```bash
npm run test:e2e
```

### Executar E2E com Docker Compose

Para subir o banco automaticamente, rodar os testes e derrubar os containers (mesmo em caso de falha):

```bash
npm run test:e2e:docker
```

Esse comando utiliza o arquivo `docker-compose.test.yml` na raiz do repositório e garante cleanup correto dos containers.
