import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order.dart';

class ReaderOrderDetailScreen extends StatefulWidget {
  final String orderId;

  const ReaderOrderDetailScreen({super.key, required this.orderId});

  @override
  State<ReaderOrderDetailScreen> createState() =>
      _ReaderOrderDetailScreenState();
}

class _ReaderOrderDetailScreenState extends State<ReaderOrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  bool _canceling = false;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() => _loading = true);
    try {
      final response = await api.get('/orders/${widget.orderId}');
      final order = Order.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
      if (mounted) setState(() => _order = order);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Detalhes do Pedido',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textMuted),
            onPressed: _loadOrder,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
          ? const Center(
              child: Text(
                'Pedido não encontrado',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildStatusBanner(_order!),
                const SizedBox(height: 16),
                _buildClientInfo(_order!),
                const SizedBox(height: 16),
                _buildRequirements(_order!),
                const SizedBox(height: 16),
                _buildEarnings(_order!),
                const SizedBox(height: 24),
                _buildActions(_order!),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _buildStatusBanner(Order order) {
    final info = _statusInfo(order.status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: info.color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: info.color.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(info.icon, color: info.color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  info.label,
                  style: TextStyle(
                    color: info.color,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                Text(
                  'Pedido em ${_formatDate(order.createdAt)}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientInfo(Order order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cliente',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary.withOpacity(0.3),
                child: Text(
                  (order.client?.fullName.isNotEmpty == true
                          ? order.client!.fullName[0]
                          : 'C')
                      .toUpperCase(),
                  style: const TextStyle(
                    color: AppColors.primaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.client?.fullName ?? 'Cliente',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (order.gig != null)
                    Text(
                      order.gig!.title,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequirements(Order order) {
    if (order.requirementsAnswers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Row(
          children: [
            Icon(Icons.info_outline, color: AppColors.textMuted, size: 18),
            SizedBox(width: 8),
            Text(
              'Nenhuma pergunta respondida pelo cliente.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Respostas do cliente',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          ...order.requirementsAnswers.entries.map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    e.key,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      e.value.toString(),
                      style: const TextStyle(color: AppColors.textPrimary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEarnings(Order order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Seus ganhos',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total do pedido',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              Text(
                _formatCurrency(order.amountTotal),
                style: const TextStyle(color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Taxa da plataforma (15%)',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              Text(
                '- ${_formatCurrency(order.amountPlatformFee)}',
                style: const TextStyle(color: AppColors.error),
              ),
            ],
          ),
          const Divider(color: AppColors.surfaceLight),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Seus ganhos',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                _formatCurrency(order.amountReaderNet),
                style: const TextStyle(
                  color: AppColors.gold,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Valor disponível após 48h da entrega confirmada',
            style: TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(Order order) {
    if (order.isCanceled || order.isCompleted) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Entregar (Fase 5)
        if (order.isPaid)
          ElevatedButton.icon(
            onPressed: () => context.push('/orders/${order.id}/deliver'),
            icon: const Icon(Icons.send),
            label: const Text('Entregar leitura'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),

        // Cancelar
        if (order.isPaid) ...[
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _canceling ? null : () => _showCancelDialog(order),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.error),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _canceling
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.error,
                    ),
                  )
                : const Text(
                    'Cancelar pedido',
                    style: TextStyle(color: AppColors.error),
                  ),
          ),
        ],
      ],
    );
  }

  void _showCancelDialog(Order order) {
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Cancelar pedido',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'O cliente receberá o reembolso integral. Informe o motivo do cancelamento.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Motivo (mínimo 10 caracteres)',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Voltar'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonCtrl.text.trim().length < 10) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Informe o motivo com mais detalhes.'),
                  ),
                );
                return;
              }
              Navigator.pop(ctx);
              setState(() => _canceling = true);
              try {
                await api.post(
                  '/orders/${order.id}/cancel',
                  data: {'reason': reasonCtrl.text.trim()},
                );
                if (mounted) {
                  await _loadOrder();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Pedido cancelado. Reembolso iniciado.'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  setState(() => _canceling = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Erro: ${e.toString()}'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Confirmar cancelamento'),
          ),
        ],
      ),
    );
  }

  ({String label, Color color, IconData icon}) _statusInfo(String status) =>
      switch (status) {
        'PAID' => (
          label: 'Aguardando sua entrega',
          color: Colors.blue,
          icon: Icons.hourglass_empty,
        ),
        'DELIVERED' => (
          label: 'Leitura entregue',
          color: Colors.purple,
          icon: Icons.check_circle_outline,
        ),
        'COMPLETED' => (
          label: 'Concluído',
          color: Colors.green,
          icon: Icons.check_circle,
        ),
        'CANCELED' => (
          label: 'Cancelado',
          color: AppColors.error,
          icon: Icons.cancel,
        ),
        _ => (label: status, color: AppColors.textMuted, icon: Icons.circle),
      };
}
