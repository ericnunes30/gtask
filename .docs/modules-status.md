# Status dos Módulos

Estado de cada módulo do backend em relação ao roadmap de evolução.

---

## 🟡 Módulos em estado de "integração futura"

Estes módulos existem no código mas **NÃO devem ser refatorados, testados
ou ter complexidade reduzida** neste ciclo. Serão integrados ao produto
em um release futuro, quando o modelo de mensageria estiver definido.

### `whatsapp/`

- **Status:** stub de integração, não usado em produção
- **Não aplicar:** N2.1 (testes), N2.5 (max-lines), N2.9 (complexidade)
- **Exceções registradas:**
  - 2.5 — `whatsapp.service.ts` (455 linhas) — **aceito**, aguardando integração
  - 2.9 — método `sendMessage` (complexidade 27) — **aceito**, aguardando integração
- **Quando reavaliar:** quando o módulo for promovido a feature ativa
  (então será refatorado e testado junto com o N2.1)

**Módulos cobertos pela exceção:**

- `src/modules/whatsapp/services/whatsapp.service.ts`
- `src/modules/whatsapp/factories/message-formatter.factory.ts`
- `src/modules/whatsapp/controllers/whatsapp.controller.ts`

---

## 🟢 Módulos ativos (Nível 2 aplicável)

Todos os demais módulos sob `src/modules/*` seguem o critério 2.x do
[Quality Gate](./quality-gates.md) normalmente.
