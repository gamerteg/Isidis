import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../orders/review_modal.dart';

/// Tela de encerramento da leitura (UX #5)
/// CTAs: Avaliar | Contratar novamente | Voltar ao início
class ReadingEndScreen extends StatelessWidget {
  final String orderId;
  final String gigId;
  final String readerId;
  final String readerName;
  final String? summary;
  final VoidCallback? onReadAgain;

  const ReadingEndScreen({
    super.key,
    required this.orderId,
    required this.gigId,
    required this.readerId,
    required this.readerName,
    this.summary,
    this.onReadAgain,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF1A0A2E), Color(0xFF0F0A1A)],
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Ícone animado
              Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primaryLight.withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: AppColors.primaryLight,
                      size: 40,
                    ),
                  )
                  .animate()
                  .scale(
                    begin: const Offset(0.5, 0.5),
                    duration: 600.ms,
                    curve: Curves.elasticOut,
                  )
                  .fadeIn(),

              const SizedBox(height: 24),

              const Text(
                'Sua leitura chegou ao fim',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.2, end: 0),

              const SizedBox(height: 12),

              // Resumo
              if (summary != null && summary!.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    summary!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.5,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ).animate(delay: 500.ms).fadeIn(),

              const Text(
                'O que você gostaria de fazer agora?',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                textAlign: TextAlign.center,
              ).animate(delay: 500.ms).fadeIn(),

              const SizedBox(height: 32),

              // CTA 1: Avaliar
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showReview(context),
                  icon: const Icon(Icons.star, color: AppColors.gold),
                  label: Text(
                    'Avaliar $readerName',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ).animate(delay: 700.ms).fadeIn().slideY(begin: 0.2, end: 0),

              const SizedBox(height: 12),

              // CTA 2: Contratar novamente
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/gigs/$gigId'),
                  icon: const Icon(
                    Icons.refresh,
                    color: AppColors.primaryLight,
                  ),
                  label: const Text(
                    'Contratar novamente',
                    style: TextStyle(color: AppColors.primaryLight),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ).animate(delay: 850.ms).fadeIn().slideY(begin: 0.2, end: 0),

              const SizedBox(height: 12),

              if (onReadAgain != null || context.canPop()) ...[
                // CTA 3: Ver leitura novamente
                TextButton.icon(
                  onPressed: onReadAgain ?? () => context.pop(),
                  icon: const Icon(
                    Icons.menu_book,
                    color: AppColors.textMuted,
                    size: 18,
                  ),
                  label: const Text(
                    'Ver leitura novamente',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ).animate(delay: 1000.ms).fadeIn(),
              ],

              // CTA 4: Início
              TextButton(
                onPressed: () => context.go('/home'),
                child: const Text(
                  'Voltar ao início',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ).animate(delay: 1100.ms).fadeIn(),
            ],
          ),
        ),
      ),
    );
  }

  void _showReview(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ReviewModal(orderId: orderId, readerName: readerName),
    );
  }
}
