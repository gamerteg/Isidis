import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';

class ReaderHomeScreen extends StatefulWidget {
  const ReaderHomeScreen({super.key});

  @override
  State<ReaderHomeScreen> createState() => _ReaderHomeScreenState();
}

class _ReaderHomeScreenState extends State<ReaderHomeScreen> {
  Map<String, dynamic>? _walletData;
  Map<String, dynamic>? _dashboardData;
  List<dynamic> _recentOrders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        api.get('/wallet/balance'),
        api.get('/readers/me/dashboard'),
      ]);

      if (!mounted) return;

      setState(() {
        _walletData = results[0].data['data'] as Map<String, dynamic>?;
        final dashboard = results[1].data['data'] as Map<String, dynamic>?;
        _dashboardData = dashboard?['metrics'] as Map<String, dynamic>?;
        _recentOrders = (dashboard?['recent_orders'] as List<dynamic>?) ?? [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  String get _readerName {
    final user = SupabaseService.currentUser;
    final name = user?.userMetadata?['full_name'] as String? ?? 'cartomante';
    return name.split(' ').first;
  }

  String _formatCurrency(int? cents) {
    if (cents == null) return 'R\$ --';
    return 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  int _metric(String key) => _dashboardData?[key] as int? ?? 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (i) {
          switch (i) {
            case 1:
              context.go('/reader-orders');
              break;
            case 2:
              context.go('/my-gigs');
              break;
            case 3:
              context.go('/wallet');
              break;
            default:
              break;
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Pedidos',
          ),
          NavigationDestination(
            icon: Icon(Icons.style_outlined),
            selectedIcon: Icon(Icons.style),
            label: 'Servicos',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Carteira',
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
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
                                  'Ola, $_readerName',
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Seu painel com vendas, pedidos e servicos.',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.notifications_outlined,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () => context.push('/notifications'),
                                padding: EdgeInsets.zero,
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.chat_bubble_outline,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () => context.push('/conversations'),
                                padding: EdgeInsets.zero,
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.manage_accounts_outlined,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () => context.push('/edit-profile'),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _WalletHero(
                        loading: _loading,
                        available: _walletData?['available'] as int?,
                        pending: _walletData?['pending'] as int?,
                        onTapWallet: () => context.push('/wallet'),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.list_alt,
                              label: 'Pedidos',
                              onTap: () => context.push('/reader-orders'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.style,
                              label: 'Servicos',
                              onTap: () => context.push('/my-gigs'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.account_balance_wallet,
                              label: 'Carteira',
                              onTap: () => context.push('/wallet'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      const _SectionTitle('Analytics da operacao'),
                      const SizedBox(height: 12),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.22,
                        children: [
                          _MetricCard(
                            icon: Icons.trending_up,
                            label: 'Vendas 30d',
                            value: _loading
                                ? '...'
                                : _formatCurrency(
                                    _metric('sales_last_30_days'),
                                  ),
                            accent: AppColors.gold,
                          ),
                          _MetricCard(
                            icon: Icons.savings_outlined,
                            label: 'Liquido 30d',
                            value: _loading
                                ? '...'
                                : _formatCurrency(_metric('net_last_30_days')),
                            accent: Colors.greenAccent,
                          ),
                          _MetricCard(
                            icon: Icons.auto_graph,
                            label: 'Ticket medio',
                            value: _loading
                                ? '...'
                                : _formatCurrency(
                                    _metric('average_ticket_last_30_days'),
                                  ),
                            accent: AppColors.primaryLight,
                          ),
                          _MetricCard(
                            icon: Icons.local_shipping_outlined,
                            label: 'Para entregar',
                            value: _loading
                                ? '...'
                                : '${_metric('paid_orders')} pedidos',
                            accent: const Color(0xFFFBBF24),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      const _SectionTitle('Radar rapido'),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _StatusChip(
                            label: 'Servicos ativos',
                            value: _metric('active_gigs').toString(),
                          ),
                          _StatusChip(
                            label: 'Em revisao',
                            value: _metric('gigs_in_review').toString(),
                          ),
                          _StatusChip(
                            label: 'Pagto pendente',
                            value: _metric('pending_payment_orders').toString(),
                          ),
                          _StatusChip(
                            label: 'Entregues',
                            value: _metric('delivered_orders').toString(),
                          ),
                          _StatusChip(
                            label: 'Nao lidos',
                            value: _metric('unread_paid_orders').toString(),
                          ),
                          _StatusChip(
                            label: 'Rejeitados',
                            value: _metric('rejected_gigs').toString(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      const _SectionTitle('Pagamentos'),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _PaymentInsight(
                                    label: 'Pedidos via PIX',
                                    value:
                                        '${_metric('pix_orders_last_30_days')}',
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _PaymentInsight(
                                    label: 'Pedidos via cartao',
                                    value:
                                        '${_metric('card_orders_last_30_days')}',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            _InfoStrip(
                              icon: Icons.info_outline,
                              text:
                                  'Nos pedidos com cartao, a taxa financeira e descontada do ganho da tarologa.',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const _SectionTitle('Pedidos que precisam de voce'),
                          TextButton(
                            onPressed: () => context.push('/reader-orders'),
                            child: const Text(
                              'Ver todos',
                              style: TextStyle(color: AppColors.primaryLight),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (_recentOrders.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                          child: const Text(
                            'Nenhum pedido pago aguardando acao agora.',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        )
                      else
                        ..._recentOrders.map(
                          (item) => _RecentOrderTile(
                            order: item as Map<String, dynamic>,
                            onTap: () => context.push('/orders/${item['id']}'),
                          ),
                        ),
                    ],
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

class _WalletHero extends StatelessWidget {
  final bool loading;
  final int? available;
  final int? pending;
  final VoidCallback onTapWallet;

  const _WalletHero({
    required this.loading,
    required this.available,
    required this.pending,
    required this.onTapWallet,
  });

  String _currency(int? cents) {
    if (cents == null) return 'R\$ --';
    return 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.gradientPrimary,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: loading
          ? const SizedBox(
              height: 96,
              child: Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Saldo disponivel',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    InkWell(
                      onTap: onTapWallet,
                      child: const Icon(
                        Icons.arrow_forward_ios,
                        color: Colors.white70,
                        size: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _currency(available),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _HeroChip(label: 'Em liberacao', value: _currency(pending)),
                    _HeroChip(
                      label: 'Acesse a carteira',
                      value: 'Saque e historico',
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  final String label;
  final String value;

  const _HeroChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.bold,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color accent;

  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: accent, size: 20),
          ),
          const Spacer(),
          Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final String value;

  const _StatusChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentInsight extends StatelessWidget {
  final String label;
  final String value;

  const _PaymentInsight({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.background.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoStrip extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoStrip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryLight, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primaryLight, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentOrderTile extends StatelessWidget {
  final Map<String, dynamic> order;
  final VoidCallback onTap;

  const _RecentOrderTile({required this.order, required this.onTap});

  String _currency(int? cents) {
    if (cents == null) return 'R\$ --';
    return 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    final gig = order['gigs'] as Map<String, dynamic>?;
    final client = order['client'] as Map<String, dynamic>?;
    final total = order['amount_total'] as int?;
    final paymentMethod = order['payment_method'] as String? ?? 'PIX';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.receipt_long,
                color: AppColors.primaryLight,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    gig?['title'] as String? ?? 'Servico',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    client?['full_name'] as String? ?? 'Cliente',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    paymentMethod == 'CARD'
                        ? 'Pagamento por cartao'
                        : 'Pagamento por PIX',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              _currency(total),
              style: const TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
