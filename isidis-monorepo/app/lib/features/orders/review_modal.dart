import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class ReviewModal extends StatefulWidget {
  final String orderId;
  final String readerName;
  final VoidCallback? onSuccess;

  const ReviewModal({
    super.key,
    required this.orderId,
    required this.readerName,
    this.onSuccess,
  });

  @override
  State<ReviewModal> createState() => _ReviewModalState();
}

class _ReviewModalState extends State<ReviewModal> {
  int _rating = 0;
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione uma nota de 1 a 5 estrelas.')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      await api.post(
        '/orders/${widget.orderId}/review',
        data: {'rating': _rating, 'comment': _commentCtrl.text.trim()},
      );

      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Avaliação enviada! Obrigado pelo feedback.'),
          backgroundColor: Colors.green,
        ),
      );
      widget.onSuccess?.call();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao enviar avaliação: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'Como foi sua leitura com\n${widget.readerName}?',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              height: 1.3,
            ),
          ),

          const SizedBox(height: 24),

          // Estrelas
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final star = i + 1;
              return GestureDetector(
                onTap: () => setState(() => _rating = star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Icon(
                    star <= _rating ? Icons.star : Icons.star_border,
                    color: AppColors.gold,
                    size: 40,
                  ),
                ),
              );
            }),
          ),

          if (_rating > 0) ...[
            const SizedBox(height: 8),
            Center(
              child: Text(
                _ratingLabel(_rating),
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Comentário
          TextField(
            controller: _commentCtrl,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Conte como foi sua experiência (opcional)...',
              hintStyle: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 14,
              ),
              filled: true,
              fillColor: AppColors.background,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
            style: const TextStyle(color: AppColors.textPrimary),
          ),

          const SizedBox(height: 20),

          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
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
                : const Text(
                    'Enviar avaliação',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  String _ratingLabel(int rating) => switch (rating) {
    1 => 'Muito ruim',
    2 => 'Ruim',
    3 => 'Regular',
    4 => 'Boa',
    5 => 'Excelente!',
    _ => '',
  };
}
