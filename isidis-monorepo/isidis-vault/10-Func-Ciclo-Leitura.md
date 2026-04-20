# 🔮 Funcionalidades: O Ciclo da Leitura (Pedidos)

Esta é a funcionalidade "core" do produto: o processo de entrega da consultoria espiritual.

## 📦 Gestão de Pedidos

### 🔍 Fluxo de Vida do Pedido
1.  `PENDING`: Aguardando pagamento.
2.  `PAID`: Pagamento confirmado, cartomante notificada.
3.  `IN_PROGRESS`: Cartomante aceitou e está realizando a tiragem.
4.  `DELIVERED`: Leitura enviada (fotos, áudio, texto).
5.  `COMPLETED`: Cliente visualizou e avaliou (ou tempo de auto-conclusão expirou).

### 🚀 Melhorias na Entrega (Mobile-First)
1.  **Upload Resiliente:** Cartomantes costumam trabalhar em locais com conexão instável. O upload das fotos das cartas e do áudio da interpretação deve suportar "resume" (retomar de onde parou) se a conexão cair.
2.  **Preview para o Cliente:** O dashboard do cliente deve mostrar um estado visual "A cartomante está embaralhando as cartas..." enquanto o status for `IN_PROGRESS` para reduzir a ansiedade.
3.  **Avaliações (Reviews):** Após a entrega, o fluxo de avaliação deve ser um modal simples e rápido (5 estrelas + comentário curto), otimizado para o polegar no mobile.

---

## 🛠️ Ferramentas da Cartomante (Gigs)

### 🔍 Configuração de Serviços
- Definição de preço, prazo de entrega e descrição do que será entregue (ex: "Tiragem de 3 cartas para Amor").

### 🚀 Melhorias
1.  **Variações de Preço:** Permitir que uma mesma cartomante tenha serviços diferentes (Rápido vs. Profundo).
2.  **Agenda / Disponibilidade:** Botão de "Pausar Recebimento" para quando a cartomante estiver indisponível, removendo-a temporariamente do marketplace sem deletar o perfil.