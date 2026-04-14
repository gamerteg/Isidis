import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/data/tarot_cards.dart';
import '../../../shared/models/delivery.dart';
import 'audio_recorder_widget.dart';
import 'delivery_media.dart';

class DigitalDeliveryScreen extends StatefulWidget {
  final String orderId;
  final DeliveryContent? existingContent;

  const DigitalDeliveryScreen({
    super.key,
    required this.orderId,
    this.existingContent,
  });

  @override
  State<DigitalDeliveryScreen> createState() => _DigitalDeliveryScreenState();
}

class _DigitalDeliveryScreenState extends State<DigitalDeliveryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final Map<String, DeliveryCard> _selectedCards = {};
  final List<String> _cardOrder = [];
  final Map<String, PendingDeliveryMedia> _pendingAudios = {};

  final _summaryCtrl = TextEditingController();
  bool _submitting = false;
  bool _savingDraft = false;

  String _suitFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    if (widget.existingContent != null) {
      for (final card in widget.existingContent!.cards) {
        _selectedCards[card.id] = card;
        _cardOrder.add(card.id);
      }
      _summaryCtrl.text = widget.existingContent?.summary ?? '';
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _summaryCtrl.dispose();
    super.dispose();
  }

  void _toggleCard(TarotCardDef card) {
    setState(() {
      if (_selectedCards.containsKey(card.id)) {
        _selectedCards.remove(card.id);
        _cardOrder.remove(card.id);
        _pendingAudios.remove(card.id);
      } else {
        _selectedCards[card.id] = DeliveryCard(
          id: card.id,
          name: card.name,
          position: 'upright',
          interpretation: '',
          order: _cardOrder.length,
        );
        _cardOrder.add(card.id);
      }
    });
  }

  Future<DeliveryContent> _buildContent() async {
    final cards = <DeliveryCard>[];
    final nextSelectedCards = Map<String, DeliveryCard>.from(_selectedCards);
    final nextPendingAudios = Map<String, PendingDeliveryMedia>.from(
      _pendingAudios,
    );

    for (int i = 0; i < _cardOrder.length; i++) {
      final id = _cardOrder[i];
      var card = nextSelectedCards[id]!;

      final pendingAudio = nextPendingAudios[id];
      if (pendingAudio != null) {
        final upload = await uploadDeliveryMedia(
          orderId: widget.orderId,
          media: pendingAudio,
          type: 'audio',
        );
        card = card.copyWith(
          audioUrl: upload.url,
          audioFileName: upload.fileName,
        );
        nextSelectedCards[id] = card;
        nextPendingAudios.remove(id);
      }

      cards.add(card.copyWith(order: i));
    }

    if (mounted) {
      setState(() {
        _selectedCards
          ..clear()
          ..addAll(nextSelectedCards);
        _pendingAudios
          ..clear()
          ..addAll(nextPendingAudios);
      });
    }

    return DeliveryContent(
      method: 'DIGITAL_SPREAD',
      cards: cards,
      summary: _summaryCtrl.text.trim(),
    );
  }

  Future<void> _saveDraft() async {
    setState(() => _savingDraft = true);
    try {
      final content = await _buildContent();
      await api.post(
        '/orders/${widget.orderId}/delivery/draft',
        data: content.toJson(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rascunho salvo!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      _showError('Erro ao salvar: $e');
    } finally {
      if (mounted) setState(() => _savingDraft = false);
    }
  }

  Future<void> _submit() async {
    if (_selectedCards.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione ao menos uma carta.')),
      );
      return;
    }

    final emptyInterpretations = _cardOrder
        .where((id) => _selectedCards[id]!.interpretation.trim().isEmpty)
        .length;

    if (emptyInterpretations > 0) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Interpretacoes vazias'),
          content: Text(
            '$emptyInterpretations carta(s) sem interpretacao. Deseja enviar mesmo assim?',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Completar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Enviar assim'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    setState(() => _submitting = true);
    try {
      final content = await _buildContent();
      await api.post(
        '/orders/${widget.orderId}/delivery/submit',
        data: content.toJson(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Leitura enviada com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      _showError('Erro: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Entrega - ${_selectedCards.length} carta(s)',
          style: const TextStyle(color: AppColors.textPrimary),
        ),
        actions: [
          TextButton(
            onPressed: _savingDraft ? null : _saveDraft,
            child: Text(
              _savingDraft ? 'Salvando...' : 'Rascunho',
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryLight,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Selecionar Cartas'),
            Tab(text: 'Interpretacoes'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildCardGrid(), _buildInterpretations()],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildCardGrid() {
    final suits = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];
    final suitNames = {'all': 'Todos', ...kSuitLabels};

    final filtered = _suitFilter == 'all'
        ? kTarotCards
        : kTarotCards.where((c) => c.suit == _suitFilter).toList();

    return Column(
      children: [
        SizedBox(
          height: 44,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            children: suits.map((s) {
              final selected = _suitFilter == s;
              return Padding(
                padding: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
                child: GestureDetector(
                  onTap: () => setState(() => _suitFilter = s),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary : AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Center(
                      child: Text(
                        suitNames[s] ?? s,
                        style: TextStyle(
                          color: selected
                              ? Colors.white
                              : AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 0.7,
            ),
            itemCount: filtered.length,
            itemBuilder: (_, i) {
              final card = filtered[i];
              final selected = _selectedCards.containsKey(card.id);
              return GestureDetector(
                onTap: () => _toggleCard(card),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: selected
                          ? [AppColors.primary, AppColors.primaryDark]
                          : [AppColors.surface, AppColors.card],
                    ),
                    borderRadius: BorderRadius.circular(10),
                    border: selected
                        ? Border.all(color: AppColors.primaryLight, width: 2)
                        : Border.all(color: AppColors.surfaceLight),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _suitIcon(card.suit),
                          color: selected ? Colors.white : AppColors.textMuted,
                          size: 24,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          card.name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: selected
                                ? Colors.white
                                : AppColors.textSecondary,
                            fontSize: 10,
                            fontWeight: selected
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                        if (selected) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${_cardOrder.indexOf(card.id) + 1}a',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildInterpretations() {
    if (_selectedCards.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.auto_awesome, color: AppColors.textMuted, size: 48),
            SizedBox(height: 12),
            Text(
              'Selecione cartas na aba anterior\npara escrever as interpretacoes.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ..._cardOrder.map((id) => _buildCardEditor(id)),
        const SizedBox(height: 8),
        const Text(
          'Resumo geral',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _summaryCtrl,
          maxLines: 5,
          decoration: InputDecoration(
            hintText: 'Escreva um resumo geral da leitura para o cliente...',
            hintStyle: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 13,
            ),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          style: const TextStyle(color: AppColors.textPrimary),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildCardEditor(String cardId) {
    final card = _selectedCards[cardId]!;
    return Card(
      color: AppColors.surface,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _suitIcon(
                    kTarotCards
                        .firstWhere(
                          (c) => c.id == cardId,
                          orElse: () => kTarotCards.first,
                        )
                        .suit,
                  ),
                  color: AppColors.primaryLight,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    card.name,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () => setState(() {
                    _selectedCards[cardId] = card.copyWith(
                      position: card.position == 'upright'
                          ? 'reversed'
                          : 'upright',
                    );
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: card.position == 'upright'
                          ? Colors.green.withValues(alpha: 0.2)
                          : Colors.orange.withValues(alpha: 0.2),
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
                          size: 12,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          card.position == 'upright' ? 'Normal' : 'Invertida',
                          style: TextStyle(
                            color: card.position == 'upright'
                                ? Colors.green
                                : Colors.orange,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              initialValue: card.interpretation,
              maxLines: 4,
              onChanged: (value) => setState(() {
                _selectedCards[cardId] = card.copyWith(interpretation: value);
              }),
              decoration: InputDecoration(
                hintText: 'Escreva a interpretacao desta carta...',
                hintStyle: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 13,
                ),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            AudioRecorderWidget(
              existingAudioUrl: card.audioUrl,
              onRecorded: (media) {
                setState(() => _pendingAudios[cardId] = media);
              },
              onDelete: () {
                setState(() {
                  _selectedCards[cardId] = card.copyWith(
                    audioUrl: null,
                    audioFileName: null,
                  );
                  _pendingAudios.remove(cardId);
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.surfaceLight)),
      ),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: (_submitting || _selectedCards.isEmpty)
                  ? null
                  : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Enviar leitura (${_selectedCards.length} carta${_selectedCards.length == 1 ? '' : 's'})',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _suitIcon(String suit) => switch (suit) {
    'major' => Icons.auto_awesome,
    'wands' => Icons.local_fire_department,
    'cups' => Icons.water_drop,
    'swords' => Icons.flash_on,
    'pentacles' => Icons.star,
    _ => Icons.casino,
  };
}
