# Resubmissão à Apple – Guideline 2.1 (travamento no iPad)

## O que foi corrigido

1. **Navegação após login**  
   A navegação para a tela principal (`/(tabs)`) passou a ser feita no próximo tick (`setTimeout(..., 0)`), depois de o React commitar o estado (token/usuário). Isso evita a condição de corrida em que a tela protegida era montada antes da atualização do contexto, o que podia deixar o app travado ou sem resposta no iPad.

2. **Registro de notificações push**  
   O registro de push passou a ser executado com um pequeno atraso (500 ms) após a navegação, para não competir com a atualização da UI logo após o login.

3. **Timeout nas requisições de API**  
   Foi adicionado timeout de 30 segundos em todas as chamadas da API. Em caso de rede lenta ou indisponível, o app exibe mensagem de erro em vez de ficar carregando indefinidamente.

4. **Estado de loading no login**  
   O estado de loading da tela de login é sempre limpo no `finally`, inclusive em caso de sucesso, evitando botão preso em “carregando”.

5. **Safe area na tela inicial**  
   A tela “Grupos” (primeira após o login) passou a usar `useSafeAreaInsets()` para o cabeçalho, garantindo layout correto em iPhone e iPad (incluindo iPad Air 11").

6. **Proteção contra redirecionamentos em loop**  
   Em `ProtectedRoute`, foi adicionada uma ref para evitar múltiplos redirecionamentos para a tela de login em sequência.

## Como testar antes de enviar

- **iPad:** Simulador ou dispositivo (ex.: iPad Air 11"), fluxo: abrir app → login (e-mail ou Apple/Google) → ver lista de grupos e usar o app normalmente.
- **iPhone:** Mesmo fluxo para garantir que nada quebrou.

## Resposta sugerida à Apple (App Store Connect)

Você pode colar algo assim na resposta à rejeição:

---

We have addressed the issue where the app could become unresponsive after login on iPad.

**Changes made:**

- We fixed a timing issue: navigation to the main screen now happens after the auth state is committed, preventing the UI from freezing on iPad (and other devices).
- We added a 30-second timeout to all API requests so the app no longer hangs on slow or failing networks.
- We deferred push notification registration until after navigation so it does not block the main thread right after login.
- We ensured the first screen after login uses proper safe area insets so layout is correct on all supported iPads (including iPad Air 11").

**Testing:**

We have tested the app on iPad (including iPad Air 11" with iPadOS) and iPhone. The login flow and main screens now remain responsive in all tested scenarios.

---

## Build e envio

- Build atual configurado: **17** (iOS) em `app.json` e `Info.plist`.
- Gerar build: `eas build --platform ios --profile production`
- Enviar: `eas submit --platform ios` (ou usar “Submit” no EAS após o build).
