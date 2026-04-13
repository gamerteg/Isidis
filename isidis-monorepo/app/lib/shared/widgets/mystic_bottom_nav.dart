import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

enum MysticTab { home, explore, tiragem, orders, profile }

class MysticBottomNav extends StatelessWidget {
  final MysticTab currentTab;

  const MysticBottomNav({super.key, required this.currentTab});

  @override
  Widget build(BuildContext context) {
    final items = <_NavItem>[
      const _NavItem(
        tab: MysticTab.home,
        label: 'Início',
        icon: Icons.home_rounded,
        route: '/home',
      ),
      const _NavItem(
        tab: MysticTab.explore,
        label: 'Explorar',
        icon: Icons.explore_rounded,
        route: '/readers',
      ),
      const _NavItem(
        tab: MysticTab.tiragem,
        label: 'Tiragem',
        icon: Icons.auto_awesome_rounded,
        route: '/tiragem',
      ),
      const _NavItem(
        tab: MysticTab.orders,
        label: 'Pedidos',
        icon: Icons.receipt_long_rounded,
        route: '/orders',
      ),
      const _NavItem(
        tab: MysticTab.profile,
        label: 'Perfil',
        icon: Icons.person_rounded,
        route: '/profile',
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.96),
        border: Border(
          top: BorderSide(
            color: AppColors.primaryLight.withValues(alpha: 0.12),
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 28,
            offset: const Offset(0, -12),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
          child: Row(
            children: items
                .map(
                  (item) => Expanded(
                    child: _NavButton(
                      item: item,
                      selected: item.tab == currentTab,
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final _NavItem item;
  final bool selected;

  const _NavButton({required this.item, required this.selected});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          if (!selected) {
            context.go(item.route);
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            color: selected
                ? AppColors.primary.withValues(alpha: 0.14)
                : Colors.transparent,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                item.icon,
                size: 24,
                color: selected ? AppColors.primaryLight : AppColors.textMuted,
              ),
              const SizedBox(height: 4),
              Text(
                item.label,
                style: TextStyle(
                  color: selected
                      ? AppColors.primaryLight
                      : AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final MysticTab tab;
  final String label;
  final IconData icon;
  final String route;

  const _NavItem({
    required this.tab,
    required this.label,
    required this.icon,
    required this.route,
  });
}
