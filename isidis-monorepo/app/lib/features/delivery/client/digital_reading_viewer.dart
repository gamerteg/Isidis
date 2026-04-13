import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import 'audio_player_widget.dart';
import 'reading_end_screen.dart';

class DigitalReadingViewer extends StatefulWidget {
  final String orderId;
  final String gigId;
  final String readerId;
  final String readerName;
  final DeliveryContent content;

  const DigitalReadingViewer({
    super.key,
    required this.orderId,
    required this.gigId,
    required this.readerId,
    required this.readerName,
    required this.content,
  });

  @override
  State<DigitalReadingViewer> createState() => _DigitalReadingViewerState();
}

class _DigitalReadingViewerState extends State<DigitalReadingViewer> {
  late PageController _pageController;
  int _currentPage = 0;
  final Set<int> _revealedCards = {};

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    // Revelar a primeira carta com delay
    Future.delayed(400.ms, () {
      if (mounted) setState(() => _revealedCards.add(0));
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _restartReading() {
    setState(() {
      _currentPage = 0;
      _revealedCards.clear();
    });
    _pageController.jumpToPage(0);
    Future.delayed(400.ms, () {
      if (mounted) setState(() => _revealedCards.add(0));
    });
  }

  void _onPageChanged(int page) {
    setState(() => _currentPage = page);
    // Revelar carta da nova página após delay
    if (page < widget.content.cards.length) {
      Future.delayed(300.ms, () {
        if (mounted) {
          setState(() => _revealedCards.add(page));
          HapticFeedback.mediumImpact();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cards = widget.content.cards;
    final totalPages = cards.length + 1; // +1 para tela final

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // PageView
          PageView.builder(
            controller: _pageController,
            itemCount: totalPages,
            onPageChanged: _onPageChanged,
            itemBuilder: (_, index) {
              if (index == cards.length) {
                // Última página: tela de encerramento
                return ReadingEndScreen(
                  orderId: widget.orderId,
                  gigId: widget.gigId,
                  readerId: widget.readerId,
                  readerName: widget.readerName,
                  summary: widget.content.summary,
                  onReadAgain: _restartReading,
                );
              }
              return _CardPage(
                card: cards[index],
                isRevealed: _revealedCards.contains(index),
                cardIndex: index,
                totalCards: cards.length,
              );
            },
          ),

          // Barra de progresso e controles no topo
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      // Voltar
                      GestureDetector(
                        onTap: () => context.pop(),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.4),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Indicadores de página
                      Expanded(
                        child: _currentPage < widget.content.cards.length
                            ? Row(
                                children: List.generate(
                                  widget.content.cards.length,
                                  (i) => Expanded(
                                    child: Container(
                                      height: 3,
                                      margin: const EdgeInsets.symmetric(
                                        horizontal: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: i <= _currentPage
                                            ? AppColors.primaryLight
                                            : AppColors.surfaceLight,
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                      const SizedBox(width: 12),
                      // Contador
                      if (_currentPage < widget.content.cards.length)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.4),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_currentPage + 1}/${widget.content.cards.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
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

class _CardPage extends StatelessWidget {
  final DeliveryCard card;
  final bool isRevealed;
  final int cardIndex;
  final int totalCards;

  const _CardPage({
    required this.card,
    required this.isRevealed,
    required this.cardIndex,
    required this.totalCards,
  });

  @override
  Widget build(BuildContext context) {
    return isRevealed ? _buildFront(context) : _buildBack(context);
  }

  Widget _buildBack(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF1A0A2E), Color(0xFF0F0A1A)],
        ),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.auto_awesome, color: AppColors.primaryLight, size: 64),
            SizedBox(height: 16),
            Text(
              '✦ ✦ ✦',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 24,
                letterSpacing: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFront(BuildContext context) {
    return Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1A0A2E), Color(0xFF0F0A1A)],
            ),
          ),
          child: Column(
            children: [
              // Card visual
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 80, 32, 16),
                  child: _buildCardVisual(),
                ),
              ),

              // Interpretação
              Expanded(
                flex: 3,
                child: Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF1A1025),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      // Nome + posição
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              card.name,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: card.position == 'upright'
                                  ? Colors.green.withOpacity(0.2)
                                  : Colors.orange.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  card.position == 'upright'
                                      ? Icons.arrow_upward
                                      : Icons.arrow_downward,
                                  color: card.position == 'upright'
                                      ? Colors.green
                                      : Colors.orange,
                                  size: 14,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  card.position == 'upright'
                                      ? 'Normal'
                                      : 'Invertida',
                                  style: TextStyle(
                                    color: card.position == 'upright'
                                        ? Colors.green
                                        : Colors.orange,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Interpretação
                      Text(
                        card.interpretation.isNotEmpty
                            ? card.interpretation
                            : 'Nenhuma interpretação foi escrita para esta carta.',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 15,
                          height: 1.6,
                        ),
                      ),

                      // Áudio
                      if (card.audioUrl != null &&
                          card.audioUrl!.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        const Row(
                          children: [
                            Icon(
                              Icons.headphones,
                              color: AppColors.primaryLight,
                              size: 16,
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Interpretação em áudio',
                              style: TextStyle(
                                color: AppColors.primaryLight,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        AudioPlayerWidget(url: card.audioUrl!),
                      ],

                      const SizedBox(height: 32),

                      // Dica de navegação
                      const Center(
                        child: Text(
                          'Deslize para a próxima carta →',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        )
        .animate()
        .fadeIn(duration: 400.ms)
        .scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
          duration: 400.ms,
          curve: Curves.easeOut,
        );
  }

  Widget _buildCardVisual() {
    return Center(
      child: AspectRatio(
        aspectRatio: 0.65,
        child: Transform.rotate(
          angle: card.position == 'reversed' ? pi : 0,
          child: Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF4C1D95),
                  Color(0xFF7C3AED),
                  Color(0xFF5B21B6),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.5),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.auto_awesome, color: Colors.white70, size: 48),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    card.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${cardIndex + 1} / $totalCards',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
