import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/profile.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/gradient_background.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      await SupabaseService.signIn(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Email ou senha incorretos'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    try {
      if (!mounted) return;

      // Buscar perfil para redirecionar corretamente
      final response = await api.get('/me');
      final profile = Profile.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );

      if (!mounted) return;

      if (profile.isReader) {
        if (!profile.isApproved) {
          context.go('/under-review');
        } else {
          context.go('/reader-home');
        }
      } else {
        try {
          final quizResponse = await api.get('/me/quiz');
          final quizData = quizResponse.data['data'] as Map<String, dynamic>;
          final quizCompleted = quizData['completed'] as bool? ?? false;
          if (!mounted) return;
          context.go(quizCompleted ? '/home' : '/quiz-onboarding');
        } catch (_) {
          if (mounted) context.go('/home');
        }
      }
    } catch (e) {
      if (!mounted) return;
      await SupabaseService.signOut();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao carregar perfil: ${e.toString()}'),
          backgroundColor: AppColors.error,
          duration: const Duration(seconds: 8),
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
                  const SizedBox(height: 48),

                  // Logo / título
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientPrimary,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(
                            Icons.auto_awesome,
                            color: Colors.white,
                            size: 36,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Isidis',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Sua jornada espiritual começa aqui',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 48),

                  AppTextField(
                    controller: _emailCtrl,
                    label: 'Email',
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v!.isEmpty ? 'Informe seu email' : null,
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
                    validator: (v) => v!.isEmpty ? 'Informe sua senha' : null,
                  ),

                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => _showForgotPassword(),
                      child: const Text(
                        'Esqueci minha senha',
                        style: TextStyle(color: AppColors.primaryLight),
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),

                  AppButton(
                    label: 'Entrar',
                    loading: _loading,
                    onPressed: _login,
                  ),

                  const SizedBox(height: 24),

                  Row(
                    children: [
                      const Expanded(child: Divider()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'ou',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                      const Expanded(child: Divider()),
                    ],
                  ),

                  const SizedBox(height: 24),

                  OutlinedButton(
                    onPressed: () => context.go('/register'),
                    child: const Text('Criar conta como cliente'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.go('/register-reader'),
                    child: const Text('Quero ser cartomante'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showForgotPassword() {
    final emailCtrl = TextEditingController(text: _emailCtrl.text);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Recuperar senha'),
        content: AppTextField(
          controller: emailCtrl,
          label: 'Seu email',
          keyboardType: TextInputType.emailAddress,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              await SupabaseService.resetPassword(emailCtrl.text.trim());
              if (ctx.mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Email de recuperação enviado!'),
                  ),
                );
              }
            },
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
  }
}
