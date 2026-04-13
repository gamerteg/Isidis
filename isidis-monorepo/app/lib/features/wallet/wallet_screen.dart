import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Map<String, dynamic>? _balance;
  List<dynamic> _transactions = [];
  bool _loadingBalance = true;
  bool _loadingTx = true;
  bool _pendingExpanded = true;

  @override
  void initState() {
    super.initState();
    _loadBalance();
    _loadTransactions();
  }

  Future<void> _loadBalance() async {
    try {
      final r = await api.get('/wallet/balance');
      if (mounted) {
        setState(() {
          _balance = r.data['data'] as Map<String, dynamic>?;
          _loadingBalance = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingBalance = false);
    }
  }

  Future<void> _loadTransactions() async {
    try {
      final r = await api.get('/wallet/transactions', params: {'limit': '30'});
      if (mounted) {
        setState(() {
          _transactions = (r.data['data'] as List<dynamic>?) ?? [];
          _loadingTx = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingTx = false);
    }
  }

  String _fmtCurrency(int? cents) {
    if (cents == null) return 'R\$ --';
    return 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    final available = _balance?['available'] as int? ?? 0;
    final pending = _balance?['pending'] as int? ?? 0;
    final pendingItems = (_balance?['pendingItems'] as List<dynamic>?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Carteira',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/reader-home'),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async =>
            Future.wait([_loadBalance(), _loadTransactions()]),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Saldo disponível ────────────────────────────────────────────
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientPrimary,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: _loadingBalance
                    ? const SizedBox(
                        height: 80,
                        child: Center(
                          child: CircularProgressIndicator(color: Colors.white),
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Saldo disponível',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _fmtCurrency(available),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: available > 0
                                  ? () => context.push(
                                      '/withdraw',
                                      extra: {'available': available},
                                    )
                                  : null,
                              icon: const Icon(Icons.pix, size: 18),
                              label: const Text('Solicitar saque via PIX'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppColors.primary,
                                disabledBackgroundColor: Colors.white24,
                                disabledForegroundColor: Colors.white54,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
              ),

              const SizedBox(height: 16),

              // ── Saldo pendente ──────────────────────────────────────────────
              if (!_loadingBalance && pending > 0) ...[
                GestureDetector(
                  onTap: () =>
                      setState(() => _pendingExpanded = !_pendingExpanded),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.vertical(
                        top: const Radius.circular(16),
                        bottom: _pendingExpanded
                            ? Radius.zero
                            : const Radius.circular(16),
                      ),
                      border: Border.all(
                        color: const Color(0xFFFBBF24).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFFFBBF24,
                            ).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.schedule,
                            color: Color(0xFFFBBF24),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Saldo em liberação',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                _fmtCurrency(pending),
                                style: const TextStyle(
                                  color: Color(0xFFFBBF24),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 20,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          _pendingExpanded
                              ? Icons.expand_less
                              : Icons.expand_more,
                          color: AppColors.textMuted,
                        ),
                      ],
                    ),
                  ),
                ),
                if (_pendingExpanded)
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(16),
                      ),
                      border: Border.all(
                        color: const Color(0xFFFBBF24).withValues(alpha: 0.2),
                      ),
                    ),
                    child: Column(
                      children: pendingItems.map((item) {
                        final i = item as Map<String, dynamic>;
                        final amount = i['amount'] as int? ?? 0;
                        final releasesAt =
                            DateTime.tryParse(
                              i['releasesAt'] as String? ?? '',
                            ) ??
                            DateTime.now();
                        final now = DateTime.now();
                        final isReleased = now.isAfter(releasesAt);
                        final elapsed = now.difference(
                          releasesAt.subtract(const Duration(hours: 48)),
                        );
                        final progress = (elapsed.inMilliseconds / 172800000.0)
                            .clamp(0.0, 1.0);
                        final dateStr = DateFormat(
                          "dd/MM 'às' HH'h'mm",
                        ).format(releasesAt.toLocal());

                        return Padding(
                          padding: const EdgeInsets.only(top: 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _fmtCurrency(amount),
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    isReleased
                                        ? '✓ Liberado'
                                        : 'Disponível $dateStr',
                                    style: TextStyle(
                                      color: isReleased
                                          ? Colors.green
                                          : AppColors.textMuted,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  backgroundColor: AppColors.surfaceLight,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    isReleased
                                        ? Colors.green
                                        : const Color(0xFFFBBF24),
                                  ),
                                  minHeight: 5,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                const SizedBox(height: 20),
              ],

              // ── Histórico ───────────────────────────────────────────────────
              const Text(
                'Histórico de transações',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              if (_loadingTx)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_transactions.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Text(
                      'Nenhuma transação ainda.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                )
              else
                ..._transactions.map(
                  (tx) => _TransactionTile(tx: tx as Map<String, dynamic>),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Transaction Tile ───────────────────────────────────────────────────────────
class _TransactionTile extends StatelessWidget {
  final Map<String, dynamic> tx;
  const _TransactionTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final type = tx['type'] as String? ?? '';
    final amount = tx['amount'] as int? ?? 0;
    final status = tx['status'] as String? ?? '';
    final createdAt = DateTime.tryParse(
      tx['created_at'] as String? ?? '',
    )?.toLocal();
    final order = tx['orders'] as Map<String, dynamic>?;
    final gigTitle =
        (order?['gigs'] as Map<String, dynamic>?)?['title'] as String?;
    final paymentMethod = order?['payment_method'] as String?;
    final cardFee = order?['amount_card_fee'] as int?;
    final isCardPayment = paymentMethod == 'CARD' && type == 'SALE_CREDIT';

    final isDebit = type == 'WITHDRAWAL' || type == 'FEE';

    final (IconData icon, Color color, String label) = switch (type) {
      'SALE_CREDIT' => (
        Icons.arrow_downward,
        Colors.green,
        gigTitle ?? 'Venda',
      ),
      'WITHDRAWAL' => (Icons.arrow_upward, AppColors.error, 'Saque PIX'),
      'FEE' => (Icons.percent, AppColors.textMuted, 'Taxa Isidis'),
      _ => (Icons.sync_alt, AppColors.primaryLight, type),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    if (isCardPayment) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Cartão',
                          style: TextStyle(
                            color: AppColors.primaryLight,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (isCardPayment && cardFee != null)
                  Text(
                    'Taxa do cartao: -R\$ ${(cardFee / 100).toStringAsFixed(2).replaceAll('.', ',')}',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  )
                else if (createdAt != null)
                  Text(
                    DateFormat('dd/MM/yy  HH:mm').format(createdAt),
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                if (isCardPayment && createdAt != null)
                  Text(
                    DateFormat('dd/MM/yy  HH:mm').format(createdAt),
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isDebit ? '-' : '+'}R\$ ${(amount / 100).toStringAsFixed(2).replaceAll('.', ',')}',
                style: TextStyle(
                  color: isDebit ? AppColors.error : Colors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              Text(
                status == 'COMPLETED'
                    ? 'Concluído'
                    : status == 'PENDING'
                    ? 'Pendente'
                    : status,
                style: TextStyle(
                  color: status == 'COMPLETED'
                      ? Colors.green
                      : const Color(0xFFFBBF24),
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
