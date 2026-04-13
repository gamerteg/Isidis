import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/profile.dart';
import '../../shared/models/gig.dart';

class ReaderProfileScreen extends StatefulWidget {
  final String readerId;

  const ReaderProfileScreen({super.key, required this.readerId});

  @override
  State<ReaderProfileScreen> createState() => _ReaderProfileScreenState();
}

class _ReaderProfileScreenState extends State<ReaderProfileScreen> {
  Profile? _profile;
  List<Gig> _gigs = [];
  List<dynamic> _reviews = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await api.get('/readers/${widget.readerId}');
      final data = response.data['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _profile = Profile.fromJson(data);
        _gigs =
            (data['gigs'] as List<dynamic>?)
                ?.map((g) => Gig.fromJson(g as Map<String, dynamic>))
                .where((g) => g.isActive)
                .toList() ??
            [];
        _reviews = (data['reviews'] as List<dynamic>?) ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: AppColors.background),
        body: const Center(
          child: Text(
            'Cartomante não encontrado',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    final p = _profile!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Cover + back button
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.background,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: p.coverUrl != null
                  ? CachedNetworkImage(
                      imageUrl: p.coverUrl!,
                      fit: BoxFit.cover,
                      color: Colors.black.withOpacity(0.4),
                      colorBlendMode: BlendMode.darken,
                    )
                  : Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary.withOpacity(0.6),
                            const Color(0xFF4C1D95),
                          ],
                        ),
                      ),
                    ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar + name row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: AppColors.primary.withOpacity(0.3),
                        backgroundImage: p.avatarUrl != null
                            ? CachedNetworkImageProvider(p.avatarUrl!)
                            : null,
                        child: p.avatarUrl == null
                            ? Text(
                                p.fullName.isNotEmpty
                                    ? p.fullName[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.fullName,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            if (p.tagline != null)
                              Text(
                                p.tagline!,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Rating + experience
                  Row(
                    children: [
                      if ((p.ratingAverage ?? 0) > 0) ...[
                        const Icon(
                          Icons.star,
                          color: Color(0xFFFBBF24),
                          size: 18,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          p.ratingAverage!.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          ' (${p.reviewsCount ?? 0} avaliações)',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      if (p.experienceYears != null) ...[
                        const Icon(
                          Icons.workspace_premium,
                          color: AppColors.gold,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${p.experienceYears} anos de experiência',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),

                  if (p.specialties.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: p.specialties
                          .map(
                            (s) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppColors.primary.withOpacity(0.3),
                                ),
                              ),
                              child: Text(
                                s,
                                style: const TextStyle(
                                  color: AppColors.primaryLight,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],

                  if (p.bio != null) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Sobre mim',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      p.bio!,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        height: 1.6,
                        fontSize: 14,
                      ),
                    ),
                  ],

                  // Pre-sale chat CTA
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.chat_bubble_outline,
                          color: AppColors.primaryLight,
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tem dúvidas?',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                'Converse antes de comprar',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () async {
                            try {
                              final r = await api.post(
                                '/conversations',
                                data: {'reader_id': widget.readerId},
                              );
                              final convId = r.data['data']?['id'] as String?;
                              if (convId != null && context.mounted) {
                                context.push(
                                  '/chat/$convId',
                                  extra:
                                      r.data['data'] as Map<String, dynamic>?,
                                );
                              }
                            } catch (_) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Erro ao abrir chat.'),
                                  ),
                                );
                              }
                            }
                          },
                          child: const Text('Conversar'),
                        ),
                      ],
                    ),
                  ),

                  // Gigs
                  if (_gigs.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    const Text(
                      'Serviços disponíveis',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._gigs.map((g) => _GigTile(gig: g)),
                  ],

                  // Reviews
                  if (_reviews.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    const Text(
                      'Avaliações',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._reviews
                        .take(5)
                        .map(
                          (r) => _ReviewTile(review: r as Map<String, dynamic>),
                        ),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GigTile extends StatelessWidget {
  final Gig gig;

  const _GigTile({required this.gig});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/gigs/${gig.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            if (gig.imageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: gig.imageUrl!,
                  width: 56,
                  height: 56,
                  fit: BoxFit.cover,
                ),
              )
            else
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: AppColors.primaryLight,
                ),
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    gig.title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'R\$ ${(gig.price / 100).toStringAsFixed(2).replaceAll('.', ',')}',
                    style: const TextStyle(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.textMuted,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  final Map<String, dynamic> review;

  const _ReviewTile({required this.review});

  @override
  Widget build(BuildContext context) {
    final rating = review['rating'] as int? ?? 5;
    final comment = review['comment'] as String?;
    final clientName =
        (review['client'] as Map<String, dynamic>?)?['full_name'] as String? ??
        'Cliente';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                clientName,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    Icons.star,
                    size: 14,
                    color: i < rating
                        ? const Color(0xFFFBBF24)
                        : AppColors.textMuted,
                  ),
                ),
              ),
            ],
          ),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              comment,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
