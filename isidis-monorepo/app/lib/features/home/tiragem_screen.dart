import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/mystic_bottom_nav.dart';

class TiragemScreen extends StatefulWidget {
  const TiragemScreen({super.key});

  @override
  State<TiragemScreen> createState() => _TiragemScreenState();
}

class _TiragemScreenState extends State<TiragemScreen> {
  int? _revealingId;

  Future<void> _handleReveal(int id) async {
    setState(() => _revealingId = id);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() => _revealingId = null);
    context.go('/readers');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: const MysticBottomNav(currentTab: MysticTab.tiragem),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          children: [
            Text('Tire suas cartas', style: theme.textTheme.headlineLarge),
            const SizedBox(height: 8),
            Text(
              'Conecte-se com sua intuição e escolha o caminho que deseja iluminar agora.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 28),
            Row(
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.gold,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text('Carta do dia', style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Escolha um período e receba sua orientação gratuita.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            Row(
              children: _dailyCards
                  .map(
                    (card) => Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: card.id == _dailyCards.last.id ? 0 : 12,
                        ),
                        child: _DailyCard(
                          card: card,
                          loading: _revealingId == card.id,
                          onTap: () => _handleReveal(card.id),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 32),
            Text('Tiragens rápidas', style: theme.textTheme.titleLarge),
            const SizedBox(height: 14),
            ..._quickReadings.map(
              (reading) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _QuickReadingCard(reading: reading),
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.plum, AppColors.nightBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: AppColors.primaryLight.withValues(alpha: 0.15),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: const Text(
                            'Premium',
                            style: TextStyle(
                              color: AppColors.goldLight,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'Leitura personalizada\ncom especialista',
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Receba uma tiragem exclusiva feita por cartomantes profissionais.',
                          style: theme.textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: 160,
                          child: ElevatedButton(
                            onPressed: () => context.go('/readers'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.gold,
                              foregroundColor: AppColors.textPrimary,
                            ),
                            child: const Text('Ver especialistas'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppColors.gold,
                      size: 34,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withValues(alpha: 0.16),
                    ),
                    child: const Icon(
                      Icons.lightbulb_rounded,
                      color: AppColors.primaryLight,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Dica espiritual',
                          style: theme.textTheme.titleSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Antes de escolher as cartas, respire fundo e foque na pergunta que deseja clarear.',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DailyCard extends StatelessWidget {
  final _DailyCardData card;
  final bool loading;
  final VoidCallback onTap;

  const _DailyCard({
    required this.card,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 180),
        scale: loading ? 0.96 : 1,
        child: Container(
          height: 176,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              colors: card.colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: card.colors.last.withValues(alpha: 0.3),
                blurRadius: 22,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(card.icon, color: Colors.white, size: 38),
                      const SizedBox(height: 12),
                      Text(
                        card.label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (loading)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickReadingCard extends StatelessWidget {
  final _QuickReading reading;

  const _QuickReadingCard({required this.reading});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.primaryDark],
              ),
            ),
            child: Center(
              child: Text(reading.emoji, style: const TextStyle(fontSize: 24)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(reading.title, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(reading.description, style: theme.textTheme.bodySmall),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ...List.generate(
                      reading.cards,
                      (_) => Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(right: 5),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.gold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${reading.cards} ${reading.cards == 1 ? 'carta' : 'cartas'}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 96,
            child: ElevatedButton(
              onPressed: () => context.go('/readers'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding: EdgeInsets.zero,
              ),
              child: const Text('Começar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _DailyCardData {
  final int id;
  final String label;
  final IconData icon;
  final List<Color> colors;

  const _DailyCardData({
    required this.id,
    required this.label,
    required this.icon,
    required this.colors,
  });
}

class _QuickReading {
  final String title;
  final String description;
  final int cards;
  final String emoji;

  const _QuickReading({
    required this.title,
    required this.description,
    required this.cards,
    required this.emoji,
  });
}

const _dailyCards = [
  _DailyCardData(
    id: 1,
    label: 'Manhã',
    icon: Icons.wb_sunny_rounded,
    colors: [Color(0xFFF5B555), Color(0xFFE26D3D)],
  ),
  _DailyCardData(
    id: 2,
    label: 'Tarde',
    icon: Icons.auto_awesome_rounded,
    colors: [Color(0xFFA77CF3), Color(0xFF7C4ACB)],
  ),
  _DailyCardData(
    id: 3,
    label: 'Noite',
    icon: Icons.dark_mode_rounded,
    colors: [Color(0xFF6D7BFF), Color(0xFF233A7A)],
  ),
];

const _quickReadings = [
  _QuickReading(
    title: 'Tiragem do Sim ou Não',
    description: 'Resposta rápida e direta para a sua pergunta.',
    cards: 1,
    emoji: '❔',
  ),
  _QuickReading(
    title: 'Tiragem de 3 Cartas',
    description: 'Passado, presente e futuro da situação.',
    cards: 3,
    emoji: '🔮',
  ),
  _QuickReading(
    title: 'Cruz Celta',
    description: 'Uma leitura completa para entender o cenário.',
    cards: 10,
    emoji: '✨',
  ),
];
