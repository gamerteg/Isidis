import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/profile.dart';
import '../../shared/widgets/mystic_bottom_nav.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Profile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await api.get('/me');
      final data = response.data['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _profile = Profile.fromJson(data);
        _loading = false;
      });
    } catch (_) {
      final user = SupabaseService.currentUser;
      if (!mounted) return;
      setState(() {
        _profile = Profile(
          id: user?.id ?? '',
          fullName:
              user?.userMetadata?['full_name'] as String? ?? 'Usuária Isidis',
          role: 'CLIENT',
        );
        _loading = false;
      });
    }
  }

  Future<void> _signOut() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: const MysticBottomNav(currentTab: MysticTab.profile),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadProfile,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  children: [
                    Text('Perfil', style: theme.textTheme.headlineLarge),
                    const SizedBox(height: 18),
                    _ProfileHeader(profile: _profile!),
                    const SizedBox(height: 18),
                    _BecomeReaderCard(isReader: _profile!.isReader),
                    const SizedBox(height: 18),
                    ..._menuItems(_profile!).map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _MenuTile(item: item),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _signOut,
                      icon: const Icon(Icons.logout_rounded),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: BorderSide(
                          color: AppColors.error.withValues(alpha: 0.4),
                        ),
                      ),
                      label: const Text('Sair da conta'),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Versão 1.0.0',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final Profile profile;

  const _ProfileHeader({required this.profile});

  @override
  Widget build(BuildContext context) {
    final initials = profile.fullName.isEmpty
        ? 'IS'
        : profile.fullName
              .split(' ')
              .take(2)
              .map((part) => part.characters.first.toUpperCase())
              .join();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.card, AppColors.nightBlue],
        ),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: AppColors.primary.withValues(alpha: 0.28),
                backgroundImage: profile.avatarUrl != null
                    ? CachedNetworkImageProvider(profile.avatarUrl!)
                    : null,
                child: profile.avatarUrl == null
                    ? Text(
                        initials,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 22,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.fullName,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      profile.tagline ??
                          (profile.isReader
                              ? 'Especialista espiritual'
                              : '@${profile.fullName.toLowerCase().replaceAll(' ', '.')}'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: _StatColumn(
                  value: '${profile.reviewsCount ?? 8}',
                  label: 'Leituras',
                ),
              ),
              Expanded(
                child: _StatColumn(
                  value:
                      '${profile.specialties.isEmpty ? 12 : profile.specialties.length}',
                  label: 'Seguindo',
                ),
              ),
              Expanded(
                child: _StatColumn(
                  value:
                      '${profile.decksUsed.isEmpty ? 3 : profile.decksUsed.length}',
                  label: 'Produtos',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String value;
  final String label;

  const _StatColumn({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [AppColors.gold, AppColors.primaryLight],
          ).createShader(bounds),
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _BecomeReaderCard extends StatelessWidget {
  final bool isReader;

  const _BecomeReaderCard({required this.isReader});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
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
                    color: AppColors.gold.withValues(alpha: 0.24),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    isReader ? 'Sua jornada' : 'Novo',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  isReader
                      ? 'Gerencie sua presença como especialista'
                      : 'Torne-se uma especialista',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isReader
                      ? 'Atualize perfil, configure sua agenda e acompanhe sua carteira.'
                      : 'Compartilhe seus dons e construa sua comunidade espiritual.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: 14),
                InkWell(
                  onTap: () => context.go(
                    isReader ? '/edit-profile' : '/register-reader',
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Saiba mais',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.chevron_right_rounded, color: Colors.white),
                    ],
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
              borderRadius: BorderRadius.circular(24),
              color: Colors.white.withValues(alpha: 0.14),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: AppColors.goldLight,
              size: 34,
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final _ProfileMenuItem item;

  const _MenuTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: () => context.go(item.route),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: item.highlight
                  ? AppColors.gold.withValues(alpha: 0.24)
                  : AppColors.primaryLight.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: item.highlight
                      ? AppColors.gold.withValues(alpha: 0.14)
                      : AppColors.surfaceLight.withValues(alpha: 0.6),
                ),
                child: Icon(
                  item.icon,
                  color: item.highlight
                      ? AppColors.gold
                      : AppColors.primaryLight,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  item.label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              if (item.badge != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: item.highlight
                        ? AppColors.gold.withValues(alpha: 0.16)
                        : AppColors.primary.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    item.badge!,
                    style: TextStyle(
                      color: item.highlight
                          ? AppColors.goldLight
                          : AppColors.primaryLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileMenuItem {
  final IconData icon;
  final String label;
  final String route;
  final String? badge;
  final bool highlight;

  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.route,
    this.badge,
    this.highlight = false,
  });
}

List<_ProfileMenuItem> _menuItems(Profile profile) {
  return [
    const _ProfileMenuItem(
      icon: Icons.favorite_rounded,
      label: 'Favoritos',
      route: '/readers',
      badge: '12',
    ),
    const _ProfileMenuItem(
      icon: Icons.bookmark_rounded,
      label: 'Salvos',
      route: '/readers',
      badge: '8',
    ),
    const _ProfileMenuItem(
      icon: Icons.star_rounded,
      label: 'Avaliações',
      route: '/orders',
      badge: '3',
    ),
    const _ProfileMenuItem(
      icon: Icons.credit_card_rounded,
      label: 'Pagamentos',
      route: '/orders',
    ),
    const _ProfileMenuItem(
      icon: Icons.notifications_rounded,
      label: 'Notificações',
      route: '/notifications',
    ),
    const _ProfileMenuItem(
      icon: Icons.help_rounded,
      label: 'Ajuda e suporte',
      route: '/conversations',
    ),
    const _ProfileMenuItem(
      icon: Icons.settings_rounded,
      label: 'Configurações',
      route: '/edit-profile',
    ),
    if (profile.isReader)
      const _ProfileMenuItem(
        icon: Icons.shield_rounded,
        label: 'Painel da especialista',
        route: '/reader-home',
        badge: 'Admin',
        highlight: true,
      ),
  ];
}
