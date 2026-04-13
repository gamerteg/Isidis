import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/platform/platform_capabilities.dart';
import '../../core/theme/app_theme.dart';

class CreditCardScreen extends StatefulWidget {
  final String gigId;
  final List<String> addOnIds;
  final Map<String, String> requirementsAnswers;
  final int amountTotal;
  final int amountCardFee;

  const CreditCardScreen({
    super.key,
    required this.gigId,
    required this.addOnIds,
    required this.requirementsAnswers,
    required this.amountTotal,
    required this.amountCardFee,
  });

  @override
  State<CreditCardScreen> createState() => _CreditCardScreenState();
}

class _CreditCardScreenState extends State<CreditCardScreen> {
  bool _loading = false;
  String? _error;
  WebViewController? _webViewController;

  // HTML mínimo com Asaas JS para tokenização de cartão
  static String get _asaasTokenizerHtml => '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0e0e18; font-family: sans-serif; padding: 20px; }
    input {
      display: block; width: 100%; padding: 12px;
      margin-bottom: 12px; border-radius: 10px;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15);
      color: #e2e8f0; font-size: 15px;
    }
    input::placeholder { color: #64748b; }
    .row { display: flex; gap: 8px; }
    .row input { flex: 1; }
    button {
      width: 100%; padding: 14px; background: #7c3aed; color: white;
      border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
      cursor: pointer; margin-top: 8px;
    }
    button:disabled { opacity: 0.5; }
  </style>
  <script src="https://sandbox.asaas.com/static/js/asaas-card.js"></script>
</head>
<body>
<input id="holderName" placeholder="Nome no cartao" autocomplete="cc-name" />
<input id="number" placeholder="Numero do cartao" maxlength="19" autocomplete="cc-number" inputmode="numeric" />
<div class="row">
  <input id="expiryMonth" placeholder="MM" maxlength="2" inputmode="numeric" />
  <input id="expiryYear" placeholder="AAAA" maxlength="4" inputmode="numeric" />
  <input id="ccv" placeholder="CVV" maxlength="4" inputmode="numeric" />
</div>
<input id="postalCode" placeholder="CEP" maxlength="9" inputmode="numeric" />
<input id="addressNumber" placeholder="Numero do endereco" inputmode="numeric" />
<button id="btn" type="button" onclick="tokenize()">Confirmar pagamento</button>
<script>
async function tokenize() {
  document.getElementById('btn').disabled = true;
  document.getElementById('btn').textContent = 'Processando...';
  try {
    const result = await AsaasCreditCard.tokenize({
      holderName: document.getElementById('holderName').value,
      number: document.getElementById('number').value.replace(/\\D/g, ''),
      expiryMonth: document.getElementById('expiryMonth').value,
      expiryYear: document.getElementById('expiryYear').value,
      ccv: document.getElementById('ccv').value,
    });
    TokenChannel.postMessage(JSON.stringify({
      token: result.creditCardToken,
      holderName: document.getElementById('holderName').value,
      postalCode: document.getElementById('postalCode').value.replace(/\\D/g, ''),
      addressNumber: document.getElementById('addressNumber').value,
    }));
  } catch(e) {
    TokenChannel.postMessage(JSON.stringify({ error: e.message || 'Erro ao tokenizar cartao' }));
    document.getElementById('btn').disabled = false;
    document.getElementById('btn').textContent = 'Confirmar pagamento';
  }
}
</script>
</body>
</html>
''';

  @override
  void initState() {
    super.initState();
    if (PlatformCapabilities.isWeb) return;

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'TokenChannel',
        onMessageReceived: (message) => _handleToken(message.message),
      )
      ..loadHtmlString(_asaasTokenizerHtml);
  }

  Future<void> _handleToken(String message) async {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(message) as Map<String, dynamic>;
    } catch (_) {
      setState(() => _error = 'Erro ao processar resposta do cartão.');
      return;
    }

    if (data['error'] != null) {
      setState(() => _error = data['error'] as String);
      return;
    }

    final token = data['token'] as String?;
    if (token == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await api.post(
        '/checkout/create',
        data: {
          'gig_id': widget.gigId,
          'add_on_ids': widget.addOnIds,
          'requirements_answers': widget.requirementsAnswers,
          'payment_method': 'CARD',
          'card_token': token,
          'card_holder_name': data['holderName'] as String? ?? '',
          'card_holder_postal_code': data['postalCode'] as String? ?? '',
          'card_holder_address_number': data['addressNumber'] as String? ?? '',
        },
      );

      final responseData = response.data['data'] as Map<String, dynamic>;
      final status = responseData['status'] as String?;
      final orderId = responseData['order_id'] as String;

      if (status == 'CONFIRMED' || status == 'PAID') {
        if (mounted) {
          context.pushReplacement('/order-confirmation/$orderId');
        }
      } else {
        // PENDING — iniciar polling
        final paymentId = responseData['asaas_payment_id'] as String;
        _startPolling(paymentId, orderId);
      }
    } catch (e) {
      setState(() {
        _error = _extractError(e);
        _loading = false;
      });
    }
  }

  void _startPolling(String paymentId, String orderId) {
    var attempts = 0;
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 5));
      attempts++;
      if (attempts > 120 || !mounted) return false;

      try {
        final res = await api.get('/checkout/status/$paymentId');
        final status = res.data['data']['status'] as String?;
        if (status == 'PAID') {
          if (mounted) {
            context.pushReplacement('/order-confirmation/$orderId');
          }
          return false;
        }
        if (status == 'OVERDUE') {
          if (mounted) {
            setState(() {
              _error = 'Pagamento expirado. Tente novamente.';
              _loading = false;
            });
          }
          return false;
        }
      } catch (_) {}
      return true;
    });
  }

  String _extractError(dynamic error) {
    try {
      final data = (error as dynamic).response?.data;
      if (data is Map && data['error'] is String) {
        return data['error'] as String;
      }
    } catch (_) {}
    return 'Erro ao processar pagamento. Tente novamente.';
  }

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    if (PlatformCapabilities.isWeb) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text(
            'Pagamento com Cartao',
            style: TextStyle(color: AppColors.textPrimary),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
            onPressed: () => context.go('/checkout/${widget.gigId}'),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 520),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.primaryLight.withValues(alpha: 0.08),
                ),
              ),
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.credit_card_off_outlined,
                    color: AppColors.textMuted,
                    size: 40,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Pagamento com cartao ainda nao esta disponivel na versao web.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Esse fluxo depende de WebView no app mobile. Para seguir agora, volte ao checkout e use PIX.',
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Pagamento com Cartão',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: _loading ? null : () => context.pop(),
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Resumo do valor
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.primaryLight.withValues(alpha: 0.08),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total a pagar',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        _formatCurrency(
                          widget.amountTotal + widget.amountCardFee,
                        ),
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // WebView com formulário Asaas
              Expanded(child: WebViewWidget(controller: _webViewController!)),
            ],
          ),
          if (_loading)
            Container(
              color: Colors.black54,
              child: const Center(child: CircularProgressIndicator()),
            ),
          if (_error != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.error, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
