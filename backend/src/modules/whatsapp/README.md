# 📱 Módulo WhatsApp - Evolution API Integration

Este módulo integra o sistema de notificações com a Evolution API do WhatsApp, permitindo o envio de mensagens automáticas após notificações em tempo real.

## 🚀 Funcionalidades

- ✅ Integração com Evolution API
- 📋 Templates de mensagens para diferentes tipos de notificações
- 🔒 Rate limiting (1 mensagem por minuto por usuário)
- 🕐 Horário de silêncio configurável
- 📊 Monitoramento e logs integrados
- 🔄 Retry automático com backoff exponencial
- ⚙️ Configuração via variáveis de ambiente

## 📋 Tipos de Notificações Suportadas

| Tipo | Template | Prioridade |
|------|----------|------------|
| `TASK_CREATED` | 📝 Nova tarefa: {title} | MEDIUM |
| `TASK_STATUS_CHANGED` | 🔄 Status alterado: {title} → {new_status} | MEDIUM |
| `COMMENT_CREATED` | 💬 Novo comentário em: {title} | LOW |
| `TIMER_STARTED` | ⏰ Timer iniciado: {title} | LOW |
| `TIMER_PAUSED` | ⏸️ Timer pausado: {title} | LOW |

## 🔧 Configuração

### Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# WhatsApp Evolution API Configuration
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_INSTANCE=your-instance-name
WHATSAPP_BASE_URL=https://your-evolution-api.com.br
WHATSAPP_DELAY=1000
WHATSAPP_ENABLED=true
```

### Preferências do Usuário

Os usuários podem configurar suas preferências de WhatsApp:

- **whatsappNotificationsEnabled**: Habilitar/desabilitar notificações
- **whatsappPriorityThreshold**: Prioridade mínima (LOW, MEDIUM, HIGH, URGENT)
- **whatsappQuietHoursStart**: Início do horário de silêncio (HH:mm)
- **whatsappQuietHoursEnd**: Fim do horário de silêncio (HH:mm)

## 📡 API Endpoints

### Configuração

```http
GET /whatsapp/config
```

Retorna a configuração atual do WhatsApp.

```http
POST /whatsapp/config
Content-Type: application/json

{
  "apiKey": "your-api-key",
  "instance": "your-instance",
  "baseUrl": "https://your-evolution-api.com.br",
  "delay": 1000,
  "enabled": true
}
```

Atualiza a configuração do WhatsApp.

### Teste de Envio

```http
POST /whatsapp/send
Content-Type: application/json

{
  "number": "559999999999",
  "text": "Mensagem de teste",
  "delay": 1000
}
```

Envia uma mensagem de teste (requer autenticação).

## 🔒 Segurança

- **Rate Limiting**: Máximo de 1 mensagem por minuto por usuário
- **Validação de Telefone**: Formato brasileiro (559999999999)
- **Horário de Silêncio**: Respeita o período configurado pelo usuário
- **Prioridade**: Apenas notificações com prioridade >= ao threshold do usuário
- **Retry**: Máximo de 3 tentativas com backoff exponencial

## 📊 Monitoramento

O módulo integra-se com o `DebugLoggerService` existente e registra:

- Mensagens enviadas com sucesso
- Falhas no envio
- Tempo de resposta da API
- Rate limiting aplicado
- Erros de validação

## 🔄 Fluxo de Integração

1. Sistema cria notificação → EventEmitter dispara evento
2. EventsGateway recebe evento e cria notificação no banco
3. Envia via WebSocket para usuário conectado
4. **Verifica se usuário tem WhatsApp ativado**
5. **Formata mensagem baseada no tipo**
6. **Envia via Evolution API**
7. **Registra resultado no log**

## 🛠️ Tratamento de Erros

- **Erros 5xx**: Retry automático com backoff exponencial
- **Erros 4xx**: Log de erro sem retry
- **Rate Limit**: Mensagem adicionada à fila para próximo envio
- **Telefone Inválido**: Log de aviso e skip do envio
- **Usuário sem WhatsApp**: Log debug e continuação normal

## 📚 Exemplos de Uso

### Enviar Notificação Manualmente

```typescript
import { WhatsAppService } from './modules/whatsapp/services/whatsapp.service';
import { User } from './modules/user/entities/user.entity';
import { StructuredNotificationEntity } from './modules/notification/entities/structured-notification.entity';

// No seu serviço...
constructor(private readonly whatsappService: WhatsAppService) {}

async sendWhatsAppNotification(user: User, notification: StructuredNotificationEntity) {
  const result = await this.whatsappService.sendNotification(user, notification);
  
  if (result.success) {
    console.log(`WhatsApp message sent: ${result.messageId}`);
  } else {
    console.error(`WhatsApp failed: ${result.error}`);
  }
}
```

### Formatar Mensagem Manualmente

```typescript
import { MessageFormatterService } from './modules/whatsapp/factories/message-formatter.factory';

// No seu serviço...
constructor(private readonly messageFormatter: MessageFormatterService) {}

const formattedMessage = this.messageFormatter.formatMessage(notification);
```

## 🚨 Troubleshooting

### Mensagens não estão sendo enviadas

1. Verifique se `WHATSAPP_ENABLED=true`
2. Confirme que o usuário tem `whatsappNotificationsEnabled=true`
3. Verifique a prioridade da notificação vs `whatsappPriorityThreshold`
4. Confira se está dentro do horário de silêncio
5. Valide o formato do telefone (559999999999)

### Evolution API retorna erro

1. Verifique a `WHATSAPP_API_KEY`
2. Confirme o `WHATSAPP_INSTANCE` está correto
3. Verifique a `WHATSAPP_BASE_URL`
4. Confirme que a instância está online

### Rate limiting muito agressivo

Ajuste a lógica no método `checkRateLimit` do `WhatsAppService`.

## 📖 Referência da Evolution API

- **Documentação**: [Evolution API Docs](https://doc.evolution-api.com/)
- **Endpoint de Envio**: `POST /message/sendText/{instance}`
- **Autenticação**: Header `apikey: {apikey}`

## 🤝 Contribuindo

Para adicionar novos tipos de notificações:

1. Adicione ao enum `NotificationType` em `whatsapp.types.ts`
2. Adicione o template em `MessageFormatterService`
3. Atualize a prioridade se necessário
4. Teste com diferentes cenários

---

**Última atualização**: 14/09/2025  
**Versão**: 1.0.0