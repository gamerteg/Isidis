import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/gradient_background.dart';

class RegisterClientScreen extends StatefulWidget {
  const RegisterClientScreen({super.key});

  @override
  State<RegisterClientScreen> createState() => _RegisterClientScreenState();
}

class _RegisterClientScreenState extends State<RegisterClientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _cpfCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _cpfCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final signUpResponse = await SupabaseService.signUp(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
        data: {'full_name': _nameCtrl.text.trim(), 'role': 'CLIENT'},
      );

      if (signUpResponse.session != null) {
        // Confirmação de email desativada no Supabase — sessão imediata.
        final cpf = _cpfCtrl.text.trim();
        final phone = _phoneCtrl.text.trim();
        if (cpf.isNotEmpty || phone.isNotEmpty) {
          try {
            await api.patch(
              '/me',
              data: {
                if (cpf.isNotEmpty)
                  'tax_id': cpf.replaceAll(RegExp(r'[^0-9]'), ''),
                if (phone.isNotEmpty)
                  'cellphone': phone.replaceAll(RegExp(r'[^0-9]'), ''),
              },
            );
          } catch (_) {
            // Non-critical — user can fill later
          }
        }
        if (!mounted) return;
        context.go('/home');
      } else {
        // Confirmação de email ativada no Supabase.
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Conta criada! Confirme seu email para continuar.'),
            duration: Duration(seconds: 5),
          ),
        );
        context.go('/login');
      }
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            msg.contains('already registered')
                ? 'Email já cadastrado'
                : msg.contains('429') || msg.contains('rate')
                    ? 'Muitas tentativas. Aguarde alguns minutos.'
                    : 'Erro ao criar conta. Tente novamente.',
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  IconButton(
                    icon: const Icon(
                      Icons.arrow_back,
                      color: AppColors.textPrimary,
                    ),
                    onPressed: () => context.go('/login'),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Criar conta',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Comece sua jornada espiritual',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 32),

                  AppTextField(
                    controller: _nameCtrl,
                    label: 'Nome completo',
                    textCapitalization: TextCapitalization.words,
                    validator: (v) =>
                        v!.trim().isEmpty ? 'Informe seu nome' : null,
                  ),
                  const SizedBox(height: 16),

                  AppTextField(
                    controller: _emailCtrl,
                    label: 'Email',
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) {
                      if (v!.isEmpty) return 'Informe seu email';
                      if (!v.contains('@')) return 'Email inválido';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  AppTextField(
                    controller: _passwordCtrl,
                    label: 'Senha',
                    obscureText: _obscurePassword,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: AppColors.textMuted,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    validator: (v) {
                      if (v!.isEmpty) return 'Informe uma senha';
                      if (v.length < 6) return 'Mínimo 6 caracteres';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // CPF / Phone — optional with incentive
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.bolt,
                              color: AppColors.primaryLight,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Preencha agora e agilize seu primeiro pedido',
                                style: TextStyle(
                                  color: AppColors.primaryLight,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'CPF e telefone são necessários no momento do pagamento. Opcional agora.',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 16),
                        AppTextField(
                          controller: _cpfCtrl,
                          label: 'CPF (opcional)',
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            _CpfInputFormatter(),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: _phoneCtrl,
                          label: 'Telefone (opcional)',
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            _PhoneInputFormatter(),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  AppButton(
                    label: 'Criar conta',
                    loading: _loading,
                    onPressed: _register,
                  ),

                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Já tem conta? ',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      TextButton(
                        onPressed: () => context.go('/login'),
                        child: const Text(
                          'Entrar',
                          style: TextStyle(color: AppColors.primaryLight),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CpfInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 11) return oldValue;
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i == 3 || i == 6) buffer.write('.');
      if (i == 9) buffer.write('-');
      buffer.write(digits[i]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class _PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 11) return oldValue;
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i == 0) buffer.write('(');
      if (i == 2) buffer.write(') ');
      if (i == 7) buffer.write('-');
      buffer.write(digits[i]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
