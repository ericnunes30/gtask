# ⚠️ WhatsApp Notifications - DISABLED

## Status

**WhatsApp notifications are currently DISABLED.**

## Reason

A API do WhatsApp não está mais sendo utilizada para economizar custos.

## Configuration

Para reativar as notificações do WhatsApp no futuro, adicione ao `.env`:

```bash
WHATSAPP_ENABLED=true
```

## Current Behavior

- ✅ Notificações via WebSocket funcionam normalmente (navegador)
- ❌ Notificações via WhatsApp estão desabilitadas
- ✅ O módulo WhatsApp permanece no código para futura reativação

## Migration Notes

O módulo `whatsapp` existe mas **não está integrado** ao sistema de notificações. Para reativar:

1. Configurar `WHATSAPP_ENABLED=true` no `.env`
2. Importar `WhatsAppModule` no `app.module.ts`
3. Injetar `WhatsAppService` no `events.gateway.ts`
4. Conectar os handlers de eventos para enviar notificações via WhatsApp
5. Configurar as variáveis de ambiente da API:
   - `WHATSAPP_API_KEY`
   - `WHATSAPP_INSTANCE`
   - `WHATSAPP_BASE_URL`

---

**Data:** 2026-01-03
**Motivo:** Economia de custos com API
