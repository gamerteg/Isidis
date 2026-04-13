import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order.dart';
import 'review_modal.dart';

class ClientOrderDetailScreen extends StatefulWidget {
  final String orderId;

  const ClientOrderDetailScreen({super.key, required this.orderId});

  @override
  State<ClientOrderDetailScreen> createState() =>
      _ClientOrderDetailScreenState();
}

class _ClientOrderDetailScreenState extends State<ClientOrderDetailScreen> {
  Order? _order;
  bool _loading = true;

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
          : RefreshIndicator(
              onRefresh: _loadOrder,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildProgressStatus(_order!),
                  const SizedBox(height: 20),
                  _buildOrderInfo(_order!),
                  const SizedBox(height: 16),
                  _buildPriceBreakdown(_order!),
                  if (_order!.requirementsAnswers.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildRequirements(_order!),
                  ],
                  const SizedBox(height: 16),
                  _buildActions(_order!),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildProgressStatus(Order order) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.3),
            AppColors.primary.withOpacity(0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStatusHeader(order),
          const SizedBox(height: 20),
          _buildProgressSteps(order),
        ],
      ),
    );
  }

  Widget _buildStatusHeader(Order order) {
    final info = _statusMessage(order);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: info.color.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(info.icon, color: info.color, size: 24),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                info.title,
                style: TextStyle(
                  color: info.color,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                info.subtitle,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgressSteps(Order order) {
    final steps = [
      _ProgressStep(
        label: 'Pago',
        done: !order.isPendingPayment,
        active: order.isPaid,
      ),
      _ProgressStep(
        label: 'Reader viu',
        done:
            order.readerViewedAt != null &&
            (order.isDelivered || order.isCompleted),
        active: order.isPaid && order.readerViewedAt != null,
      ),
      _ProgressStep(
        label: 'Entregue',
        done: order.isCompleted,
        active: order.isDelivered,
      ),
      _ProgressStep(label: 'Concluído', done: order.isCompleted, active: false),
    ];

    return Row(
      children: steps.asMap().entries.map((entry) {
        final i = entry.key;
        final step = entry.value;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: step.done
                            ? Colors.green
                            : step.active
                            ? AppColors.primary
                            : AppColors.surface,
                        border: Border.all(
                          color: step.done
                              ? Colors.green
                              : step.active
                              ? AppColors.primary
                              : AppColors.surfaceLight,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        step.done ? Icons.check : Icons.circle,
                        color: step.done || step.active
                            ? Colors.white
                            : AppColors.textMuted,
                        size: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      step.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: step.done || step.active
                            ? AppColors.textPrimary
                            : AppColors.textMuted,
                        fontSize: 10,
                        fontWeight: step.active
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              if (i < steps.length - 1)
                Expanded(
                  child: Divider(
                    color: steps[i + 1].done || step.done
                        ? Colors.green.withOpacity(0.5)
                        : AppColors.surfaceLight,
                    thickness: 2,
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildOrderInfo(Order order) {
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
            'Informações do pedido',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          if (order.gig != null)
            _InfoRow(label: 'Serviço', value: order.gig!.title),
          if (order.reader != null)
            _InfoRow(label: 'Cartomante', value: order.reader!.fullName),
          _InfoRow(label: 'Pedido em', value: _formatDate(order.createdAt)),
          if (order.readerViewedAt != null)
            _InfoRow(
              label: 'Reader viu em',
              value: _formatDate(order.readerViewedAt!),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceBreakdown(Order order) {
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
            'Valores',
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
                'Total pago',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                _formatCurrency(order.amountTotal),
                style: const TextStyle(
                  color: AppColors.gold,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequirements(Order order) {
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
            'Suas respostas',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          ...order.requirementsAnswers.entries.map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
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
                  const SizedBox(height: 2),
                  Text(
                    e.value.toString(),
                    style: const TextStyle(color: AppColors.textPrimary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(Order order) {
    final actions = <Widget>[];

    // Leitura entregue — ver conteúdo (Fase 5)
    if (order.isDelivered || order.isCompleted) {
      actions.add(
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => context.push('/readings/${order.id}'),
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Ver minha leitura'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ).animate().fadeIn().scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
        ),
      );
    }

    // Review — apenas se COMPLETED
    if (order.isCompleted) {
      actions.add(const SizedBox(height: 12));
      actions.add(
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _showReviewModal(order),
            icon: const Icon(Icons.star_border, color: AppColors.gold),
            label: const Text(
              'Avaliar cartomante',
              style: TextStyle(color: AppColors.gold),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.gold),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      );
    }

    // Disputa — apenas se DELIVERED e dentro de 48h
    if (order.isDelivered) {
      final hoursSinceDelivery = order.readerViewedAt != null
          ? DateTime.now().difference(order.createdAt).inHours
          : 0;
      if (hoursSinceDelivery < 48) {
        actions.add(const SizedBox(height: 12));
        actions.add(
          TextButton(
            onPressed: () => _showDisputeDialog(order),
            child: const Text(
              'Abrir disputa',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        );
      }
    }

    if (actions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: actions,
    );
  }

  void _showReviewModal(Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ReviewModal(
        orderId: order.id,
        readerName: order.reader?.fullName ?? 'Cartomante',
        onSuccess: _loadOrder,
      ),
    );
  }

  void _showDisputeDialog(Order order) {
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Abrir disputa',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Descreva o problema com sua leitura. Nossa equipe analisará em até 24h.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Mínimo 20 caracteres...',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonCtrl.text.trim().length < 20) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Descreva o problema com mais detalhes.'),
                  ),
                );
                return;
              }
              Navigator.pop(ctx);
              try {
                await api.post(
                  '/orders/${order.id}/dispute',
                  data: {'reason': reasonCtrl.text.trim()},
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Disputa aberta. Nossa equipe entrará em contato em até 24h.',
                      ),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
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
            child: const Text('Enviar disputa'),
          ),
        ],
      ),
    );
  }

  ({String title, String subtitle, Color color, IconData icon}) _statusMessage(
    Order order,
  ) {
    if (order.isCanceled) {
      return (
        title: 'Pedido cancelado',
        subtitle: 'Este pedido foi cancelado.',
        color: AppColors.error,
        icon: Icons.cancel_outlined,
      );
    }
    if (order.isCompleted) {
      return (
        title: 'Leitura concluída!',
        subtitle: 'Sua leitura foi marcada como concluída.',
        color: Colors.green,
        icon: Icons.check_circle,
      );
    }
    if (order.isDelivered) {
      return (
        title: 'Leitura entregue!',
        subtitle: 'Sua leitura está pronta. Toque para ver.',
        color: Colors.purple,
        icon: Icons.auto_awesome,
      );
    }
    if (order.isPaid && order.readerViewedAt != null) {
      return (
        title: 'Preparando sua leitura',
        subtitle:
            '${order.reader?.fullName ?? 'O cartomante'} está trabalhando na sua leitura.',
        color: Colors.blue,
        icon: Icons.hourglass_top,
      );
    }
    if (order.isPaid) {
      return (
        title: 'Pagamento confirmado!',
        subtitle: 'Aguardando o cartomante aceitar seu pedido.',
        color: AppColors.primary,
        icon: Icons.payments_outlined,
      );
    }
    return (
      title: 'Aguardando pagamento',
      subtitle: 'Complete o pagamento via PIX.',
      color: Colors.orange,
      icon: Icons.schedule,
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressStep {
  final String label;
  final bool done;
  final bool active;

  const _ProgressStep({
    required this.label,
    required this.done,
    required this.active,
  });
}
