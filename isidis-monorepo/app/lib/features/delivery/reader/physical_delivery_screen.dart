import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import 'audio_recorder_widget.dart';

class PhysicalDeliveryScreen extends StatefulWidget {
  final String orderId;
  final DeliveryContent? existingContent;

  const PhysicalDeliveryScreen({
    super.key,
    required this.orderId,
    this.existingContent,
  });

  @override
  State<PhysicalDeliveryScreen> createState() => _PhysicalDeliveryScreenState();
}

class _PhysicalDeliveryScreenState extends State<PhysicalDeliveryScreen> {
  final List<_EditableSection> _sections = [];
  final _summaryCtrl = TextEditingController();
  bool _submitting = false;
  bool _savingDraft = false;

  @override
  void initState() {
    super.initState();
    if (widget.existingContent != null) {
      for (final s in widget.existingContent!.sections) {
        _sections.add(_EditableSection.fromDelivery(s));
      }
      _summaryCtrl.text = widget.existingContent?.summary ?? '';
    }
  }

  @override
  void dispose() {
    _summaryCtrl.dispose();
    for (final s in _sections) {
      s.textCtrl.dispose();
    }
    super.dispose();
  }

  void _addTextSection() {
    setState(() {
      _sections.add(_EditableSection(type: 'text'));
    });
  }

  Future<void> _addPhotoSection() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (image == null) return;

    setState(() {
      _sections.add(_EditableSection(type: 'photo', localFilePath: image.path));
    });
  }

  void _addAudioSection() {
    setState(() {
      _sections.add(_EditableSection(type: 'audio'));
    });
  }

  Future<String?> _uploadFile(String localPath, String type) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          localPath,
          filename:
              '${type}_${DateTime.now().millisecondsSinceEpoch}.${type == 'photo' ? 'jpg' : 'm4a'}',
        ),
        'type': type,
      });
      final response = await api.postMultipart(
        '/orders/${widget.orderId}/delivery/upload',
        formData: formData,
      );
      return response.data['data']['url'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<DeliveryContent> _buildContent() async {
    final result = <DeliverySection>[];
    for (int i = 0; i < _sections.length; i++) {
      final s = _sections[i];
      String? url = s.uploadedUrl;

      if (s.localFilePath != null && url == null) {
        url = await _uploadFile(s.localFilePath!, s.type);
      }

      result.add(
        DeliverySection(
          type: s.type,
          content: s.textCtrl.text.trim().isNotEmpty
              ? s.textCtrl.text.trim()
              : null,
          url: url,
          order: i,
        ),
      );
    }

    return DeliveryContent(
      method: 'PHYSICAL',
      sections: result,
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _savingDraft = false);
    }
  }

  Future<void> _submit() async {
    if (_sections.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adicione ao menos uma seção à leitura.')),
      );
      return;
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
            content: Text('Leitura enviada!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
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
        title: const Text(
          'Entrega Física',
          style: TextStyle(color: AppColors.textPrimary),
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
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_sections.isEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                children: [
                  Icon(
                    Icons.add_circle_outline,
                    color: AppColors.textMuted,
                    size: 40,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Use os botões abaixo para adicionar\ntexto, fotos ou áudios à leitura.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),

          ..._sections.asMap().entries.map(
            (e) => _buildSectionCard(e.key, e.value),
          ),

          const SizedBox(height: 16),

          // Resumo
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
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Escreva um resumo geral...',
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
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Botões de adicionar seção
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            color: AppColors.surface,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _addTextSection,
                    icon: const Icon(Icons.text_fields, size: 16),
                    label: const Text('Texto'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.surfaceLight),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _addPhotoSection,
                    icon: const Icon(Icons.photo, size: 16),
                    label: const Text('Foto'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.surfaceLight),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _addAudioSection,
                    icon: const Icon(Icons.mic, size: 16),
                    label: const Text('Áudio'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.surfaceLight),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Botão enviar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            color: AppColors.surface,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size(double.infinity, 48),
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
                      'Enviar leitura',
                      style: TextStyle(
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

  Widget _buildSectionCard(int index, _EditableSection section) {
    return Card(
      color: AppColors.surface,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _sectionIcon(section.type),
                  color: AppColors.primaryLight,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  '${_sectionLabel(section.type)} ${index + 1}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(
                    Icons.delete_outline,
                    color: AppColors.error,
                    size: 18,
                  ),
                  onPressed: () => setState(() => _sections.removeAt(index)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (section.type == 'text')
              TextFormField(
                controller: section.textCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Escreva o texto desta seção...',
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
              )
            else if (section.type == 'photo')
              section.localFilePath != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.file(
                        File(section.localFilePath!),
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    )
                  : section.uploadedUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        section.uploadedUrl!,
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Container(
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Text(
                          'Foto selecionada',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                    )
            else if (section.type == 'audio')
              AudioRecorderWidget(
                existingAudioUrl: section.uploadedUrl,
                onRecorded: (path) {
                  section.localFilePath = path;
                },
                onDelete: () {
                  setState(() {
                    section.localFilePath = null;
                    section.uploadedUrl = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  IconData _sectionIcon(String type) => switch (type) {
    'text' => Icons.text_fields,
    'photo' => Icons.photo,
    'audio' => Icons.mic,
    _ => Icons.add,
  };

  String _sectionLabel(String type) => switch (type) {
    'text' => 'Texto',
    'photo' => 'Foto',
    'audio' => 'Áudio',
    _ => type,
  };
}

class _EditableSection {
  final String type;
  final TextEditingController textCtrl;
  String? localFilePath;
  String? uploadedUrl;

  _EditableSection({required this.type, this.localFilePath, this.uploadedUrl})
    : textCtrl = TextEditingController();

  factory _EditableSection.fromDelivery(DeliverySection s) {
    final e = _EditableSection(type: s.type, uploadedUrl: s.url);
    if (s.content != null) e.textCtrl.text = s.content!;
    return e;
  }
}
