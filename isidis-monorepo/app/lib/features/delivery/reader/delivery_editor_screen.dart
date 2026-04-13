import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import '../../../shared/models/order.dart';
import 'digital_delivery_screen.dart';
import 'physical_delivery_screen.dart';

class DeliveryEditorScreen extends StatefulWidget {
  final String orderId;

  const DeliveryEditorScreen({super.key, required this.orderId});

  @override
  State<DeliveryEditorScreen> createState() => _DeliveryEditorScreenState();
}

class _DeliveryEditorScreenState extends State<DeliveryEditorScreen> {
  Order? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    if (!PlatformCapabilities.supportsReaderDeliveryEditor) {
      _loading = false;
      return;
    }
    _loadOrder();
  }

  Future<void> _loadOrder() async {
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

  @override
  Widget build(BuildContext context) {
    if (!PlatformCapabilities.supportsReaderDeliveryEditor) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => context.pop(),
          ),
          title: const Text(
            'Entrega da leitura',
            style: TextStyle(color: AppColors.textPrimary),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 520),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.cloud_off_outlined,
                    color: AppColors.textMuted,
                    size: 44,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'A edicao e o envio de leituras ainda nao estao liberados na versao web.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Esse fluxo ainda depende de captura e upload de midia nativos. Para concluir a entrega, use o app mobile.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

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
