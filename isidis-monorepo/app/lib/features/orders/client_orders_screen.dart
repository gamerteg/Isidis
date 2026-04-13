import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order.dart';
import '../../shared/widgets/mystic_bottom_nav.dart';

class ClientOrdersScreen extends StatefulWidget {
  const ClientOrdersScreen({super.key});

  @override
  State<ClientOrdersScreen> createState() => _ClientOrdersScreenState();
}

class _ClientOrdersScreenState extends State<ClientOrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadOrders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final response = await api.get('/orders', params: {'limit': 50});
      final list = (response.data['data'] as List<dynamic>)
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _orders = list;
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
      bottomNavigationBar: const MysticBottomNav(currentTab: MysticTab.orders),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Pedidos', style: theme.textTheme.headlineLarge),
                  const SizedBox(height: 8),
                  Text(
                    'Acompanhe suas consultas e compras.',
                    style: theme.textTheme.bodyMedium,
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
                        Tab(text: 'Todos'),
                        Tab(text: 'Tiragens'),
                        Tab(text: 'Produtos'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _OrdersListView(
                          orders: _orders,
                          onRefresh: _loadOrders,
                        ),
                        _OrdersListView(
                          orders: _orders,
                          onRefresh: _loadOrders,
                        ),
                        _EmptyOrdersView(
                          title: 'Nenhum produto encontrado',
                          subtitle:
                              'Quando houver pedidos físicos ou itens de loja, eles vão aparecer aqui.',
                          onRefresh: _loadOrders,
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

class _OrdersListView extends StatelessWidget {
  final List<Order> orders;
  final Future<void> Function() onRefresh;

  const _OrdersListView({required this.orders, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return _EmptyOrdersView(
        title: 'Nenhum pedido encontrado',
        subtitle: 'Você ainda não fez nenhum pedido por aqui.',
        onRefresh: onRefresh,
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
        itemBuilder: (context, index) => _OrderCard(order: orders[index]),
        separatorBuilder: (_, __) => const SizedBox(height: 14),
        itemCount: orders.length,
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;

  const _OrderCard({required this.order});

  String _currency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    final status = _statusInfo(order.status);
    final imageUrl = order.reader?.avatarUrl ?? order.gig?.imageUrl;

    return InkWell(
      onTap: () => context.push('/orders/${order.id}'),
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
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 56,
                          height: 56,
                          color: AppColors.surfaceLight,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.auto_awesome_rounded,
                            color: AppColors.primaryLight,
                          ),
                        ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.gig?.title ?? 'Leitura espiritual',
                        style: Theme.of(context).textTheme.titleMedium,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.reader?.fullName ?? 'Especialista Isidis',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(status.icon, size: 16, color: status.color),
                          const SizedBox(width: 6),
                          Text(
                            status.label,
                            style: TextStyle(
                              color: status.color,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (status.badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      status.badge!,
                      style: const TextStyle(
                        color: AppColors.goldLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(top: 14),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: AppColors.primaryLight.withValues(alpha: 0.08),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _formatDate(order.createdAt),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        if (status.detail != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              status.detail!,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _currency(order.amountTotal),
                        style: const TextStyle(
                          color: AppColors.primaryLight,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.chat_bubble_outline_rounded,
                            size: 14,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Chat',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
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

  String _formatDate(DateTime dt) {
    const months = [
      '',
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ];
    return '${dt.day} de ${months[dt.month]}';
  }

  _OrderStatusInfo _statusInfo(String status) {
    return switch (status) {
      'PENDING_PAYMENT' => const _OrderStatusInfo(
        label: 'Aguardando pagamento',
        detail: 'Finalize o PIX para liberar a leitura.',
        color: Colors.orange,
        icon: Icons.schedule_rounded,
      ),
      'PAID' => const _OrderStatusInfo(
        label: 'Em preparação',
        detail: 'Sua especialista já começou a preparar a leitura.',
        color: Color(0xFFF59E0B),
        icon: Icons.schedule_rounded,
        badge: '2',
      ),
      'DELIVERED' => const _OrderStatusInfo(
        label: 'Leitura entregue',
        detail: 'Seu conteúdo está pronto para leitura.',
        color: Color(0xFF8B5CF6),
        icon: Icons.auto_awesome_rounded,
      ),
      'COMPLETED' => const _OrderStatusInfo(
        label: 'Concluído',
        detail: 'Pedido finalizado com sucesso.',
        color: Color(0xFF22C55E),
        icon: Icons.check_circle_rounded,
      ),
      'CANCELED' => const _OrderStatusInfo(
        label: 'Cancelado',
        detail: 'Este pedido foi encerrado.',
        color: AppColors.error,
        icon: Icons.cancel_rounded,
      ),
      _ => const _OrderStatusInfo(
        label: 'Em andamento',
        color: AppColors.textMuted,
        icon: Icons.receipt_long_rounded,
      ),
    };
  }
}

class _OrderStatusInfo {
  final String label;
  final String? detail;
  final Color color;
  final IconData icon;
  final String? badge;

  const _OrderStatusInfo({
    required this.label,
    this.detail,
    required this.color,
    required this.icon,
    this.badge,
  });
}

class _EmptyOrdersView extends StatelessWidget {
  final String title;
  final String subtitle;
  final Future<void> Function() onRefresh;

  const _EmptyOrdersView({
    required this.title,
    required this.subtitle,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 80),
            child: Column(
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(26),
                    color: AppColors.surfaceLight.withValues(alpha: 0.5),
                  ),
                  child: const Icon(
                    Icons.inventory_2_outlined,
                    size: 40,
                    color: AppColors.textMuted,
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
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/readers'),
                  child: const Text('Explorar especialistas'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
