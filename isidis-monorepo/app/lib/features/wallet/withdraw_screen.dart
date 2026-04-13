import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/data/pix_key_types.dart';
import '../../shared/widgets/app_text_field.dart';

class WithdrawScreen extends StatefulWidget {
  final int availableBalance;

  const WithdrawScreen({super.key, required this.availableBalance});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _pixKeyCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _pixKeyType = 'CPF';
  bool _loading = false;
  bool _loadingProfile = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _pixKeyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final r = await api.get('/me');
      final profile = r.data['data'] as Map<String, dynamic>?;
      if (mounted && profile != null) {
        setState(() {
          _pixKeyCtrl.text = profile['pix_key'] as String? ?? '';
          _pixKeyType = normalizePixKeyType(
            profile['pix_key_type'] as String?,
            pixKey: profile['pix_key'] as String?,
          );
          _loadingProfile = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final amountStr = _amountCtrl.text.trim().replaceAll(',', '.');
    final amountReal = double.tryParse(amountStr) ?? 0;
    final amountCents = (amountReal * 100).round();

    if (amountCents <= 0) {
      _showError('Valor inválido.');
      return;
    }
    if (amountCents > widget.availableBalance) {
      _showError('Valor maior que o saldo disponível.');
      return;
    }

    setState(() => _loading = true);
    try {
      await api.post(
        '/wallet/withdraw',
        data: {
          'amount': amountCents,
          'pix_key_type': _pixKeyType,
          'pix_key': _pixKeyCtrl.text.trim(),
          if (_notesCtrl.text.trim().isNotEmpty)
            'notes': _notesCtrl.text.trim(),
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Saque solicitado! Processaremos em até 1 dia útil.'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) _showError('Erro ao solicitar saque. Tente novamente.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  String _fmtCurrency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Solicitar saque',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loadingProfile
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Saldo disponível
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.green.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.account_balance_wallet,
                            color: Colors.green,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Disponível: ${_fmtCurrency(widget.availableBalance)}',
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    const Text(
                      'Valor do saque',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    AppTextField(
                      controller: _amountCtrl,
                      label: 'Valor em R\$',
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]')),
                      ],
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Informe o valor';
                        final n = double.tryParse(v.replaceAll(',', '.'));
                        if (n == null || n <= 0) return 'Valor inválido';
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    const Text(
                      'Chave PIX',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Tipo da chave
                    DropdownButtonFormField<String>(
                      value: _pixKeyType,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: AppColors.surfaceLight),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: AppColors.surfaceLight),
                        ),
                        labelText: 'Tipo de chave',
                        labelStyle: const TextStyle(color: AppColors.textMuted),
                      ),
                      dropdownColor: AppColors.surface,
                      style: const TextStyle(color: AppColors.textPrimary),
                      items: pixKeyTypeOptions
                          .map(
                            (t) => DropdownMenuItem(
                              value: t.value,
                              child: Text(t.label),
                            ),
                          )
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _pixKeyType = v ?? 'CPF'),
                    ),

                    const SizedBox(height: 12),

                    AppTextField(
                      controller: _pixKeyCtrl,
                      label: 'Chave PIX',
                      validator: (v) {
                        if (v == null || v.isEmpty)
                          return 'Informe a chave PIX';
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    AppTextField(
                      controller: _notesCtrl,
                      label: 'Observação (opcional)',
                      maxLines: 2,
                    ),

                    const SizedBox(height: 32),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Confirmar saque',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 16),
                    const Text(
                      'Saques são processados manualmente em até 1 dia útil. Você receberá a confirmação por email.',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
