import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/mystic_bottom_nav.dart';
import '../../shared/widgets/mystic_logo.dart';

class ClientHomeScreen extends StatefulWidget {
  const ClientHomeScreen({super.key});

  @override
  State<ClientHomeScreen> createState() => _ClientHomeScreenState();
}

class _ClientHomeScreenState extends State<ClientHomeScreen> {
  List<dynamic> _featuredReaders = [];
  bool _loadingReaders = true;

  @override
  void initState() {
    super.initState();
    _loadFeaturedReaders();
  }

  Future<void> _loadFeaturedReaders() async {
    try {
      final response = await api.get('/readers');
      if (!mounted) return;
      final all = (response.data['data'] as List<dynamic>?) ?? [];
      setState(() {
        _featuredReaders = all.take(6).toList();
        _loadingReaders = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingReaders = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = SupabaseService.currentUser;
    final fullName = user?.userMetadata?['full_name'] as String? ?? 'Bem-vinda';
    final firstName = fullName.split(' ').first;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: const MysticBottomNav(currentTab: MysticTab.home),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: AppColors.background.withValues(alpha: 0.96),
              surfaceTintColor: Colors.transparent,
              automaticallyImplyLeading: false,
              toolbarHeight: 104,
              titleSpacing: 20,
              title: Column(
                children: [
                  Row(
                    children: [
                      const MysticLogo(),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Isidis', style: theme.textTheme.titleLarge),
                          Text(
                            'Bem-vinda, $firstName',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                      const Spacer(),
                      _RoundIconButton(
                        icon: Icons.notifications_none_rounded,
                        onTap: () => context.go('/notifications'),
                      ),
                      const SizedBox(width: 8),
                      _RoundIconButton(
                        icon: Icons.shopping_bag_outlined,
                        onTap: () => context.go('/orders'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SearchField(
                    onTap: () => context.go('/readers'),
                    hint: 'Buscar especialistas, tiragens...',
                  ),
                ],
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HeroCard(onTap: () => context.go('/tiragem')),
                    const SizedBox(height: 30),
                    _SectionHeader(title: 'Categorias'),
                    const SizedBox(height: 14),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _categories.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 4,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.9,
                          ),
                      itemBuilder: (context, index) {
                        final category = _categories[index];
                        return _CategoryCard(category: category);
                      },
                    ),
                    const SizedBox(height: 30),
                    _SectionHeader(
                      title: 'Especialistas em destaque',
                      onAction: () => context.go('/readers'),
                    ),
                    const SizedBox(height: 14),
                    _FeaturedReadersRow(
                      readers: _featuredReaders,
                      loading: _loadingReaders,
                    ),
                    const SizedBox(height: 30),
                    _SectionHeader(
                      title: 'Jornadas espirituais',
                      icon: Icons.trending_up_rounded,
                      onAction: () => context.go('/tiragem'),
                    ),
                    const SizedBox(height: 14),
                    const _FeatureTile(
                      icon: Icons.auto_awesome_rounded,
                      title: 'Tiragem guiada',
                      description:
                          'Escolha uma leitura rápida e receba direcionamento inicial dentro do app.',
                    ),
                    const SizedBox(height: 14),
                    const _FeatureTile(
                      icon: Icons.workspace_premium_rounded,
                      title: 'Leitura personalizada',
                      description:
                          'Contrate uma especialista para uma interpretação mais profunda e feita para você.',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Featured Readers Horizontal Row ──────────────────────────────────────────

class _FeaturedReadersRow extends StatelessWidget {
  final List<dynamic> readers;
  final bool loading;

  const _FeaturedReadersRow({required this.readers, required this.loading});

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return SizedBox(
        height: 200,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: 4,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (_, _) => _ReaderCardSkeleton(),
        ),
      );
    }

    if (readers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: AppColors.primaryLight.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.primary.withValues(alpha: 0.12),
              ),
              child: const Icon(
                Icons.people_alt_rounded,
                color: AppColors.primaryLight,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Nenhuma especialista disponível',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Em breve novas especialistas estarão disponíveis.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 210,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: readers.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) =>
            _FeaturedReaderCard(reader: readers[index] as Map<String, dynamic>),
      ),
    );
  }
}

class _FeaturedReaderCard extends StatelessWidget {
  final Map<String, dynamic> reader;

  const _FeaturedReaderCard({required this.reader});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = reader['avatar_url'] as String?;
    final name = reader['full_name'] as String? ?? '';
    final tagline = reader['tagline'] as String?;
    final specialties =
        (reader['specialties'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];
    final subtitle = tagline ?? (specialties.isNotEmpty ? specialties.first : '');
    final rating = (reader['rating_average'] as num?)?.toDouble() ?? 0;
    final reviewsCount = reader['reviews_count'] as int? ?? 0;

    return InkWell(
      onTap: () => context.push('/readers/${reader['id']}'),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: 158,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: AppColors.primaryLight.withValues(alpha: 0.08),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: avatarUrl != null
                  ? CachedNetworkImage(
                      imageUrl: avatarUrl,
                      width: double.infinity,
                      height: 96,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      width: double.infinity,
                      height: 96,
                      color: AppColors.primary.withValues(alpha: 0.16),
                      alignment: Alignment.center,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 32,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
            ),
            const SizedBox(height: 10),
            Text(
              name,
              style: Theme.of(context).textTheme.titleSmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const Spacer(),
            Row(
              children: [
                const Icon(Icons.star_rounded, size: 13, color: AppColors.gold),
                const SizedBox(width: 3),
                Text(
                  rating > 0 ? rating.toStringAsFixed(1) : 'Novo',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (reviewsCount > 0) ...[
                  const SizedBox(width: 4),
                  Text(
                    '($reviewsCount)',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ReaderCardSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 158,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.08),
        ),
      ),
    );
  }
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.surfaceLight.withValues(alpha: 0.6),
        ),
        child: Icon(icon, color: AppColors.textPrimary, size: 22),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final VoidCallback onTap;
  final String hint;

  const _SearchField({required this.onTap, required this.hint});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: AppColors.primaryLight.withValues(alpha: 0.1),
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, color: AppColors.textMuted),
            const SizedBox(width: 10),
            Text(hint, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final VoidCallback onTap;

  const _HeroCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryLight, AppColors.plum],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.28),
            blurRadius: 28,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
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
                    color: AppColors.gold.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.auto_awesome_rounded,
                        size: 14,
                        color: Colors.white,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Destaque',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Descubra seu\ncaminho espiritual',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Consultas personalizadas com especialistas certificadas.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: 152,
                  child: ElevatedButton(
                    onPressed: onTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.plum,
                    ),
                    child: const Text('Começar agora'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 18),
          Container(
            width: 82,
            height: 82,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              color: Colors.white.withValues(alpha: 0.12),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 38,
              color: AppColors.goldLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData? icon;
  final VoidCallback? onAction;

  const _SectionHeader({required this.title, this.icon, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, color: AppColors.gold, size: 20),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        if (onAction != null)
          TextButton(onPressed: onAction, child: const Text('Ver todas')),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final _CategoryData category;

  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go(
        '/readers?specialty=${Uri.encodeComponent(category.query)}',
      ),
      borderRadius: BorderRadius.circular(22),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: AppColors.primaryLight.withValues(alpha: 0.08),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(category.emoji, style: const TextStyle(fontSize: 30)),
            const SizedBox(height: 8),
            Text(
              category.label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.gold.withValues(alpha: 0.12),
            ),
            child: Icon(icon, color: AppColors.gold, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryData {
  final String label;
  final String emoji;
  final String query;

  const _CategoryData({
    required this.label,
    required this.emoji,
    required this.query,
  });
}

const _categories = [
  _CategoryData(label: 'Tarot', emoji: '🔮', query: 'Espiritualidade'),
  _CategoryData(label: 'Astrologia', emoji: '✨', query: 'Autoconhecimento'),
  _CategoryData(
    label: 'Numerologia',
    emoji: '🔢',
    query: 'Carreira e Finanças',
  ),
  _CategoryData(
    label: 'Cristais',
    emoji: '💎',
    query: 'Amor e Relacionamentos',
  ),
];
