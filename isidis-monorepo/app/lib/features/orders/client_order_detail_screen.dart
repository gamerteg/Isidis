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
      if (mounted) setState(() => _order = null);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _canClientCancel(Order order) {
    if (!order.isPaid || order.readerViewedAt != null) {
      return false;
    }

    final minutesElapsed = DateTime.now().difference(order.createdAt).inMinutes;
    return minutesElapsed <= 120;
  }

  bool _canOpenDispute(Order order) {
    if (!order.isDelivered) {
      return false;
    }

    final deliveredReference = order.deliveredAt ?? order.createdAt;
    final minutesSinceDelivery = DateTime.now()
        .difference(deliveredReference)
        .inMinutes;
    return minutesSinceDelivery < 48 * 60;
  }

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  String _formatDate(DateTime dateTime) =>
      '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';

  Future<void> _cancelOrder(Order order, String reason) async {
    setState(() => _canceling = true);

    try {
      await api.post('/orders/${order.id}/cancel', data: {'reason': reason});

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pedido cancelado. O reembolso foi iniciado.'),
        ),
      );
      await _loadOrder();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_extractError(error)),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _canceling = false);
    }
  }

  String _extractError(dynamic error) {
    try {
      final data = (error as dynamic).response?.data;
      if (data is Map && data['error'] is String) {
        return data['error'] as String;
      }
    } catch (_) {}

    return 'Nao foi possivel concluir a acao. Tente novamente.';
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
                'Pedido nao encontrado',
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
            AppColors.primary.withValues(alpha: 0.3),
            AppColors.primary.withValues(alpha: 0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
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
            color: info.color.withValues(alpha: 0.2),
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
      _ProgressStep(label: 'Concluido', done: order.isCompleted, active: false),
    ];

    return Row(
      children: steps.asMap().entries.map((entry) {
        final index = entry.key;
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
              if (index < steps.length - 1)
                Expanded(
                  child: Divider(
                    color: steps[index + 1].done || step.done
                        ? Colors.green.withValues(alpha: 0.5)
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
            'Informacoes do pedido',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          if (order.gig != null)
            _InfoRow(label: 'Servico', value: order.gig!.title),
          if (order.reader != null)
            _InfoRow(label: 'Cartomante', value: order.reader!.fullName),
          _InfoRow(label: 'Pedido em', value: _formatDate(order.createdAt)),
          if (order.readerViewedAt != null)
            _InfoRow(
              label: 'Reader viu em',
              value: _formatDate(order.readerViewedAt!),
            ),
          if (order.deliveredAt != null)
            _InfoRow(
              label: 'Entregue em',
              value: _formatDate(order.deliveredAt!),
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
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.key,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.value.toString(),
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

    if (_canClientCancel(order)) {
      actions.add(
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
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
        ),
      );
    }

    if (order.isDelivered || order.isCompleted) {
      if (actions.isNotEmpty) actions.add(const SizedBox(height: 12));
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

    if (order.isCompleted) {
      if (actions.isNotEmpty) actions.add(const SizedBox(height: 12));
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

    if (_canOpenDispute(order)) {
      if (actions.isNotEmpty) actions.add(const SizedBox(height: 12));
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

  void _showCancelDialog(Order order) {
    final reasonCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Cancelar pedido',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Voce pode cancelar em ate 2h apos o pagamento, desde que a leitura ainda nao tenha sido iniciada.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Informe o motivo do cancelamento',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Voltar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final reason = reasonCtrl.text.trim();
              if (reason.length < 10) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Informe o motivo do cancelamento com ao menos 10 caracteres.',
                    ),
                  ),
                );
                return;
              }

              Navigator.pop(dialogContext);
              await _cancelOrder(order, reason);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Confirmar cancelamento'),
          ),
        ],
      ),
    );
  }

  void _showDisputeDialog(Order order) {
    final reasonCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Abrir disputa',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Descreva o problema com sua leitura. Nossa equipe analisara em ate 24h.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Minimo 20 caracteres...',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final reason = reasonCtrl.text.trim();
              if (reason.length < 20) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Descreva o problema com mais detalhes.'),
                  ),
                );
                return;
              }

              Navigator.pop(dialogContext);

              try {
                await api.post(
                  '/orders/${order.id}/dispute',
                  data: {'reason': reason},
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Disputa aberta. Nossa equipe entrara em contato em ate 24h.',
                      ),
                    ),
                  );
                  await _loadOrder();
                }
              } catch (error) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(_extractError(error)),
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
        title: 'Leitura concluida!',
        subtitle: 'Sua leitura foi marcada como concluida.',
        color: Colors.green,
        icon: Icons.check_circle,
      );
    }

    if (order.isDelivered) {
      return (
        title: 'Leitura entregue!',
        subtitle: 'Sua leitura esta pronta. Toque para ver.',
        color: Colors.purple,
        icon: Icons.auto_awesome,
      );
    }

    if (order.isPaid && order.readerViewedAt != null) {
      return (
        title: 'Preparando sua leitura',
        subtitle:
            '${order.reader?.fullName ?? 'O cartomante'} esta trabalhando na sua leitura.',
        color: Colors.blue,
        icon: Icons.hourglass_top,
      );
    }

    if (order.isPaid) {
      return (
        title: 'Pagamento confirmado!',
        subtitle: _canClientCancel(order)
            ? 'Voce ainda pode cancelar este pedido nas primeiras 2h.'
            : 'Aguardando o cartomante iniciar seu pedido.',
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
