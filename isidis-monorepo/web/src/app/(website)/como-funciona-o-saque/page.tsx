import React from 'react';


export default function ComoFuncionaSaquePage() {
    return (
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 font-heading text-gradient-primary">Como Funciona o Saque</h1>
            <p className="text-muted-foreground mb-12">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

            <div className="prose prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Ciclo de Faturamento</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Ao realizar uma leitura ou prestar um serviço assíncrono (gigs) através da Isidis, os valores líquidos devidos
                        a você, após a dedução da taxa de serviço da plataforma, são creditados em sua "Carteira Virtual" ("My Wallet").
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Limites e Regras de Saque</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Para garantir a segurança financeira das operações:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-2">
                        <li><strong>Valor Mínimo para Saque:</strong> Existe um limite mínimo estipulado em sua carteira que deve ser atingido antes que o saque seja liberado.</li>
                        <li><strong>Chave PIX ou Conta Bancária:</strong> Os pagamentos serão processados exclusivamente para a chave selecionada e conta em sua titularidade. Transferências para contas de terceiros não são autorizadas.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Prazo de Processamento</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Após a solicitação do saque no seu painel profissional, ele passará pelo processo de análise padrão de segurança:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-2">
                        <li><strong>Período de Compensação:</strong> Pedidos podem demorar até 5 dias úteis para serem processados.</li>
                        <li>Nos esforçamos para liberar os repasses em até D+2 nas solicitações validadas.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Relatórios e Transparência</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Todos os históricos das consultas, serviços e deduções por taxas ficam devidamente listados no painel "Minha Carteira", garantindo extrema transparência do que foi ganho e debitado.
                    </p>
                </section>

            </div>
        </div>
    );
}
