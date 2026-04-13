import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_button.dart';

class UnderReviewScreen extends StatelessWidget {
  const UnderReviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A0A2E), AppColors.background],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () async {
                      await SupabaseService.signOut();
                      if (context.mounted) context.go('/login');
                    },
                    child: const Text(
                      'Sair',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD97706).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFFD97706).withOpacity(0.5),
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.access_time,
                        color: Color(0xFFD97706),
                        size: 14,
                      ),
                      SizedBox(width: 6),
                      Text(
                        'Em análise',
                        style: TextStyle(
                          color: Color(0xFFD97706),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text(
                  'Sua conta está em análise',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Nossa equipe está revisando seus dados. Geralmente leva até 48 horas.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 15,
                    height: 1.5,
                  ),
                ),

                const SizedBox(height: 32),

                // Checklist
                _ChecklistItem(
                  icon: Icons.check_circle,
                  label: 'Conta criada',
                  done: true,
                ),
                const SizedBox(height: 12),
                _ChecklistItem(
                  icon: Icons.pending,
                  label: 'Dados verificados pela equipe Isidis',
                  done: false,
                ),
                const SizedBox(height: 12),
                _ChecklistItem(
                  icon: Icons.pending,
                  label: 'Perfil publicado no marketplace',
                  done: false,
                ),

                const SizedBox(height: 32),

                // CTA to create gig while waiting
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withOpacity(0.2),
                        AppColors.primary.withOpacity(0.05),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.4),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            color: AppColors.primaryLight,
                            size: 20,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Não fique parado!',
                            style: TextStyle(
                              color: AppColors.primaryLight,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Crie seus serviços agora. Eles serão publicados automaticamente assim que sua conta for aprovada.',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      AppButton(
                        label: 'Criar meu primeiro serviço',
                        icon: Icons.add,
                        onPressed: () => context.push('/my-gigs/new'),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                Center(
                  child: Text(
                    'Dúvidas? Entre em contato: suporte@isidis.app',
                    style: TextStyle(
                      color: AppColors.textMuted.withOpacity(0.7),
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ChecklistItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool done;

  const _ChecklistItem({
    required this.icon,
    required this.label,
    required this.done,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          done ? Icons.check_circle : Icons.radio_button_unchecked,
          color: done ? Colors.greenAccent : AppColors.textMuted,
          size: 20,
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            color: done ? AppColors.textPrimary : AppColors.textSecondary,
            fontSize: 15,
          ),
        ),
      ],
    );
  }
}
