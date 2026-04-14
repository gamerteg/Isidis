import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/platform/platform_capabilities.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/gig.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';

class CheckoutScreen extends StatefulWidget {
  final String gigId;
  final List<String> selectedAddOnIds;

  const CheckoutScreen({
    super.key,
    required this.gigId,
    required this.selectedAddOnIds,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

const double _asaasCardFeePercent = 0.0349;
const int _asaasCardFeeFixed = 39;

int _calculateCardFee(int amountInCents) {
  return (amountInCents * _asaasCardFeePercent).ceil() + _asaasCardFeeFixed;
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  Gig? _gig;
  bool _loading = true;
  bool _submitting = false;
  String _paymentMethod = 'PIX';
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _answerControllers = {};

  @override
  void initState() {
    super.initState();
    _loadGig();
  }

  @override
  void dispose() {
    for (final controller in _answerControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadGig() async {
    try {
      final response = await api.get('/gigs/${widget.gigId}');
      final rawData = response.data['data'];
      if (rawData is! Map<String, dynamic>) {
        throw FormatException('Resposta inesperada de /gigs/${widget.gigId}');
      }
      final gig = Gig.fromJson(rawData);
      if (!mounted) return;

      setState(() {
        _gig = gig;
        final preferredPaymentMethod =
            PlatformCapabilities.isWeb && gig.paymentMethods.contains('PIX')
            ? 'PIX'
            : _paymentMethod;
        _paymentMethod = gig.paymentMethods.contains(preferredPaymentMethod)
            ? preferredPaymentMethod
            : gig.paymentMethods.first;
        _loading = false;

        for (final req in gig.requirements) {
          _answerControllers[req.id] = TextEditingController();
        }
      });
    } catch (e) {
      debugPrint('[Checkout] Failed to load gig ${widget.gigId}: $e');
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  List<GigAddOn> get _selectedAddOns {
    final gig = _gig;
    if (gig == null) return [];
    return gig.addOns
        .where((item) => widget.selectedAddOnIds.contains(item.id))
        .toList();
  }

  int get _serviceTotal {
    final gig = _gig;
    if (gig == null) return 0;
    return gig.price + _selectedAddOns.fold(0, (sum, item) => sum + item.price);
  }

  bool get _acceptsPix => _gig?.paymentMethods.contains('PIX') ?? true;

  bool get _gigAcceptsCard => _gig?.paymentMethods.contains('CARD') ?? true;

  bool get _acceptsCard =>
      PlatformCapabilities.supportsEmbeddedCardCheckout && _gigAcceptsCard;

  int get _chargeTotal {
    if (_paymentMethod != 'CARD') return _serviceTotal;
    return _serviceTotal;
  }

  int get _cardFee {
    if (_paymentMethod != 'CARD') return 0;
    return _calculateCardFee(_chargeTotal);
  }

  String _currency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final answers = <String, String>{};
    for (final entry in _answerControllers.entries) {
      answers[entry.key] = entry.value.text.trim();
    }

    // Para CARD: navegar direto para CreditCardScreen — ela faz checkout/create após tokenizar
    if (_paymentMethod == 'CARD') {
      context.pushReplacement(
        '/credit-card',
        extra: {
          'gigId': widget.gigId,
          'addOnIds': widget.selectedAddOnIds,
          'requirementsAnswers': answers,
          'amountTotal': _serviceTotal,
          'amountCardFee': _cardFee,
        },
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final response = await api.post(
        '/checkout/create',
        data: {
          'gig_id': widget.gigId,
          'add_on_ids': widget.selectedAddOnIds,
          'requirements_answers': answers,
          'payment_method': 'PIX',
        },
      );

      if (!mounted) return;

      final data = response.data['data'] as Map<String, dynamic>;

      final pix = data['pix'] as Map<String, dynamic>?;
      context.pushReplacement(
        '/pix',
        extra: {
          'orderId': data['order_id'] as String,
          'pixQrCodeId': data['pix_qr_code_id'] as String,
          'amountTotal': data['amount_total'] as int,
          'qrCodeBase64': pix?['qr_code_base64'] as String?,
          'copyPasteCode': pix?['copy_paste_code'] as String?,
          'expiresAt': pix?['expires_at'] as String?,
        },
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_extractError(error)),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  String _extractError(dynamic error) {
    try {
      final data = (error as dynamic).response?.data;
      if (data is Map && data['error'] is String) {
        return data['error'] as String;
      }
    } catch (_) {}
    return 'Erro ao processar pedido. Tente novamente.';
  }

  String _deliveryLabel(int hours) {
    if (hours < 24) {
      return '$hours horas';
    }
    final days = (hours / 24).ceil();
    return '$days ${days == 1 ? 'dia' : 'dias'}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final gig = _gig;
    if (gig == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: AppColors.background),
        body: const Center(
          child: Text(
            'Servico nao encontrado',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Stack(
            children: [
              ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
                children: [
                  Row(
                    children: [
                      InkWell(
                        onTap: () => context.pop(),
                        borderRadius: BorderRadius.circular(999),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surfaceLight.withValues(
                              alpha: 0.55,
                            ),
                          ),
                          child: const Icon(
                            Icons.arrow_back_rounded,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Solicitar leitura',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Etapa final',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Revise os detalhes e escolha a forma de pagamento.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 18),
                  _CheckoutCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          gig.title,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Entrega em ${_deliveryLabel(gig.deliveryTimeHours)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (_acceptsPix)
                              const _InlineChip(
                                icon: Icons.pix,
                                label: 'Aceita PIX',
                              ),
                            if (_acceptsCard)
                              const _InlineChip(
                                icon: Icons.credit_card,
                                label: 'Aceita cartao',
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (gig.requirements.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const _SectionTitle('Responda as perguntas'),
                    const SizedBox(height: 8),
                    Text(
                      'Quanto mais contexto voce trouxer, mais direcionada sera a leitura.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    ...gig.requirements.map((requirement) {
                      final controller = _answerControllers[requirement.id]!;
                      if (requirement.type == 'choice' &&
                          requirement.options.isNotEmpty) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _CheckoutCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  requirement.required
                                      ? '${requirement.question} *'
                                      : requirement.question,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: requirement.options.map((option) {
                                    final selected = controller.text == option;
                                    return ChoiceChip(
                                      label: Text(option),
                                      selected: selected,
                                      onSelected: (_) {
                                        setState(
                                          () => controller.text = option,
                                        );
                                      },
                                    );
                                  }).toList(),
                                ),
                                if (requirement.required)
                                  FormField<String>(
                                    validator: (_) => controller.text.isEmpty
                                        ? 'Selecione uma opcao'
                                        : null,
                                    builder: (field) {
                                      if (!field.hasError) {
                                        return const SizedBox.shrink();
                                      }
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(
                                          field.errorText!,
                                          style: const TextStyle(
                                            color: AppColors.error,
                                            fontSize: 12,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                              ],
                            ),
                          ),
                        );
                      }

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _CheckoutCard(
                          child: AppTextField(
                            controller: controller,
                            label: requirement.question,
                            maxLines: 4,
                            minLines: 1,
                            validator: requirement.required
                                ? (value) =>
                                      (value == null || value.trim().isEmpty)
                                      ? 'Campo obrigatorio'
                                      : null
                                : null,
                          ),
                        ),
                      );
                    }),
                  ],
                  if (_selectedAddOns.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const _SectionTitle('Extras selecionados'),
                    const SizedBox(height: 12),
                    _CheckoutCard(
                      child: Column(
                        children: _selectedAddOns
                            .map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        item.title,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodyMedium,
                                      ),
                                    ),
                                    Text(
                                      '+ ${_currency(item.price)}',
                                      style: const TextStyle(
                                        color: AppColors.primaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const _SectionTitle('Resumo do pedido'),
                  const SizedBox(height: 12),
                  _CheckoutCard(
                    child: Column(
                      children: [
                        _SummaryRow(label: 'Leitura', value: gig.price),
                        ..._selectedAddOns.map(
                          (item) =>
                              _SummaryRow(label: item.title, value: item.price),
                        ),
                        const Divider(),
                        _SummaryRow(
                          label: 'Total',
                          value: _chargeTotal,
                          bold: true,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const _SectionTitle('Forma de pagamento'),
                  const SizedBox(height: 12),
                  _CheckoutCard(
                    child: Column(
                      children: [
                        if (_acceptsPix)
                          _PaymentMethodOption(
                            label: 'PIX',
                            subtitle: 'Geracao instantanea de QR code',
                            icon: Icons.pix,
                            iconColor: AppColors.gold,
                            selected: _paymentMethod == 'PIX',
                            onTap: () => setState(() => _paymentMethod = 'PIX'),
                          ),
                        if (_acceptsPix && _acceptsCard)
                          const Divider(height: 24),
                        if (_acceptsCard)
                          _PaymentMethodOption(
                            label: 'Cartao de credito',
                            subtitle: 'Visa, Mastercard e outros',
                            icon: Icons.credit_card,
                            iconColor: AppColors.primaryLight,
                            selected: _paymentMethod == 'CARD',
                            onTap: () =>
                                setState(() => _paymentMethod = 'CARD'),
                          ),
                        if (PlatformCapabilities.isWeb && _gigAcceptsCard) ...[
                          if (_acceptsPix) const Divider(height: 24),
                          const _InfoBanner(
                            text:
                                'Cartao de credito fica indisponivel na versao web por enquanto. Use PIX ou finalize o pagamento pelo app mobile.',
                          ),
                        ],
                        if (_paymentMethod == 'CARD') ...[
                          const SizedBox(height: 12),
                          _InfoBanner(
                            text:
                                'Taxa do cartao (${_currency(_cardFee)}) deduzida do ganho da tarologa.',
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    border: Border(
                      top: BorderSide(
                        color: AppColors.primaryLight.withValues(alpha: 0.08),
                      ),
                    ),
                  ),
                  child: SafeArea(
                    top: false,
                    child: AppButton(
                      label:
                          PlatformCapabilities.isWeb && _paymentMethod == 'CARD'
                          ? 'Cartao indisponivel no navegador'
                          : _paymentMethod == 'CARD'
                          ? 'Pagar ${_currency(_chargeTotal)} no cartao'
                          : 'Pagar ${_currency(_chargeTotal)} via PIX',
                      loading: _submitting,
                      onPressed:
                          PlatformCapabilities.isWeb && _paymentMethod == 'CARD'
                          ? null
                          : _submit,
                    ),
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

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(title, style: Theme.of(context).textTheme.titleLarge);
  }
}

class _CheckoutCard extends StatelessWidget {
  final Widget child;

  const _CheckoutCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.08),
        ),
      ),
      child: child,
    );
  }
}

class _InlineChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InlineChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.primaryLight, size: 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodOption extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final bool selected;
  final VoidCallback onTap;

  const _PaymentMethodOption({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: iconColor.withValues(alpha: 0.14),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            selected ? Icons.radio_button_checked : Icons.radio_button_off,
            color: selected ? AppColors.primary : AppColors.textMuted,
          ),
        ],
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  final String text;

  const _InfoBanner({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final int value;
  final bool bold;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.bold = false,
  });

  String _currency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: bold ? AppColors.textPrimary : AppColors.textSecondary,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
                fontSize: bold ? 16 : 14,
              ),
            ),
          ),
          Text(
            _currency(value),
            style: TextStyle(
              color: bold ? AppColors.gold : AppColors.textPrimary,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
              fontSize: bold ? 16 : 14,
            ),
          ),
        ],
      ),
    );
  }
}
