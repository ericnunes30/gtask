# Plano: Testes Unitários Backend - Módulos Críticos

## Objetivo

Atender o critério 2.1 do Quality Gate:

> Testes unitários por módulo crítico (>=1 spec)

Módulos críticos auditados pelo Quality Gate:
- `auth`
- `tasks`
- `notification`
- `comment`
- `project`

## Escopo

- Criar **pelo menos 1 spec por módulo crítico**.
- Focar em **serviços** (camada de domínio), pois são mais fáceis de testar e têm mais lógica.
- Usar **Jest + ts-jest** (já configurados).
- Não testar integração com banco real; mockar repositórios e serviços externos.
- Não cobrir `whatsapp` (fora de escopo por enquanto).

## Serviços-alvo

| Módulo | Serviço | Lógica a testar |
|---|---|---|
| `auth` | `AuthService` | login, validateUser, refreshToken, verifyToken |
| `tasks` | `TaskService` | create/update/find, timers, regras de negócio |
| `notification` | `NotificationService` | criação, marcação como lida, query helper |
| `comment` | `CommentService` | criação, likes, permissões |
| `project` | `ProjectService` | CRUD, validações |

## Estratégia

1. Criar mocks manuais ou usar `jest.spyOn` para repositórios TypeORM.
2. Mockar serviços colaboradores (`NotificationRecipientService`, `UserService`, etc.).
3. Manter testes isolados e rápidos.
4. Garantir que `npm run test` passe.
5. Garantir que `npm run test:cov` atualize `coverage-summary.json` com percentuais reais.

## Validação

- `npm run test`
- `npm run test:cov`
- `npm run quality-gate` → N1 12/12, N2 2.1 passando
