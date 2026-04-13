import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import '../../../shared/models/order.dart';
import 'digital_reading_viewer.dart';
import 'physical_reading_viewer.dart';

class ReadingViewerScreen extends StatefulWidget {
  final String orderId;

  const ReadingViewerScreen({super.key, required this.orderId});

  @override
  State<ReadingViewerScreen> createState() => _ReadingViewerScreenState();
}

class _ReadingViewerScreenState extends State<ReadingViewerScreen> {
  Order? _order;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    try {
      final response = await api.get('/orders/${widget.orderId}');
      final order = Order.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
      if (mounted) setState(() => _order = order);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _order == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 48),
              const SizedBox(height: 16),
              const Text(
                'Não foi possível carregar a leitura.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Voltar'),
              ),
            ],
          ),
        ),
      );
    }

    final order = _order!;

    if (order.deliveryContent == null) {
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.hourglass_empty, color: AppColors.textMuted, size: 56),
              SizedBox(height: 16),
              Text(
                'Sua leitura ainda não foi entregue.',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'O cartomante está preparando sua leitura.\nVocê receberá uma notificação quando estiver pronta.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    final content = DeliveryContent.fromJson(order.deliveryContent!);
    final readerName = order.reader?.fullName ?? 'Cartomante';
    final gigId = order.gig?.id ?? '';

    if (content.isDigital) {
      return DigitalReadingViewer(
        orderId: order.id,
        gigId: gigId,
        readerId: order.reader?.id ?? '',
        readerName: readerName,
        content: content,
      );
    }

    return PhysicalReadingViewer(
      orderId: order.id,
      gigId: gigId,
      readerId: order.reader?.id ?? '',
      readerName: readerName,
      content: content,
    );
  }
}
