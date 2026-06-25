# Correção: WebSocket + Refresh Token

## Problema

A cada ~15 minutos (tempo de expiração do access token), o WebSocket e/ou a sessão deixam de funcionar corretamente. A investigação revelou falhas no backend de refresh token e no frontend de gerenciamento de conexão WebSocket.

## Causas Raiz

### Backend

1. **Access e refresh tokens usam o mesmo segredo** (`JWT_SECRET`).
   - Arquivo: `backend/src/modules/auth/services/auth.service.ts`.
   - Refresh token deveria usar um segredo próprio (`JWT_REFRESH_SECRET`).

2. **Refresh não faz token rotation**.
   - `refreshToken()` retorna apenas `{ accessToken: newAccessToken }`.
   - Padrão de mercado: retornar novo access + novo refresh token.

### Frontend

3. **WebSocket captura token no momento do import do módulo**.
   - Arquivo: `frontend/src/services/backend/websocket/ws.ts`.
   - O token é lido do `localStorage` uma única vez.
   - Reconexões usam o token antigo/expirado.

4. **`socketStore` não é reativa à mudança de `accessToken`**.
   - Arquivo: `frontend/src/stores/socketStore.ts`.
   - `updateAuth()` só é chamado na montagem do `AppInitializer`.
   - Após refresh silencioso via axios, `socket.auth` continua desatualizado.

5. **Flag `tokenRefreshAttempted` nunca reseta**.
   - Após a primeira tentativa de refresh no `connect_error`, o socket nunca mais tenta.

6. **Axios interceptor não atualiza WebSocket após refresh**.
   - Arquivo: `frontend/src/services/backend/api.ts`.
   - Após refresh bem-sucedido, só atualiza header HTTP.

7. **`useGetCurrentUser` redireciona em 401 antes do refresh**.
   - Arquivo: `frontend/src/services/backend/auth/index.ts`.
   - Pode deslogar o usuário mesmo com refresh token válido.

8. **Dois gerenciadores de socket** (`SocketContext.tsx` e `socketStore.ts`).
   - `SocketContext.tsx` parece não ser usado, causando confusão e potencial duplicação.

## Solução

### Backend

- Adicionar `JWT_REFRESH_SECRET` ao `.env`.
- Configurar `AuthService` para usar `JWT_REFRESH_SECRET` na verificação do refresh token.
- Implementar token rotation: `refreshToken()` retorna `{ accessToken, refreshToken }`.
- Atualizar `RefreshTokenDto` e `auth.controller.ts` conforme necessário.

### Frontend

- Refatorar `ws.ts` para exportar uma função de criação/configuração do socket, permitindo atualização dinâmica de `socket.auth`.
- Tornar `socketStore` reativa a mudanças de `accessToken` via listener de store ou efeito.
- Resetar `tokenRefreshAttempted` após `connect` bem-sucedido.
- Fazer o interceptor axios notificar a socket store após refresh bem-sucedido.
- Adicionar interceptor de request que leia token atual da store/localStorage.
- Remover redirect abrupto em 401 do `useGetCurrentUser`.
- Remover/deprecar `SocketContext.tsx`.

## Validação

- Backend:
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run quality-gate` N1 12/12
  - Testar endpoint `POST /auth/refresh` retornando access + refresh
- Frontend:
  - `tsc --noEmit`
  - `npm run lint` ou `npx eslint`
  - Teste manual: login, esperar/forçar expiração de access token, verificar reconexão WebSocket com novo token

## Branches

- Backend: `fix/backend-refresh-token`
- Frontend: `fix/frontend-websocket-refresh`
