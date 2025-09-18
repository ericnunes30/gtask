# Test PATCH Endpoint - Notification Update

## Endpoint Implementado

**Método:** PATCH  
**URL:** `/notifications/:id`  
**Headers:** `Authorization: Bearer <token>`  
**Body:** JSON com campos a serem atualizados (parcial)

## Exemplos de Uso

### 1. Atualizar apenas o título da notificação
```bash
curl -X PATCH "http://localhost:3000/notifications/123" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Novo título da notificação"
  }'
```

### 2. Marcar como lida e atualizar prioridade
```bash
curl -X PATCH "http://localhost:3000/notifications/123" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "isRead": true,
    "priority": "high"
  }'
```

### 3. Atualizar dados da notificação
```bash
curl -X PATCH "http://localhost:3000/notifications/123" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "customField": "novo valor",
      "anotherField": 42
    }
  }'
```

## Campos Disponíveis para Atualização (parcial)

Como o DTO usa `PartialType()`, todos os campos da notificação podem ser atualizados individualmente:

- `title` (string) - Título da notificação
- `message` (string) - Mensagem da notificação
- `type` (string) - Tipo da notificação
- `priority` (string) - Prioridade (low, medium, high, urgent)
- `isRead` (boolean) - Status de leitura
- `metadata` (object) - Metadados adicionais
- `data` (object) - Dados específicos da notificação
- `expiresAt` (Date) - Data de expiração

## Respostas

### Sucesso (200 OK)
```json
{
  "id": 123,
  "userId": 456,
  "title": "Novo título",
  "message": "Mensagem original",
  "type": "task_update",
  "priority": "high",
  "isRead": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "readAt": "2024-01-02T00:00:00.000Z",
  "expiresAt": null,
  "metadata": {},
  "data": {}
}
```

### Erros
- **401 Unauthorized**: Token inválido ou não fornecido
- **404 Not Found**: Notificação não encontrada ou não pertence ao usuário
- **500 Internal Server Error**: Erro ao processar a atualização

## Implementação

### Controller (`notification.controller.ts`)
- Adicionado import `UpdateNotificationDto`
- Adicionado endpoint `@Patch(':id')` com autenticação manual
- Implementado método `patchNotification()` com validação de token

### Service (`notification.service.ts`)
- Adicionado import `UpdateNotificationDto`
- Implementado método `update()` que:
  - Verifica propriedade da notificação
  - Atualiza apenas campos fornecidos
  - Retorna notificação atualizada
  - Adiciona logs de debug

## Características do PATCH

1. **Atualização Parcial**: Apenas os campos enviados no body são atualizados
2. **Autenticação**: Requer token JWT válido
3. **Autorização**: Usuário só pode atualizar suas próprias notificações
4. **Validação**: Verifica existência da notificação antes de atualizar
5. **Logs**: Registra eventos de atualização para debug

## Próximos Passos

1. Testar o endpoint com diferentes cenários
2. Verificar se a autenticação está funcionando corretamente
3. Validar se os campos estão sendo atualizados parcialmente
4. Testar casos de erro (notificação não encontrada, token inválido, etc.)