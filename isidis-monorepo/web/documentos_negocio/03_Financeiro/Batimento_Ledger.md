# Política e Batimento de Ledger

Esse documento estabelece o ritual entre dados de transações Supabase e dados extrato faturamento do Gatway (AbacatePay). 

## 1. O que é o Batimento?
É a verificação matemática para conferir se o dinheiro líquido da carteira eletrônica (*Wallet*) de cada Taróloga na base do sistema confere rigorosamente com as sobras do caixa de transações da custódia do AbacatePay da empresa Magicplace.

## 2. Ritual de Batimento quinzenal / mensal

### 2.1 Passos
1. Acessar tela Administrativa de Finanças na interface Web. Avaliar todo Saldo Bloqueado e Saldo Pendente na Plataforma atual global.
2. Tirar cópia do extrato oficial digital bancário da Conta AbacatePay do respectivo tempo pesquisado.
3. Somar a quantidade total global disponível no Supabase de todas as tarólogas que devem ter recursos a receber.
4. Conferir: A conta do provedor AbacatePay PJ (ou caixa central) possui recurso suficiente para suportar um "Saque em Massa Global Instantâneo" de todo o passivo em conta se houvesse na empresa? 
   - Exemplo: Meu saldo no DB diz que as profissionais juntas têm o direito sacar 3.000 Reais. Se olhar meu Dashboard de intermediador e existir somente 2.900, ocorreu uma falha grave, tarifa contábil mal preenchida, ou um Saque Corrompido com RPC estourado de DB. O saldo do ecossistema central tem que ser maior (pois a fatia Mágicplace sempre mora lá) que as dívidas ativas da wallet.

5. Arquivar a saúde da métrica nos livros corporativos de finança e contabilidade. Documento a ser evocado caso necessário.
