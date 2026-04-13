import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class OrderConfirmationScreen extends StatelessWidget {
  final String orderId;

  const OrderConfirmationScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Ícone animado
                Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.15),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.green.withOpacity(0.5),
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 52,
                      ),
                    )
                    .animate()
                    .scale(
                      begin: const Offset(0.5, 0.5),
                      end: const Offset(1, 1),
                      duration: 500.ms,
                      curve: Curves.elasticOut,
                    )
                    .fadeIn(),

                const SizedBox(height: 32),

                const Text(
                  'Pagamento confirmado!',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.2, end: 0),

                const SizedBox(height: 12),

                const Text(
                  'Seu pedido foi criado com sucesso.\nO cartomante já foi notificado e começará em breve.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 15,
                    height: 1.5,
                  ),
                ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.2, end: 0),

                const SizedBox(height: 48),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () =>
                        context.pushReplacement('/orders/$orderId'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Acompanhar pedido',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ).animate(delay: 700.ms).fadeIn().slideY(begin: 0.2, end: 0),

                const SizedBox(height: 16),

                TextButton(
                  onPressed: () => context.go('/home'),
                  child: const Text(
                    'Voltar ao início',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ).animate(delay: 800.ms).fadeIn(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
