import React from 'react';


export default function TermosTarologaPage() {
    return (
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 font-heading text-gradient-primary">Termos da Taróloga</h1>
            <p className="text-muted-foreground mb-12">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

            <div className="prose prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Relacionamento com a Plataforma</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Ao se cadastrar como Profissional (Taróloga, Cartomante, Astróloga, etc.) na Isidis, você atua como um
                        prestador de serviços independente. Não há vínculo empregatício, parceria, joint venture ou relação de agência
                        entre você e a Isidis. A plataforma age unicamente como um intermediador tecnológico conectando você aos Consulentes.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Código de Ética e Conduta</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Como profissional, você deve oferecer seus serviços com respeito, honestidade e clareza. Você concorda em:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-2">
                        <li>Não prescrever tratamentos médicos ou fazer diagnósticos de saúde (física ou mental).</li>
                        <li>Não garantir resultados como o retorno de entes queridos, curas financeiras mágicas, entre outros.</li>
                        <li>Manter a confidencialidade de todas as informações compartilhadas pelo Consulente durante as sessões.</li>
                        <li>Fornecer o serviço com a qualidade e atenção profissional esperadas.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Remuneração e Taxas da Plataforma</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Em contrapartida pelos serviços da Isidis (infraestrutura, marketing e processamento de pagamentos),
                        será cobrada uma taxa sobre cada consulta realizada ou serviço vendido, conforme estipulado e acordado em seu painel profissional.
                        O valor líquido será creditado em sua carteira, estando disponível para saque conforme nossas políticas de pagamento.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Disponibilidade e Prazos</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Você é responsável por gerenciar sua disponibilidade, agendas e prazos de resposta (para serviços assíncronos/gigs).
                        Atrasos no atendimento podem resultar em reembolso integral ao Consulente pelo serviço não prestado e penalizações na
                        classificação do seu perfil.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Perfis e Informações Pessoais</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Você deve fornecer informações verdadeiras e completas e manter seu perfil atualizado. Você é a única responsável
                        pelos conteúdos (fotos, descrições, ofertas) postados e garante ter o direito de usá-los sem ferir direitos de terceiros.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Rescisão</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Qualquer violação grave as regras, código de ética ou denúncias fundamentadas de comportamento abusivo poderão gerar a
                        suspensão ou encerramento permanente da sua conta, a exclusivo critério da Isidis.
                    </p>
                </section>
            </div>
        </div>
    );
}
