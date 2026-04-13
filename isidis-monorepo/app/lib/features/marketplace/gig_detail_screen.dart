import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/gig.dart';
import '../../shared/models/profile.dart';
import '../../shared/widgets/app_button.dart';

class GigDetailScreen extends StatefulWidget {
  final String gigId;

  const GigDetailScreen({super.key, required this.gigId});

  @override
  State<GigDetailScreen> createState() => _GigDetailScreenState();
}

class _GigDetailScreenState extends State<GigDetailScreen> {
  Gig? _gig;
  bool _loading = true;
  final Set<String> _selectedAddOns = {};

  @override
  void initState() {
    super.initState();
    _loadGig();
  }

  Future<void> _loadGig() async {
    try {
      final response = await api.get('/gigs/${widget.gigId}');
      final data = response.data['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _gig = Gig.fromJson(data);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  int get _totalPrice {
    final gig = _gig;
    if (gig == null) return 0;
    return gig.price +
        gig.addOns
            .where((item) => _selectedAddOns.contains(item.id))
            .fold(0, (sum, item) => sum + item.price);
  }

  String _currency(int cents) =>
      'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final gig = _gig;
    if (gig == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: AppColors.background),
        body: const Center(
          child: Text(
            'Serviço não encontrado',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 320,
                backgroundColor: AppColors.background,
                leading: _CircleHeaderButton(
                  icon: Icons.arrow_back_rounded,
                  onTap: () => context.pop(),
                ),
                actions: const [
                  _CircleHeaderButton(icon: Icons.share_outlined),
                  SizedBox(width: 8),
                  _CircleHeaderButton(icon: Icons.favorite_border_rounded),
                  SizedBox(width: 12),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      gig.imageUrl != null
                          ? CachedNetworkImage(
                              imageUrl: gig.imageUrl!,
                              fit: BoxFit.cover,
                            )
                          : Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.primaryDark,
                                    AppColors.nightBlue,
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.auto_awesome_rounded,
                                  size: 72,
                                  color: AppColors.goldLight,
                                ),
                              ),
                            ),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.12),
                              AppColors.background.withValues(alpha: 0.08),
                              AppColors.background,
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 20,
                        bottom: 20,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.schedule_rounded,
                                size: 14,
                                color: AppColors.background,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                _deliveryLabel(gig.deliveryTimeHours),
                                style: const TextStyle(
                                  color: AppColors.background,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 132),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        gig.title,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _currency(gig.price),
                            style: const TextStyle(
                              color: AppColors.primaryLight,
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _currency((gig.price * 1.4).round()),
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 18,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            color: AppColors.gold,
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            gig.owner?.ratingAverage?.toStringAsFixed(1) ??
                                '4.9',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${gig.owner?.reviewsCount ?? 453} avaliações',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      if (gig.owner != null)
                        _SpecialistCard(
                          owner: gig.owner!,
                          ownerId: gig.ownerId,
                        ),
                      if (gig.owner != null) const SizedBox(height: 24),
                      Text(
                        'Sobre esta leitura',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        gig.description ??
                            'Uma análise profunda e sensível para clarear seu momento atual com uma leitura personalizada.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'O que está incluído',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          children: _includedItems(gig)
                              .map(
                                (item) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 22,
                                        height: 22,
                                        decoration: const BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppColors.primary,
                                        ),
                                        child: const Icon(
                                          Icons.check_rounded,
                                          size: 14,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          item,
                                          style: Theme.of(
                                            context,
                                          ).textTheme.bodyMedium,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Formato da entrega',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Text(
                          'Você receberá a leitura em ${_deliveryMethodLabel(gig.deliveryMethod)} com interpretação completa e orientações práticas.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      if (gig.addOns.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text(
                          'Extras disponíveis',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        ...gig.addOns.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _AddOnCard(
                              item: item,
                              selected: _selectedAddOns.contains(item.id),
                              onToggle: () {
                                setState(() {
                                  if (_selectedAddOns.contains(item.id)) {
                                    _selectedAddOns.remove(item.id);
                                  } else {
                                    _selectedAddOns.add(item.id);
                                  }
                                });
                              },
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      Text(
                        'Avaliações',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary.withValues(
                                  alpha: 0.16,
                                ),
                              ),
                              child: const Icon(
                                Icons.star_outline_rounded,
                                color: AppColors.primaryLight,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Avaliações reais em breve',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Quando os comentários reais estiverem disponíveis, eles aparecem aqui automaticamente.',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              decoration: BoxDecoration(
                color: AppColors.background,
                border: Border(
                  top: BorderSide(
                    color: AppColors.primaryLight.withValues(alpha: 0.08),
                  ),
                ),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_selectedAddOns.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            Text(
                              'Total com extras',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const Spacer(),
                            Text(
                              _currency(_totalPrice),
                              style: const TextStyle(
                                color: AppColors.primaryLight,
                                fontWeight: FontWeight.w700,
                                fontSize: 18,
                              ),
                            ),
                          ],
                        ),
                      ),
                    AppButton(
                      label: 'Solicitar leitura • ${_currency(_totalPrice)}',
                      onPressed: () => context.push(
                        '/checkout/${widget.gigId}',
                        extra: {'selectedAddOns': _selectedAddOns.toList()},
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<String> _includedItems(Gig gig) {
    final items = <String>[
      '${gig.deliveryTimeHours < 24 ? gig.deliveryTimeHours : (gig.deliveryTimeHours / 24).ceil()} ${gig.deliveryTimeHours < 24 ? 'horas' : 'dias'} para entrega',
      'Leitura personalizada com interpretação detalhada',
      'Orientações práticas para o seu momento atual',
    ];

    for (final requirement in gig.requirements.take(2)) {
      items.add('Pergunta guiada: ${requirement.question}');
    }

    return items;
  }

  String _deliveryLabel(int hours) {
    if (hours < 24) return '${hours}h';
    final days = (hours / 24).ceil();
    return '${days}d';
  }

  String _deliveryMethodLabel(String method) {
    return switch (method) {
      'DIGITAL_SPREAD' => 'texto e material digital',
      'AUDIO' => 'áudio personalizado',
      'VIDEO' => 'vídeo personalizado',
      _ => 'formato digital',
    };
  }
}

class _CircleHeaderButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _CircleHeaderButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.background.withValues(alpha: 0.65),
          ),
          child: Icon(icon, color: Colors.white),
        ),
      ),
    );
  }
}

class _SpecialistCard extends StatelessWidget {
  final Profile owner;
  final String ownerId;

  const _SpecialistCard({required this.owner, required this.ownerId});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/readers/$ownerId'),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primary.withValues(alpha: 0.18),
              backgroundImage: owner.avatarUrl != null
                  ? CachedNetworkImageProvider(owner.avatarUrl!)
                  : null,
              child: owner.avatarUrl == null
                  ? Text(
                      owner.fullName.isNotEmpty ? owner.fullName[0] : '?',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    owner.fullName,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        color: AppColors.gold,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        owner.ratingAverage?.toStringAsFixed(1) ?? '4.9',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${owner.reviewsCount ?? 2341} avaliações',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _AddOnCard extends StatelessWidget {
  final GigAddOn item;
  final bool selected;
  final VoidCallback onToggle;

  const _AddOnCard({
    required this.item,
    required this.selected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onToggle,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.12)
              : AppColors.card,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: selected
                ? AppColors.primaryLight
                : AppColors.primaryLight.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            Checkbox(
              value: selected,
              onChanged: (_) => onToggle(),
              activeColor: AppColors.primary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (item.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.description!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              '+ R\$ ${(item.price / 100).toStringAsFixed(2).replaceAll('.', ',')}',
              style: const TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
