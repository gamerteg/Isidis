import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order.dart';

class ReaderOrdersScreen extends StatefulWidget {
  const ReaderOrdersScreen({super.key});

  @override
  State<ReaderOrdersScreen> createState() => _ReaderOrdersScreenState();
}

class _ReaderOrdersScreenState extends State<ReaderOrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _tabs = const [
    (label: 'Pendentes', status: 'PAID'),
    (label: 'Histórico', status: 'DELIVERED,COMPLETED'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/reader-home'),
        ),
        title: const Text(
          'Meus Pedidos',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryLight,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((t) => _OrderList(status: t.status)).toList(),
      ),
    );
  }
}

class _OrderList extends StatefulWidget {
  final String status;

  const _OrderList({required this.status});

  @override
  State<_OrderList> createState() => _OrderListState();
}

class _OrderListState extends State<_OrderList>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final response = await api.get(
        '/orders',
        params: {'status': widget.status, 'limit': 50},
      );
      final list = (response.data['data'] as List<dynamic>)
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList();
      if (mounted) setState(() => _orders = list);
    } catch (e, st) {
      debugPrint('[ReaderOrders] ERRO status=${widget.status}: $e\n$st');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox, color: AppColors.textMuted, size: 48),
            const SizedBox(height: 12),
            Text(
              widget.status == 'PAID'
                  ? 'Nenhum pedido pendente'
                  : 'Nenhum pedido no histórico',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _orders.length,
        itemBuilder: (_, i) => _ReaderOrderCard(order: _orders[i]),
      ),
    );
  }
}

class _ReaderOrderCard extends StatelessWidget {
  final Order order;

  const _ReaderOrderCard({required this.order});

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final isUrgent =
        order.isPaid &&
        order.gig != null &&
        DateTime.now().difference(order.createdAt).inHours >=
            (order.gig!.deliveryTimeHours * 0.8).floor();

    return GestureDetector(
      onTap: () => context.push('/reader-orders/${order.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: isUrgent
              ? Border.all(color: Colors.orange.withOpacity(0.5))
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.gig?.title ?? 'Leitura',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isUrgent)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Urgente',
                      style: TextStyle(
                        color: Colors.orange,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person, color: AppColors.textMuted, size: 14),
                const SizedBox(width: 4),
                Text(
                  order.client?.fullName ?? 'Cliente',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 12),
                const Icon(
                  Icons.access_time,
                  color: AppColors.textMuted,
                  size: 14,
                ),
                const SizedBox(width: 4),
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _formatCurrency(order.amountReaderNet),
                  style: const TextStyle(
                    color: AppColors.gold,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const Row(
                  children: [
                    Text(
                      'Ver detalhes',
                      style: TextStyle(
                        color: AppColors.primaryLight,
                        fontSize: 13,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.chevron_right,
                      color: AppColors.primaryLight,
                      size: 16,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
