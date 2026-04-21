import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { ArrowRight, Sparkles, Shield, Zap, Star, Users, Camera, MessageCircle, ShieldCheck, Heart } from 'lucide-react'
import { PractitionerCard, type PractitionerProps } from '@/components/practitioner-card'

import { getLandingStats } from '@/lib/data/stats'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { listReaders, mapReaderToPractitioner } from '@/lib/readers'
const InteractiveTarotCards = React.lazy(() => import('@/components/interactive-tarot-cards').then(m => ({ default: m.InteractiveTarotCards })))
import { BetaBanner } from '@/components/beta-banner'
import { MainHero } from '@/components/marketing/MainHero'

const getFeaturedReaders = async (): Promise<PractitionerProps[]> => {
  const response = await listReaders({ limit: 8 })

  return response.data
    .map(mapReaderToPractitioner)
    .filter((reader) => reader.gigId !== undefined)
}

export default function Home() {
  const [readers, setReaders] = useState<PractitionerProps[]>([])
  const [stats, setStats] = useState({ totalConsultations: 0, satisfactionRate: 0, activeReaders: 0, averageRating: 0 })

  useEffect(() => {
    getFeaturedReaders().then(setReaders).catch(() => setReaders([]))
    getLandingStats().then(setStats)
  }, [])

  return (
    <div className="flex flex-col">
      <BetaBanner />
      <MainHero
        badge="O Marketplace de Tarot mais Moderno do Brasil"
        badgeIcon={<img src="/logo.png" alt="" width={16} height={16} className="w-4 h-4 object-contain" />}
        title={
          <>
            Encontre clareza para sua <em className="italic font-normal text-gradient-aurora">jornada espiritual</em>
          </>
        }
        description="Conecte-se com as melhores cartomantes do país em uma experiência única. Receba leituras profundas com áudio, vídeo e fotos das cartas, tudo em um só lugar."
        primaryButton={{ text: 'Agendar Leitura Agora', href: '/cartomantes' }}
        secondaryButton={{ text: 'Como Funciona', href: '#como-funciona' }}
        stats={{ activeReaders: stats.activeReaders }}
      />



      {/* =============== SOCIAL PROOF =============== */}
      <PageSection padding="md" variant="muted">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-around gap-8 md:gap-16 text-center">
            {[
              { value: stats.totalConsultations > 0 ? `${stats.totalConsultations}+` : '0', label: 'Consultas Realizadas', icon: Zap },
              { value: stats.satisfactionRate > 0 ? `${stats.satisfactionRate}%` : '100%', label: 'Satisfação Garantida', icon: Heart },
              { value: stats.activeReaders > 0 ? `${stats.activeReaders}+` : '0', label: 'Cartomantes', icon: Users },
              { value: stats.averageRating > 0 ? `${stats.averageRating}` : '5.0', label: 'Avaliação Média', icon: Star, fill: true },
            ].map((stat, i) => (stat &&
              <div key={stat.label} className="group cursor-default">
                <div className="flex items-center gap-3 mb-1 justify-center">
                  {stat.icon && <stat.icon className={cn("w-6 h-6 text-primary", stat.fill && "fill-primary")} />}
                  <p className="text-3xl md:text-4xl font-mono font-bold text-gradient-aurora tracking-tighter">
                    {stat.value}
                  </p>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== O DIFERENCIAL (ENTREGA RICA) =============== */}
      <PageSection padding="xl" id="diferencial" withOrbs>
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-10 bg-primary/10 blur-[100px] rounded-full opacity-50" />
              <InteractiveTarotCards />

            </div>

            <div className="order-1 lg:order-2">
              <PageHeader
                badge="A Experiência Isidis"
                title="Longe de ser apenas um chat de texto"
                description="Nós entregamos um produto digital completo. Sua leitura contém fotos reais das cartas tiradas, áudios detalhados com a voz da cartomante e uma interpretação escrita."
                className="mb-8"
              />

              <div className="space-y-8">
                {[
                  {
                    icon: Camera,
                    title: 'Visual Imersivo',
                    desc: 'Veja cada carta tirada em alta resolução. A transparência que você merece.'
                  },
                  {
                    icon: MessageCircle,
                    title: 'Voz e Alma',
                    desc: 'Ouça a interpretação da cartomante através de áudios exclusivos para sua tiragem.'
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Histórico Eterno',
                    desc: 'Sua tiragem fica gravada no seu dashboard para ser revisitada sempre que precisar.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass border-white/10 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-500">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== PRACTITIONERS =============== */}
      <PageSection>
        <PageContainer>
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 text-center md:text-left">
            <PageHeader
              badge="Curadoria Especial"
              title="As Vozes do Oráculo"
              description="Especialistas selecionadas a dedo para garantir a melhor orientação possível."
              className="mb-0"
              titleClassName="text-3xl md:text-4xl"
            />
            <Button variant="ghost" className="text-primary font-bold gap-2 mt-6 md:mt-0 hover:bg-primary/10 h-12 rounded-xl" asChild>
              <Link to="/cartomantes">
                Ver Todas as Profissionais <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {readers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {readers.map((p, i) => (
                <div key={p.id} className={cn("animate-fade-in-up", `delay-${(i % 4) + 1}`)}>
                  <PractitionerCard practitioner={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 animate-fade-in-up glass rounded-3xl border-dashed border-white/10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-6">
                <Users className="w-10 h-10 text-primary/30" />
              </div>
              <h3 className="text-2xl font-bold mb-2 italic">Novos portais se abrindo...</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Estamos finalizando a curadoria das melhores cartomantes do Brasil. Ouse esperar pelo extraordinário.
              </p>
              <Button className="mt-8 font-bold rounded-xl px-10 h-12" asChild>
                <Link to="/register">Ser Notificado</Link>
              </Button>
            </div>
          )}
        </PageContainer>
      </PageSection>

      {/* =============== COMO FUNCIONA =============== */}
      <PageSection padding="xl" id="como-funciona" variant="card">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:pr-12">
              <PageHeader
                badge="Simplicidade"
                title="4 Passos para clareza"
                description="Transformamos milênios de conhecimento em uma experiência digital suave e segura."
                align="left"
              />
              <div className="hidden lg:block">
                <div className="p-6 glass rounded-2xl border-white/10 mt-12">
                  <p className="text-lg font-bold italic text-primary">"Isidis me deu a clareza que eu precisava em um momento de transição de carreira. A interface é mágica."</p>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm select-none">
                      MS
                    </div>
                    <div className="text-sm">
                      <div className="font-bold">Mariana S.</div>
                      <div className="opacity-50">Cliente há 2 meses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  step: '01',
                  icon: Users,
                  title: 'Escolha seu guia',
                  desc: 'Navegue pelos perfis e escolha a profissional que mais ressoa com seu momento atual. Veja especialidades e avaliações reais.'
                },
                {
                  step: '02',
                  icon: Zap,
                  title: 'Pagamento Mágico (PIX)',
                  desc: 'Sem burocracias. Pague via PIX com QR Code ou Copia e Cola. O sistema identifica seu pagamento em segundos e libera o pedido.'
                },
                {
                  step: '03',
                  icon: Sparkles,
                  title: 'Receba o Oráculo',
                  desc: 'Em pouco tempo sua tiragem estará pronta. Receba uma notificação e acesse seu dashboard para ver a leitura completa.'
                },
                {
                  step: '04',
                  icon: Shield,
                  title: 'Segurança & Sigilo',
                  desc: 'Absolutamente nada do que for dito na leitura sai da plataforma. Sua conta e seus segredos estão protegidos por criptografia.'
                }
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="p-8 glass rounded-3xl border-white/5 group hover:border-primary/30 transition-all duration-500 relative"
                >
                  <div className="absolute top-6 right-8 text-4xl font-black opacity-[0.03] group-hover:opacity-10 transition-opacity">
                    {item.step}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== FAQ =============== */}
      <PageSection padding="xl">
        <PageContainer maxWidth="4xl">
          <PageHeader
            align="center"
            badge="Dúvidas Comuns"
            title="Perguntas Frequentes"
            description="Tudo o que você precisa saber para começar sua jornada com Isidis."
          />

          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: 'Quanto tempo demora para receber a leitura?', a: 'Cada cartomante tem seu prazo de entrega, mas a maioria entrega em menos de 24 horas. Você verá o prazo exato no perfil da profissional antes de contratar.' },
              { q: 'Como recebo o acesso à minha tiragem?', a: 'Assim que a cartomante concluir a leitura, você receberá um e-mail e uma notificação. O conteúdo estará disponível no seu Dashboard em "Minhas Tiragens".' },
              { q: 'O pagamento via PIX é seguro?', a: 'Sim, utilizamos os protocolos de segurança mais rígidos. O pagamento é instantâneo e garantido pela nossa plataforma.' },
              { q: 'E se eu não gostar da leitura?', a: 'Prezamos pela qualidade. Se você tiver qualquer problema com o conteúdo entregue, nosso suporte está pronto para analisar cada caso individualmente.' }
            ].map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass rounded-2xl px-6 border-white/5 data-[state=open]:border-primary/20 transition-colors"
              >
                <AccordionTrigger className="text-base font-bold hover:text-primary py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5 pt-0">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </PageContainer>
      </PageSection>

      {/* =============== CTA FINAL =============== */}
      <PageSection withOrbs className="text-center pb-40">
        <PageContainer maxWidth="4xl">
          <div className="relative">
            {/* Decorative element */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 blur-[100px] rounded-full" />

            <PageHeader
              align="center"
              title={
                <>
                  Pronto para ver o que as <em className="italic font-normal text-gradient-aurora">cartas revelam?</em>
                </>
              }
              description="Junte-se a milhares de pessoas que usam o Isidis para guiar suas decisões e encontrar paz interior."
            />

            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-10">
              <Button size="lg" className="aurora border-shine h-16 px-12 text-lg font-bold rounded-2xl text-white hover:opacity-90" asChild>
                <Link to="/register">
                  Começar minha Jornada
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-12 text-lg font-bold rounded-2xl glass hover:bg-white/5" asChild>
                <Link to="/cartomantes">
                  Explorar Especialistas
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-xs font-bold uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Sigilo Total
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Entrega Rápida
              </span>
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Especialistas Verificadas
              </span>
            </div>
          </div>
        </PageContainer>
      </PageSection>
    </div>
  )
}
