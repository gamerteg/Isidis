import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class PixScreen extends StatefulWidget {
  final String orderId;
  final String pixQrCodeId;
  final int amountTotal;
  final String? qrCodeBase64;
  final String? copyPasteCode;
  final String? expiresAt;

  const PixScreen({
    super.key,
    required this.orderId,
    required this.pixQrCodeId,
    required this.amountTotal,
    this.qrCodeBase64,
    this.copyPasteCode,
    this.expiresAt,
  });

  @override
  State<PixScreen> createState() => _PixScreenState();
}

class _PixScreenState extends State<PixScreen> {
  Timer? _pollTimer;
  Timer? _countdownTimer;
  int _secondsLeft = 600; // 10 min
  bool _paid = false;
  bool _expired = false;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _calculateSecondsLeft();
    _startPolling();
    _startCountdown();
  }

  void _calculateSecondsLeft() {
    if (widget.expiresAt == null) return;
    final expires = DateTime.tryParse(widget.expiresAt!);
    if (expires == null) return;
    final diff = expires.difference(DateTime.now()).inSeconds;
    if (diff > 0) _secondsLeft = diff;
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (_paid || _expired) return;
      try {
        final response = await api.get(
          '/checkout/status/${widget.pixQrCodeId}',
        );
        final data = response.data['data'] as Map<String, dynamic>;
        if (data['status'] == 'PAID' && mounted) {
          _pollTimer?.cancel();
          _countdownTimer?.cancel();
          setState(() => _paid = true);
          await Future.delayed(const Duration(milliseconds: 800));
          if (mounted) {
            context.pushReplacement('/order-confirmation/${widget.orderId}');
          }
        }
      } catch (e) {
        debugPrint('[Pix] Polling error: $e');
      }
    });
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_secondsLeft > 0) {
          _secondsLeft--;
        } else {
          _expired = true;
          _countdownTimer?.cancel();
          _pollTimer?.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  String get _countdown {
    final m = (_secondsLeft ~/ 60).toString().padLeft(2, '0');
    final s = (_secondsLeft % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  Uint8List? get _qrCodeBytes {
    final rawBase64 = widget.qrCodeBase64;
    if (rawBase64 == null || rawBase64.isEmpty) return null;

    try {
      final parts = rawBase64.split(',');
      final normalizedBase64 = (parts.length > 1 && parts.last.isNotEmpty)
          ? parts.last
          : parts.first;
      if (normalizedBase64.isEmpty) return null;
      return base64Decode(normalizedBase64.trim());
    } catch (_) {
      return null;
    }
  }

  Future<void> _copyCode() async {
    if (widget.copyPasteCode == null) return;
    await Clipboard.setData(ClipboardData(text: widget.copyPasteCode!));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(
      const Duration(seconds: 3),
      () => mounted ? setState(() => _copied = false) : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.surface,
            title: const Text('Cancelar pagamento?'),
            content: const Text(
              'Ao sair, o pedido ficará pendente. Você pode voltar pelo histórico de pedidos.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Continuar pagando'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text(
                  'Sair',
                  style: TextStyle(color: AppColors.error),
                ),
              ),
            ],
          ),
        );
        if (confirm == true && context.mounted) context.go('/home');
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: const Text(
            'Pagamento via PIX',
            style: TextStyle(color: AppColors.textPrimary),
          ),
          actions: [
            TextButton(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: AppColors.surface,
                    title: const Text('Sair?'),
                    content: const Text(
                      'O pedido ficará pendente. Você poderá consultar em Pedidos.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancelar'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text(
                          'Sair',
                          style: TextStyle(color: AppColors.error),
                        ),
                      ),
                    ],
                  ),
                );
                if (confirm == true && context.mounted) context.go('/home');
              },
              child: const Text(
                'Sair',
                style: TextStyle(color: AppColors.textMuted),
              ),
            ),
          ],
        ),
        body: _expired ? _buildExpired() : _buildPix(),
      ),
    );
  }

  Widget _buildPix() {
    final qrCodeBytes = _qrCodeBytes;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Status + valor
        Center(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.green.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.schedule, color: Colors.green, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'Aguardando pagamento — $_countdown',
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _formatCurrency(widget.amountTotal),
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Valor a pagar',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),

        const SizedBox(height: 32),

        // QR Code
        Center(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: qrCodeBytes != null
                ? Image.memory(
                    qrCodeBytes,
                    width: 220,
                    height: 220,
                    fit: BoxFit.contain,
                    errorBuilder: (_, error, stackTrace) =>
                        _buildQrPlaceholder(),
                  )
                : _buildQrPlaceholder(),
          ),
        ),

        const SizedBox(height: 24),

        // Instrução
        const Center(
          child: Text(
            'Escaneie o QR code com o app do seu banco\nou use o código abaixo',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
        ),

        const SizedBox(height: 24),

        // Código copia-cola
        if (widget.copyPasteCode != null) ...[
          const Text(
            'PIX Copia e Cola',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surfaceLight),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.copyPasteCode!,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _copyCode,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _copied
                          ? Colors.green.withValues(alpha: 0.2)
                          : AppColors.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _copied ? Icons.check : Icons.copy,
                      color: _copied ? Colors.green : AppColors.primaryLight,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_copied)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Código copiado!',
                style: TextStyle(color: Colors.green, fontSize: 12),
              ),
            ),
        ],

        const SizedBox(height: 32),

        // Instruções
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Como pagar:',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              _Step(number: '1', text: 'Abra o app do seu banco'),
              _Step(number: '2', text: 'Acesse a área de PIX'),
              _Step(
                number: '3',
                text: 'Escaneie o QR code ou cole o código acima',
              ),
              _Step(
                number: '4',
                text: 'Confirme o pagamento — a tela atualiza automaticamente',
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildQrPlaceholder() {
    return SizedBox(
      width: 220,
      height: 220,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.pix, color: AppColors.primary, size: 64),
          const SizedBox(height: 8),
          const Text(
            'Use o código\nCopia e Cola',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildExpired() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.timer_off, color: AppColors.textMuted, size: 64),
            const SizedBox(height: 16),
            const Text(
              'PIX expirado',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'O tempo de pagamento expirou. O pedido foi cancelado automaticamente.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              child: const Text('Voltar ao início'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final String number;
  final String text;

  const _Step({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.3),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: AppColors.primaryLight,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
