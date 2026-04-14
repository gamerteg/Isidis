import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/mystic_bottom_nav.dart';

class ReadersListScreen extends StatefulWidget {
  final String? specialty;

  const ReadersListScreen({super.key, this.specialty});

  @override
  State<ReadersListScreen> createState() => _ReadersListScreenState();
}

class _ReadersListScreenState extends State<ReadersListScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchCtrl = TextEditingController();
  List<dynamic> _readers = [];
  bool _loading = true;
  String? _activeSpecialty;
  double? _minRating;
  int? _maxPrice;

  static const _specialties = [
    'Amor e Relacionamentos',
    'Carreira e Finanças',
    'Espiritualidade',
    'Família',
    'Saúde',
    'Dinheiro',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _activeSpecialty = widget.specialty;
    _searchCtrl.addListener(() => setState(() {}));
    _loadReaders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  bool get _hasAdvancedFilters => _minRating != null || _maxPrice != null;

  void _clearAdvancedFilters() {
    setState(() {
      _minRating = null;
      _maxPrice = null;
    });
    _loadReaders();
  }

  Future<void> _loadReaders() async {
    setState(() => _loading = true);
    try {
      final params = <String, String>{};
      if (_activeSpecialty != null) params['specialty'] = _activeSpecialty!;
      if (_searchCtrl.text.trim().isNotEmpty) {
        params['search'] = _searchCtrl.text.trim();
      }
      if (_minRating != null) {
        params['min_rating'] = _minRating!.toStringAsFixed(1);
      }
      if (_maxPrice != null) {
        params['max_price'] = _maxPrice!.toString();
      }

      final response = await api.get('/readers', params: params);
      if (!mounted) return;
      setState(() {
        _readers = (response.data['data'] as List<dynamic>?) ?? [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: const MysticBottomNav(currentTab: MysticTab.explore),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Explorar', style: theme.textTheme.headlineLarge),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 56,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLight.withValues(
                              alpha: 0.55,
                            ),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: TextField(
                            controller: _searchCtrl,
                            onSubmitted: (_) => _loadReaders(),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppColors.textPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Buscar...',
                              prefixIcon: const Icon(
                                Icons.search_rounded,
                                color: AppColors.textMuted,
                              ),
                              suffixIcon: _searchCtrl.text.isEmpty
                                  ? null
                                  : IconButton(
                                      onPressed: () {
                                        _searchCtrl.clear();
                                        _loadReaders();
                                      },
                                      icon: const Icon(
                                        Icons.close_rounded,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: IconButton(
                          onPressed: _hasAdvancedFilters
                              ? _clearAdvancedFilters
                              : null,
                          icon: Icon(
                            _hasAdvancedFilters
                                ? Icons.filter_alt_off_rounded
                                : Icons.tune_rounded,
                            color: _hasAdvancedFilters
                                ? AppColors.primaryLight
                                : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _ThemeChip(
                          label: 'Todos',
                          selected: _activeSpecialty == null,
                          onTap: () {
                            setState(() => _activeSpecialty = null);
                            _loadReaders();
                          },
                        ),
                        ..._specialties.map(
                          (specialty) => _ThemeChip(
                            label: specialty.split(' ').first,
                            selected: _activeSpecialty == specialty,
                            onTap: () {
                              setState(() => _activeSpecialty = specialty);
                              _loadReaders();
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ThemeChip(
                        label: '4.0+',
                        selected: _minRating == 4.0,
                        onTap: () {
                          setState(() {
                            _minRating = _minRating == 4.0 ? null : 4.0;
                          });
                          _loadReaders();
                        },
                      ),
                      _ThemeChip(
                        label: '4.5+',
                        selected: _minRating == 4.5,
                        onTap: () {
                          setState(() {
                            _minRating = _minRating == 4.5 ? null : 4.5;
                          });
                          _loadReaders();
                        },
                      ),
                      _ThemeChip(
                        label: 'Ate R\$ 50',
                        selected: _maxPrice == 5000,
                        onTap: () {
                          setState(() {
                            _maxPrice = _maxPrice == 5000 ? null : 5000;
                          });
                          _loadReaders();
                        },
                      ),
                      _ThemeChip(
                        label: 'Ate R\$ 100',
                        selected: _maxPrice == 10000,
                        onTap: () {
                          setState(() {
                            _maxPrice = _maxPrice == 10000 ? null : 10000;
                          });
                          _loadReaders();
                        },
                      ),
                      if (_hasAdvancedFilters)
                        _ThemeChip(
                          label: 'Limpar filtros',
                          selected: false,
                          onTap: _clearAdvancedFilters,
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    height: 52,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      dividerColor: Colors.transparent,
                      indicator: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      labelColor: AppColors.textPrimary,
                      unselectedLabelColor: AppColors.textMuted,
                      tabs: const [
                        Tab(text: 'Especialistas'),
                        Tab(text: 'Tiragens'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _loading
                      ? const Center(child: CircularProgressIndicator())
                      : _readers.isEmpty
                      ? const _EmptyState(
                          title: 'Nenhum especialista encontrado',
                          subtitle:
                              'Tente ajustar a busca ou explorar outra categoria.',
                        )
                      : RefreshIndicator(
                          onRefresh: _loadReaders,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                            itemBuilder: (context, index) => _ReaderCard(
                              reader: _readers[index] as Map<String, dynamic>,
                            ),
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 14),
                            itemCount: _readers.length,
                          ),
                        ),
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                    children: const [
                      _EmptyState(
                        title: 'Catálogo em atualização',
                        subtitle:
                            'As tiragens dessa aba vão aparecer aqui conforme o catálogo real da plataforma estiver disponível.',
                      ),
                      SizedBox(height: 20),
                      _ExploreInfoCard(
                        icon: Icons.auto_awesome_rounded,
                        title: 'Use a aba Tiragem',
                        description:
                            'Lá você encontra o fluxo guiado de leitura disponível no app.',
                      ),
                      SizedBox(height: 14),
                      _ExploreInfoCard(
                        icon: Icons.person_search_rounded,
                        title: 'Leitura com especialista',
                        description:
                            'Para leituras personalizadas, explore os perfis reais de especialistas na primeira aba.',
                      ),
                    ],
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

class _ThemeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            color: selected
                ? AppColors.primary
                : AppColors.surfaceLight.withValues(alpha: 0.45),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 16,
                      offset: const Offset(0, 10),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? AppColors.textPrimary : AppColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ReaderCard extends StatelessWidget {
  final Map<String, dynamic> reader;

  const _ReaderCard({required this.reader});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = reader['avatar_url'] as String?;
    final name = reader['full_name'] as String? ?? '';
    final tagline = reader['tagline'] as String?;
    final rating = (reader['rating_average'] as num?)?.toDouble() ?? 0;
    final reviewsCount = reader['reviews_count'] as int? ?? 0;
    final specialties =
        (reader['specialties'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];
    final price = reader['starting_price'] as int?;

    return InkWell(
      onTap: () => context.push('/readers/${reader['id']}'),
      borderRadius: BorderRadius.circular(26),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: AppColors.primaryLight.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: avatarUrl != null
                  ? CachedNetworkImage(
                      imageUrl: avatarUrl,
                      width: 92,
                      height: 92,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      width: 92,
                      height: 92,
                      color: AppColors.primary.withValues(alpha: 0.16),
                      alignment: Alignment.center,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: Theme.of(context).textTheme.titleMedium,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              tagline ?? specialties.join(' • '),
                              style: Theme.of(context).textTheme.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      if (price != null)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            'R\$ ${(price / 100).toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: AppColors.goldLight,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 16,
                        color: AppColors.gold,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        rating > 0 ? rating.toStringAsFixed(1) : 'Novo',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        reviewsCount > 0
                            ? '$reviewsCount avaliações'
                            : 'Sem avaliações ainda',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                  if (specialties.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: specialties.take(2).map((specialty) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            specialty,
                            style: const TextStyle(
                              color: AppColors.primaryLight,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/readers/${reader['id']}'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(0, 42),
                      ),
                      child: const Text('Ver perfil'),
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

class _EmptyState extends StatelessWidget {
  final String title;
  final String subtitle;

  const _EmptyState({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              color: AppColors.surfaceLight.withValues(alpha: 0.5),
            ),
            child: const Icon(
              Icons.search_off_rounded,
              color: AppColors.textMuted,
              size: 38,
            ),
          ),
          const SizedBox(height: 18),
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _ExploreInfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _ExploreInfoCard({
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
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.primary.withValues(alpha: 0.12),
            ),
            child: Icon(icon, color: AppColors.primaryLight),
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
