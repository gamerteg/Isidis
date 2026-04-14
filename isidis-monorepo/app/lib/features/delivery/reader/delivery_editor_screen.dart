import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import '../../../shared/models/order.dart';
import 'digital_delivery_screen.dart';
import 'physical_delivery_screen.dart';

class DeliveryEditorScreen extends StatefulWidget {
  final String orderId;
  final Future<Order?> Function(String orderId)? orderLoader;

  const DeliveryEditorScreen({
    super.key,
    required this.orderId,
    this.orderLoader,
  });

  @override
  State<DeliveryEditorScreen> createState() => _DeliveryEditorScreenState();
}

class _DeliveryEditorScreenState extends State<DeliveryEditorScreen> {
  Order? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    try {
      final order =
          await (widget.orderLoader?.call(widget.orderId) ??
              _fetchOrder(widget.orderId));
      if (mounted) setState(() => _order = order);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<Order?> _fetchOrder(String orderId) async {
    final response = await api.get('/orders/$orderId');
    return Order.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_order == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(
          child: Text(
            'Pedido não encontrado',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    final method = _order!.gig?.deliveryMethod ?? 'DIGITAL_SPREAD';
    final existingContent = _order!.deliveryContent != null
        ? DeliveryContent.fromJson(_order!.deliveryContent!)
        : null;

    if (method == 'PHYSICAL') {
      return PhysicalDeliveryScreen(
        orderId: widget.orderId,
        existingContent: existingContent,
      );
    }

    return DigitalDeliveryScreen(
      orderId: widget.orderId,
      existingContent: existingContent,
    );
  }
}
