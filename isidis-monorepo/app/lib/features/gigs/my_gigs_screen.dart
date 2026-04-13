import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class MyGigsScreen extends StatefulWidget {
  const MyGigsScreen({super.key});

  @override
  State<MyGigsScreen> createState() => _MyGigsScreenState();
}

class _MyGigsScreenState extends State<MyGigsScreen> {
  List<dynamic> _gigs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadGigs();
  }

  Future<void> _loadGigs() async {
    setState(() => _loading = true);
    try {
      final r = await api.get('/gigs');
      if (mounted) {
        setState(() {
          _gigs = (r.data['data'] as List<dynamic>?) ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(Map<String, dynamic> gig) async {
    if (gig['status'] != 'APPROVED') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Aguardando aprovação para ativar este serviço.'),
        ),
      );
      return;
    }
    try {
      await api.patch('/gigs/${gig['id']}/toggle');
      await _loadGigs();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erro ao alterar status.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Meus serviços',
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
        actions: [
          TextButton.icon(
            onPressed: () async {
              await context.push('/my-gigs/new');
              _loadGigs();
            },
            icon: const Icon(
              Icons.add,
              color: AppColors.primaryLight,
              size: 18,
            ),
            label: const Text(
              'Novo',
              style: TextStyle(color: AppColors.primaryLight),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadGigs,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _gigs.isEmpty
            ? _EmptyState(
                onTap: () async {
                  await context.push('/my-gigs/new');
                  _loadGigs();
                },
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _gigs.length,
                itemBuilder: (_, i) {
                  final gig = _gigs[i] as Map<String, dynamic>;
                  return _GigCard(
                    gig: gig,
                    onToggle: () => _toggle(gig),
                    onEdit: () async {
                      await context.push(
                        '/my-gigs/${gig['id']}/edit',
                        extra: gig,
                      );
                      _loadGigs();
                    },
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await context.push('/my-gigs/new');
          _loadGigs();
        },
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _GigCard extends StatelessWidget {
  final Map<String, dynamic> gig;
  final VoidCallback onToggle;
  final VoidCallback onEdit;

  const _GigCard({
    required this.gig,
    required this.onToggle,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final title = gig['title'] as String? ?? '';
    final price = gig['price'] as int? ?? 0;
    final isActive = gig['is_active'] as bool? ?? false;
    final status = gig['status'] as String? ?? 'PENDING';
    final hours = gig['delivery_time_hours'] as int? ?? 0;
    final paymentMethods =
        (gig['payment_methods'] as List<dynamic>?)
            ?.map((item) => item.toString())
            .toList() ??
        const ['PIX', 'CARD'];
    final acceptsPix = paymentMethods.contains('PIX');
    final acceptsCard = paymentMethods.contains('CARD');
    final paymentLabel = acceptsPix && acceptsCard
        ? 'PIX + Cartao'
        : acceptsCard
        ? 'Cartao'
        : 'PIX';
    final feeLabel = 'Taxa do cartao por conta da tarologa';

    final (Color statusColor, String statusLabel) = switch (status) {
      'APPROVED' => (Colors.green, 'Aprovado'),
      'PENDING' => (const Color(0xFFFBBF24), 'Em revisão'),
      'REJECTED' => (AppColors.error, 'Rejeitado'),
      _ => (AppColors.textMuted, status),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.style,
                    color: AppColors.primaryLight,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            'R\$ ${(price / 100).toStringAsFixed(2).replaceAll('.', ',')}',
                            style: const TextStyle(
                              color: AppColors.primaryLight,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          const Text(
                            ' · ',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                          Text(
                            '${hours}h',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _GigInfoChip(
                            icon: acceptsCard
                                ? Icons.payments_outlined
                                : Icons.pix,
                            label: paymentLabel,
                          ),
                          if (acceptsCard)
                            _GigInfoChip(icon: Icons.percent, label: feeLabel),
                        ],
                      ),
                    ],
                  ),
                ),
                // Toggle
                Switch(
                  value: isActive,
                  onChanged: (_) => onToggle(),
                  activeThumbColor: AppColors.primaryLight,
                  inactiveThumbColor: AppColors.textMuted,
                  inactiveTrackColor: AppColors.surfaceLight,
                ),
              ],
            ),
          ),

          // Footer: status + edit button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.background.withValues(alpha: 0.4),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusLabel,
                      style: TextStyle(color: statusColor, fontSize: 12),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: onEdit,
                  child: const Text(
                    'Editar',
                    style: TextStyle(
                      color: AppColors.primaryLight,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GigInfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _GigInfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.background.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
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
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onTap;
  const _EmptyState({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.style_outlined,
              color: AppColors.textMuted,
              size: 64,
            ),
            const SizedBox(height: 16),
            const Text(
              'Nenhum serviço criado',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Crie seu primeiro serviço de leitura para começar a receber pedidos.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onTap,
              icon: const Icon(Icons.add),
              label: const Text('Criar serviço'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
