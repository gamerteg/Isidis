import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import 'audio_player_widget.dart';

class PhysicalReadingViewer extends StatefulWidget {
  final String orderId;
  final String gigId;
  final String readerId;
  final String readerName;
  final DeliveryContent content;

  const PhysicalReadingViewer({
    super.key,
    required this.orderId,
    required this.gigId,
    required this.readerId,
    required this.readerName,
    required this.content,
  });

  @override
  State<PhysicalReadingViewer> createState() => _PhysicalReadingViewerState();
}

class _PhysicalReadingViewerState extends State<PhysicalReadingViewer> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Sua Leitura',
          style: TextStyle(color: AppColors.textPrimary),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...widget.content.sections.map((s) => _buildSection(s)),

          if (widget.content.summary != null &&
              widget.content.summary!.isNotEmpty) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withOpacity(0.2),
                    AppColors.primary.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        color: AppColors.primaryLight,
                        size: 16,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Mensagem final',
                        style: TextStyle(
                          color: AppColors.primaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.content.summary!,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 32),

          ElevatedButton(
            onPressed: () => context.push(
              '/readings/${widget.orderId}/end',
              extra: {
                'gigId': widget.gigId,
                'readerId': widget.readerId,
                'readerName': widget.readerName,
                'summary': widget.content.summary,
              },
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Concluir leitura',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSection(DeliverySection section) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: switch (section.type) {
        'text' => _buildTextSection(section),
        'photo' => _buildPhotoSection(section),
        'audio' => _buildAudioSection(section),
        _ => const SizedBox.shrink(),
      },
    );
  }

  Widget _buildTextSection(DeliverySection section) {
    if (section.content == null || section.content!.isEmpty) {
      return const SizedBox.shrink();
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        section.content!,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 15,
          height: 1.6,
        ),
      ),
    );
  }

  Widget _buildPhotoSection(DeliverySection section) {
    if (section.url == null) return const SizedBox.shrink();
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: CachedNetworkImage(
        imageUrl: section.url!,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          height: 200,
          color: AppColors.surface,
          child: const Center(child: CircularProgressIndicator()),
        ),
        errorWidget: (_, __, ___) => Container(
          height: 100,
          color: AppColors.surface,
          child: const Center(
            child: Icon(Icons.broken_image, color: AppColors.textMuted),
          ),
        ),
      ),
    );
  }

  Widget _buildAudioSection(DeliverySection section) {
    if (section.url == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.headphones, color: AppColors.primaryLight, size: 16),
            SizedBox(width: 6),
            Text(
              'Mensagem em áudio',
              style: TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        AudioPlayerWidget(url: section.url!),
      ],
    );
  }
}
