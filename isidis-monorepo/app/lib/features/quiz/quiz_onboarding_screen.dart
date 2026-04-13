import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

// ── Modelo de opção do quiz ───────────────────────────────────────────────────

class _QuizOption {
  final String label;
  final String value;
  final IconData icon;

  const _QuizOption({
    required this.label,
    required this.value,
    required this.icon,
  });
}

// ── Tela principal ────────────────────────────────────────────────────────────

class QuizOnboardingScreen extends StatefulWidget {
  const QuizOnboardingScreen({super.key});

  @override
  State<QuizOnboardingScreen> createState() => _QuizOnboardingScreenState();
}

class _QuizOnboardingScreenState extends State<QuizOnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;
  bool _loading = false;

  String? _intention;
  String? _modality;
  String? _urgency;

  static const _intentionOptions = [
    _QuizOption(label: 'Amor e relacionamentos',    value: 'AMOR',            icon: Icons.favorite_rounded),
    _QuizOption(label: 'Carreira e trabalho',       value: 'CARREIRA',        icon: Icons.work_rounded),
    _QuizOption(label: 'Finanças',                  value: 'FINANCAS',        icon: Icons.attach_money_rounded),
    _QuizOption(label: 'Saúde e bem-estar',         value: 'SAUDE',           icon: Icons.spa_rounded),
    _QuizOption(label: 'Espiritualidade',           value: 'ESPIRITUALIDADE', icon: Icons.auto_awesome_rounded),
    _QuizOption(label: 'Família',                   value: 'FAMILIA',         icon: Icons.people_rounded),
    _QuizOption(label: 'Uma decisão importante',    value: 'DECISAO',         icon: Icons.help_outline_rounded),
  ];

  static const _modalityOptions = [
    _QuizOption(label: 'Mensagens diretas e objetivas',   value: 'BARALHO_CIGANO', icon: Icons.style_rounded),
    _QuizOption(label: 'Insights profundos e simbólicos', value: 'TAROT',          icon: Icons.auto_stories_rounded),
    _QuizOption(label: 'Orientação suave e intuitiva',    value: 'ORACULO',        icon: Icons.cloud_rounded),
    _QuizOption(label: 'Análise do meu mapa pessoal',     value: 'ASTROLOGIA',     icon: Icons.nights_stay_rounded),
    _QuizOption(label: 'Me surpreenda',                   value: 'OUTRO',          icon: Icons.shuffle_rounded),
  ];

  static const _urgencyOptions = [
    _QuizOption(label: 'Agora, estou ansioso/a',    value: 'AGORA',          icon: Icons.bolt_rounded),
    _QuizOption(label: 'Nos próximos dias',         value: 'PROXIMOS_DIAS',  icon: Icons.calendar_today_rounded),
    _QuizOption(label: 'Quero explorar com calma',  value: 'COM_CALMA',      icon: Icons.self_improvement_rounded),
  ];

  bool get _canAdvance => switch (_currentPage) {
    0 => _intention != null,
    1 => _modality != null,
    2 => _urgency != null,
    _ => false,
  };

  void _select(String value) {
    setState(() {
      switch (_currentPage) {
        case 0: _intention = value;
        case 1: _modality = value;
        case 2: _urgency = value;
      }
    });
  }

  Future<void> _nextOrSubmit() async {
    if (!_canAdvance) return;

    if (_currentPage < 2) {
      await _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
      setState(() => _currentPage++);
      return;
    }

    setState(() => _loading = true);
    try {
      await api.post('/me/quiz', data: {
        'intention': _intention,
        'modality': _modality,
        'urgency': _urgency,
      });
      if (!mounted) return;
      context.go('/home');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Erro ao salvar preferências. Tente novamente.'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Barra de progresso ──────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                children: List.generate(3, (i) {
                  return Expanded(
                    child: Container(
                      height: 3,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: i <= _currentPage
                            ? AppColors.primary
                            : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),

            // ── Conteúdo das páginas ────────────────────────────────────────
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _QuizPage(
                    title: 'O que você busca?',
                    subtitle: 'Escolha o tema da sua consulta',
                    options: _intentionOptions,
                    selected: _intention,
                    onSelect: _select,
                  ),
                  _QuizPage(
                    title: 'Qual tipo de leitura?',
                    subtitle: 'Escolha a modalidade que mais combina com você',
                    options: _modalityOptions,
                    selected: _modality,
                    onSelect: _select,
                  ),
                  _QuizPage(
                    title: 'Qual a sua urgência?',
                    subtitle: 'Isso nos ajuda a encontrar o melhor serviço para você',
                    options: _urgencyOptions,
                    selected: _urgency,
                    onSelect: _select,
                  ),
                ],
              ),
            ),

            // ── Botão de ação ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: (_canAdvance && !_loading)
                        ? AppColors.gradientPrimary
                        : null,
                    color: (_canAdvance && !_loading)
                        ? null
                        : AppColors.textMuted,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton(
                    onPressed: (_canAdvance && !_loading) ? _nextOrSubmit : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      disabledBackgroundColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            _currentPage < 2 ? 'Próximo' : 'Ver minha leitura',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Página do quiz ────────────────────────────────────────────────────────────

class _QuizPage extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<_QuizOption> options;
  final String? selected;
  final ValueChanged<String> onSelect;

  const _QuizPage({
    required this.title,
    required this.subtitle,
    required this.options,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView.separated(
              itemCount: options.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final opt = options[i];
                return _OptionTile(
                  option: opt,
                  selected: opt.value == selected,
                  onTap: () => onSelect(opt.value),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Tile de opção ─────────────────────────────────────────────────────────────

class _OptionTile extends StatelessWidget {
  final _QuizOption option;
  final bool selected;
  final VoidCallback onTap;

  const _OptionTile({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.15)
              : AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? AppColors.primaryLight
                : AppColors.primaryLight.withValues(alpha: 0.08),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                option.icon,
                color: selected ? AppColors.primaryLight : AppColors.textMuted,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                option.label,
                style: TextStyle(
                  color: selected ? AppColors.textPrimary : AppColors.textSecondary,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 15,
                ),
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle_rounded,
                color: AppColors.primaryLight,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
