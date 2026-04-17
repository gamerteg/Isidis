import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api/api_client.dart';
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
  bool _loading = true;
  String? _error;
  WebViewController? _webViewController;
  Timer? _pollTimer;
  int _pollAttempts = 0;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) return;
    unawaited(_loadBrick());
  }

  Future<void> _loadBrick() async {
    try {
      final response = await api.get('/checkout/config');
      final data = response.data['data'] as Map<String, dynamic>;
      final publicKey = data['public_key'] as String?;

      if (publicKey == null || publicKey.isEmpty) {
        throw Exception('Mercado Pago public key ausente em /checkout/config');
      }

      final payer = (data['payer'] as Map?)?.cast<String, dynamic>() ?? {};
      final amount = (widget.amountTotal / 100).toStringAsFixed(2);
      final payerJson = jsonEncode(payer);
      final publicKeyJson = jsonEncode(publicKey);

      final html = '''
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mercado Pago</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #0f0e18;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        min-height: 100vh;
        padding: 20px;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.10), transparent 28%),
          radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.12), transparent 26%),
          linear-gradient(180deg, #09080f 0%, #12111d 100%);
      }
      .card {
        max-width: 680px;
        margin: 0 auto;
        padding: 18px;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(10,10,16,0.72);
        backdrop-filter: blur(16px);
        box-shadow: 0 30px 80px rgba(0,0,0,0.32);
      }
      .header {
        margin-bottom: 18px;
      }
      .eyebrow {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.10);
        border: 1px solid rgba(56, 189, 248, 0.20);
        color: #bae6fd;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 12px 0 6px;
        font-size: 22px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: #94a3b8;
        line-height: 1.5;
      }
      #cardPaymentBrick_container {
        margin-top: 18px;
      }
    </style>
    <script src="https://sdk.mercadopago.com/js/v2"></script>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <div class="header">
          <span class="eyebrow">Mercado Pago Bricks</span>
          <h1>Cartao de credito ou debito</h1>
          <p>Preencha os dados no componente oficial do Mercado Pago. A confirmacao do pedido continua sendo acompanhada pela Isidis.</p>
        </div>
        <div id="cardPaymentBrick_container"></div>
      </div>
    </div>

    <script>
      const publicKey = $publicKeyJson;
      const initializationPayer = $payerJson;
      const mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      let paymentBrickController = null;

      const settings = {
        initialization: {
          amount: $amount,
          payer: initializationPayer,
        },
        customization: {
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 1,
            types: {
              included: ['credit_card', 'debit_card'],
            },
          },
          visual: {
            hideFormTitle: true,
            style: {
              theme: 'dark',
            },
          },
        },
        callbacks: {
          onReady: () => {
            TokenChannel.postMessage(JSON.stringify({ type: 'ready' }));
          },
          onSubmit: (cardFormData, additionalData) => {
            TokenChannel.postMessage(JSON.stringify({
              type: 'submit',
              cardFormData,
              additionalData: additionalData || null,
            }));

            return new Promise((resolve, reject) => {
              window.__resolvePaymentBrick = resolve;
              window.__rejectPaymentBrick = reject;
            });
          },
          onError: (error) => {
            TokenChannel.postMessage(JSON.stringify({
              type: 'error',
              error: error?.message || 'Erro ao carregar o checkout do Mercado Pago.',
            }));
          },
        },
      };

      async function mountBrick() {
        paymentBrickController = await bricksBuilder.create(
          'cardPayment',
          'cardPaymentBrick_container',
          settings,
        );
      }

      mountBrick().catch((error) => {
        TokenChannel.postMessage(JSON.stringify({
          type: 'error',
          error: error?.message || 'Erro ao renderizar o checkout do Mercado Pago.',
        }));
      });
    </script>
  </body>
</html>
''';

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.transparent)
        ..addJavaScriptChannel(
          'TokenChannel',
          onMessageReceived: (message) => _handleBrickMessage(message.message),
        )
        ..loadHtmlString(html);

      if (!mounted) return;
      setState(() {
        _webViewController = controller;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _extractError(error);
      });
    }
  }

  Future<void> _handleBrickMessage(String message) async {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(message) as Map<String, dynamic>;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Erro ao processar resposta do checkout.';
      });
      return;
    }

    final type = data['type'] as String?;

    if (type == 'ready') {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = null;
      });
      return;
    }

    if (type == 'error') {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = data['error'] as String? ?? 'Erro no checkout do Mercado Pago.';
      });
      return;
    }

    if (type != 'submit') {
      return;
    }

    final cardFormData =
        (data['cardFormData'] as Map?)?.cast<String, dynamic>() ?? {};
    final payer = (cardFormData['payer'] as Map?)?.cast<String, dynamic>();
    final additionalData =
        (data['additionalData'] as Map?)?.cast<String, dynamic>();

    if (!mounted) return;
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
          'transaction_amount':
              (cardFormData['transaction_amount'] as num?)?.toDouble(),
          'card_token': cardFormData['token'] as String?,
          'payment_method_id': cardFormData['payment_method_id'] as String?,
          'installments': cardFormData['installments'],
          'issuer_id': cardFormData['issuer_id'],
          'payer': payer,
          'brick_payment_type':
              additionalData?['paymentTypeId'] as String? ?? 'cardPayment',
          'brick_selected_payment_method': 'cardPayment',
          'brick_additional_data': additionalData,
          'card_holder_name': additionalData?['cardholderName'] as String?,
        },
      );

      await _resolveBrickPromise();

      final responseData = response.data['data'] as Map<String, dynamic>;
      final status = responseData['status'] as String?;
      final orderId = responseData['order_id'] as String;
      final paymentId =
          responseData['payment_id'] as String? ??
          responseData['mercadopago_payment_id'] as String?;

      if (status == 'CONFIRMED' || status == 'PAID') {
        if (!mounted) return;
        context.pushReplacement('/order-confirmation/$orderId');
        return;
      }

      if (paymentId == null || paymentId.isEmpty) {
        throw Exception('Mercado Pago nao retornou o identificador do pagamento.');
      }

      _startPolling(paymentId, orderId);
    } catch (error) {
      await _rejectBrickPromise(_extractError(error));
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _extractError(error);
      });
    }
  }

  Future<void> _resolveBrickPromise() async {
    await _webViewController?.runJavaScript(
      'window.__resolvePaymentBrick && window.__resolvePaymentBrick();'
      'window.__resolvePaymentBrick = null;'
      'window.__rejectPaymentBrick = null;',
    );
  }

  Future<void> _rejectBrickPromise(String message) async {
    final encodedMessage = jsonEncode(message);
    await _webViewController?.runJavaScript(
      'window.__rejectPaymentBrick && window.__rejectPaymentBrick(new Error($encodedMessage));'
      'window.__resolvePaymentBrick = null;'
      'window.__rejectPaymentBrick = null;',
    );
  }

  void _startPolling(String paymentId, String orderId) {
    _pollAttempts = 0;
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      _pollAttempts++;
      if (_pollAttempts > 120) {
        _pollTimer?.cancel();
        if (!mounted) return;
        setState(() {
          _error =
              'Ainda nao recebemos a confirmacao do pagamento. Verifique com o banco e acompanhe o pedido no app.';
          _loading = false;
        });
        return;
      }

      try {
        final res = await api.get('/checkout/status/$paymentId');
        final status = res.data['data']['status'] as String?;
        if (status == 'PAID') {
          _pollTimer?.cancel();
          if (!mounted) return;
          context.pushReplacement('/order-confirmation/$orderId');
        } else if (status == 'REJECTED' || status == 'CANCELLED') {
          _pollTimer?.cancel();
          if (!mounted) return;
          setState(() {
            _loading = false;
            _error =
                'O pagamento foi recusado ou cancelado. Tente outro cartao ou outra forma de pagamento.';
          });
        }
      } catch (error) {
        debugPrint('[CreditCard] Polling error (attempt $_pollAttempts): $error');
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  String _extractError(dynamic error) {
    try {
      final responseData = (error as dynamic).response?.data;
      if (responseData is Map && responseData['error'] is String) {
        return responseData['error'] as String;
      }
    } catch (_) {}
    return error is Exception
        ? error.toString().replaceFirst('Exception: ', '')
        : 'Erro ao processar pagamento. Tente novamente.';
  }

  String _formatCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
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
                    'Pagamento com cartao ainda nao esta disponivel na versao web do app Flutter.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Para seguir agora, use o checkout web da Isidis ou volte e conclua via PIX.',
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
          'Pagamento com Cartao',
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
                  child: Column(
                    children: [
                      Row(
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
                            _formatCurrency(widget.amountTotal),
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'O Brick oficial do Mercado Pago aceita credito e debito. A taxa operacional continua sendo tratada pela plataforma.',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: _webViewController != null
                    ? WebViewWidget(controller: _webViewController!)
                    : const Center(child: CircularProgressIndicator()),
              ),
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
