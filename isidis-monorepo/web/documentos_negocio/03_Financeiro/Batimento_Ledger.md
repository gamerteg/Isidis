# PolÃ­tica e Batimento de Ledger

Esse documento estabelece o ritual entre dados de transacoes do Supabase e o extrato financeiro da operacao de pagamentos da plataforma.

## 1. O que Ã© o Batimento?
E a verificacao matematica para conferir se o dinheiro liquido da carteira eletronica (*Wallet*) de cada tarologa na base do sistema confere com o caixa de transacoes da operacao financeira central da empresa.

## 2. Ritual de Batimento quinzenal / mensal

### 2.1 Passos
1. Acessar tela Administrativa de FinanÃ§as na interface Web. Avaliar todo Saldo Bloqueado e Saldo Pendente na Plataforma atual global.
2. Tirar copia do extrato oficial digital da conta operacional usada para receber os pagamentos no periodo pesquisado.
3. Somar a quantidade total global disponÃ­vel no Supabase de todas as tarÃ³logas que devem ter recursos a receber.
4. Conferir: A conta operacional da empresa (ou caixa central) possui recurso suficiente para suportar um "Saque em Massa Global Instantaneo" de todo o passivo em conta se isso fosse necessario? 
   - Exemplo: Meu saldo no DB diz que as profissionais juntas tÃªm o direito sacar 3.000 Reais. Se olhar meu Dashboard de intermediador e existir somente 2.900, ocorreu uma falha grave, tarifa contÃ¡bil mal preenchida, ou um Saque Corrompido com RPC estourado de DB. O saldo do ecossistema central tem que ser maior (pois a fatia MÃ¡gicplace sempre mora lÃ¡) que as dÃ­vidas ativas da wallet.

5. Arquivar a saÃºde da mÃ©trica nos livros corporativos de finanÃ§a e contabilidade. Documento a ser evocado caso necessÃ¡rio.




