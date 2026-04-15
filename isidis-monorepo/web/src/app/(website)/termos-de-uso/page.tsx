import React from 'react';


export default function TermosDeUsoPage() {
    return (
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 font-heading text-gradient-primary">Termos de Uso</h1>
            <p className="text-muted-foreground mb-12">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

            <div className="prose prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Aceitação dos Termos</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Ao acessar e usar a plataforma Isidis, você concorda em cumprir e se vincular a estes Termos de Uso.
                        Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Descrição do Serviço</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        A Isidis é uma plataforma que conecta pessoas buscando orientação e leituras (Consulentes)
                        a profissionais qualificados (Tarólogos, Cartomantes, etc.). Nós fornecemos a tecnologia perante a
                        qual as conexões são feitas e as consultas são pagas.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Conta do Usuário</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Para acessar certas funções da plataforma, você deve criar uma conta. Você é responsável por manter a confidencialidade das
                        informações da sua conta, incluindo sua senha, e por qualquer atividade que ocorra nela. Nós nos reservamos o direito de
                        encerrar contas a nosso critério exclusivo, se acreditarmos que você violou os Termos.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Pagamentos e Reembolsos</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        As transações na Isidis são processadas por terceiros seguros. Nós nos reservamos o direito de recusar ou cancelar qualquer pedido por qualquer motivo.
                        Políticas de reembolso seguem o código de defesa do consumidor e os termos específicos dispostos nos Termos do Consulente.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Limitação de Responsabilidade</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        As leituras e serviços oferecidos pelos profissionais na plataforma são para fins de entretenimento e orientação pessoal.
                        A Isidis não se responsabiliza pelas decisões que os usuários (Consulentes) tomam com base nestas leituras.
                        Conselhos médicos, legais ou financeiros não são fornecidos e as leituras não devem ser tratadas como tal.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Modificações dos Termos</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Podemos revisar estes Termos de Uso ocasionalmente. A versão mais atualizada estará sempre nesta página.
                        Se continuarmos a utilizar o serviço após as revisões entrarem em vigor, você estará sujeito aos termos revisados.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Contato</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Para dúvidas ou preocupações a respeito destes Termos de Uso, entre em contato conosco através dos canais de suporte da Isidis.
                    </p>
                </section>
            </div>
        </div>
    );
}
