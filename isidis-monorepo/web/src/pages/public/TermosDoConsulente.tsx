import React from 'react';


export default function TermosConsulentePage() {
    return (
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 font-heading text-gradient-primary">Termos do Consulente</h1>
            <p className="text-muted-foreground mb-12">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

            <div className="prose prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Natureza do Serviço</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Ao participar de consultas, leituras de tarot, astrologia, numerologia ou outros serviços terapêuticos e esotéricos (os "Serviços") por meio da plataforma Isidis,
                        você compreende e concorda que estes serviços são focados no seu autoconhecimento e devem ser vistos com propósitos de orientação pessoal,
                        reflexão e entretenimento.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Isenção de Responsabilidade Profissional</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Os serviços oferecidos pelos profissionais (Cartomantes, Tarólogas, etc.) na plataforma Isidis NÃO substituem aconselhamentos profissionais.
                        Isso inclui, mas não se limita a:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-2">
                        <li><strong>Orientação Médica:</strong> Diagnósticos físicos ou tratamentos psicológicos/psiquiátricos.</li>
                        <li><strong>Orientação Jurídica:</strong> Qualquer conselho legal ou representação.</li>
                        <li><strong>Orientação Financeira/Fiscal:</strong> Conselhos sobre investimentos, impostos, e negócios.</li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed mt-2">
                        Você é integralmente responsável pelas decisões ou ações que tomar baseadas nas leituras ou orientações providas.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Regras de Conduta e Respeito</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Requeremos de todos os usuários compostura e respeito. Nenhuma forma de assédio, abuso, preconceito, discurso de ódio ou demanda abusiva
                        em relação os profissionais será tolerada. Caso o profissional se sinta desrespeitado, ele pode encerrar a sessão imediatamente, e não
                        haverá direito a reembolso.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Pagamentos, Cancelamentos e Reembolsos</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        O pagamento da consulta ou serviço avulso deve ser completado através da plataforma por questões de segurança. Tentar negociar por fora
                        fere nossos termos de uso para as partes.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mt-2">
                        Se houver algum problema técnico ou se o profissional não fornecer a leitura dentro do prazo estipulado de um serviço (gig), você terá direito
                        ao reembolso integral da quantia. Caso fique insatisfeito com a qualidade, ou avaliações injustificadas para obter reembolsos que denotem má fé
                        são avaliadas caso a caso e não garantem a aprovação da devolução dos valores.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Idade Mínima</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Você deve ter 18 anos ou mais, para criar uma conta e utilizar os serviços monetizados da Isidis.
                        Ao prosseguir no cadastro, você declara estar dentro desse requisito.
                    </p>
                </section>
            </div>
        </div>
    );
}
