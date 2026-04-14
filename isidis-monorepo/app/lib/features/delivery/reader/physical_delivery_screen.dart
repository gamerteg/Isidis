import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/api/api_client.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/delivery.dart';
import 'audio_recorder_widget.dart';
import 'delivery_media.dart';

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
      for (final section in widget.existingContent!.sections) {
        _sections.add(_EditableSection.fromDelivery(section));
      }
      _summaryCtrl.text = widget.existingContent?.summary ?? '';
    }
  }

  @override
  void dispose() {
    _summaryCtrl.dispose();
    for (final section in _sections) {
      section.textCtrl.dispose();
    }
    super.dispose();
  }

  void _addTextSection() {
    setState(() {
      _sections.add(_EditableSection(type: 'text'));
    });
  }

  Future<void> _addPhotoSection() async {
    final source = PlatformCapabilities.isWeb
        ? await _showPhotoSourceSheet()
        : ImageSource.gallery;
    if (source == null) return;

    final picked = await _pickPhoto(source);
    if (picked == null) return;

    setState(() {
      _sections.add(_EditableSection(type: 'photo', pendingMedia: picked));
    });
  }

  Future<ImageSource?> _showPhotoSourceSheet() async {
    return showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.surface,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera, color: Colors.white),
              title: const Text(
                'Camera',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.white),
              title: const Text(
                'Arquivo',
                style: TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  Future<PendingDeliveryMedia?> _pickPhoto(ImageSource source) async {
    final picker = ImagePicker();
    XFile? image = await picker.pickImage(source: source, imageQuality: 80);

    if (image == null &&
        PlatformCapabilities.isWeb &&
        source == ImageSource.camera) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Captura nao suportada neste navegador. Abrindo arquivo...',
            ),
          ),
        );
      }
      image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );
    }

    if (image == null) return null;

    return PendingDeliveryMedia.fromXFile(
      image,
      mimeType: resolveDeliveryMimeType(image.mimeType, image.name),
    );
  }

  void _addAudioSection() {
    setState(() {
      _sections.add(_EditableSection(type: 'audio'));
    });
  }

  Future<DeliveryContent> _buildContent() async {
    final result = <DeliverySection>[];

    for (int i = 0; i < _sections.length; i++) {
      final section = _sections[i];
      String? url = section.uploadedUrl;
      String? fileName = section.uploadedFileName;

      if (section.pendingMedia != null) {
        final upload = await uploadDeliveryMedia(
          orderId: widget.orderId,
          media: section.pendingMedia!,
          type: section.type,
        );
        url = upload.url;
        fileName = upload.fileName;
        section
          ..uploadedUrl = upload.url
          ..uploadedFileName = upload.fileName
          ..pendingMedia = null;
      }

      result.add(
        DeliverySection(
          type: section.type,
          content: section.textCtrl.text.trim().isNotEmpty
              ? section.textCtrl.text.trim()
              : null,
          url: url,
          fileName: fileName,
          order: i,
        ),
      );
    }

    if (mounted) setState(() {});

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
      _showError('Erro: $e');
    } finally {
      if (mounted) setState(() => _savingDraft = false);
    }
  }

  Future<void> _submit() async {
    if (_sections.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adicione ao menos uma secao a leitura.')),
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
        title: const Text(
          'Entrega Fisica',
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
                    'Use os botoes abaixo para adicionar\ntexto, fotos ou audios a leitura.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ..._sections.asMap().entries.map(
            (entry) => _buildSectionCard(entry.key, entry.value),
          ),
          const SizedBox(height: 16),
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
                    label: const Text('Audio'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.surfaceLight),
                    ),
                  ),
                ),
              ],
            ),
          ),
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
                  hintText: 'Escreva o texto desta secao...',
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
              _buildPhotoPreview(section)
            else if (section.type == 'audio')
              AudioRecorderWidget(
                existingAudioUrl: section.uploadedUrl,
                onRecorded: (media) {
                  setState(() => section.pendingMedia = media);
                },
                onDelete: () {
                  setState(() {
                    section
                      ..pendingMedia = null
                      ..uploadedUrl = null
                      ..uploadedFileName = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoPreview(_EditableSection section) {
    if (section.pendingMedia != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: PlatformCapabilities.isWeb
            ? Image.network(
                section.pendingMedia!.file.path,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              )
            : Image.file(
                File(section.pendingMedia!.file.path),
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
      );
    }

    if (section.uploadedUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          section.uploadedUrl!,
          height: 180,
          width: double.infinity,
          fit: BoxFit.cover,
        ),
      );
    }

    return Container(
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
    'audio' => 'Audio',
    _ => type,
  };
}

class _EditableSection {
  final String type;
  final TextEditingController textCtrl;
  PendingDeliveryMedia? pendingMedia;
  String? uploadedUrl;
  String? uploadedFileName;

  _EditableSection({
    required this.type,
    this.pendingMedia,
    this.uploadedUrl,
    this.uploadedFileName,
  }) : textCtrl = TextEditingController();

  factory _EditableSection.fromDelivery(DeliverySection section) {
    final editable = _EditableSection(
      type: section.type,
      uploadedUrl: section.url,
      uploadedFileName: section.fileName,
    );
    if (section.content != null) editable.textCtrl.text = section.content!;
    return editable;
  }
}
