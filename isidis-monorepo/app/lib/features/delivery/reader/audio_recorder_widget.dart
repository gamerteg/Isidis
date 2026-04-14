import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import 'delivery_media.dart';

class AudioRecorderWidget extends StatefulWidget {
  final String? existingAudioUrl;
  final void Function(PendingDeliveryMedia media) onRecorded;
  final VoidCallback? onDelete;
  final bool? showUploadFallback;

  const AudioRecorderWidget({
    super.key,
    this.existingAudioUrl,
    required this.onRecorded,
    this.onDelete,
    this.showUploadFallback,
  });

  @override
  State<AudioRecorderWidget> createState() => _AudioRecorderWidgetState();
}

class _AudioRecorderWidgetState extends State<AudioRecorderWidget> {
  final _recorder = AudioRecorder();

  bool _isRecording = false;
  bool _pickingFallbackAudio = false;
  int _seconds = 0;
  Timer? _timer;
  PendingDeliveryMedia? _recordedMedia;
  String? _currentRecordingFileName;

  bool get _showUploadFallback =>
      widget.showUploadFallback ?? PlatformCapabilities.isWeb;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      _showMessage('Permissao de microfone necessaria.');
      return;
    }

    final isWeb = PlatformCapabilities.isWeb;
    final extension = isWeb ? 'wav' : 'm4a';
    final fileName =
        'recording_${DateTime.now().millisecondsSinceEpoch}.$extension';

    try {
      final path = isWeb
          ? fileName
          : '${(await getTemporaryDirectory()).path}/$fileName';
      final config = isWeb
          ? const RecordConfig(encoder: AudioEncoder.wav, numChannels: 1)
          : const RecordConfig();

      await _recorder.start(config, path: path);
      _currentRecordingFileName = fileName;

      setState(() {
        _isRecording = true;
        _seconds = 0;
      });

      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _seconds++);
      });
    } catch (_) {
      _showMessage(
        _showUploadFallback
            ? 'Nao foi possivel gravar no navegador. Use "Enviar audio".'
            : 'Nao foi possivel iniciar a gravacao.',
      );
    }
  }

  Future<void> _stopRecording() async {
    _timer?.cancel();
    final path = await _recorder.stop();
    if (path == null) {
      if (mounted) {
        setState(() => _isRecording = false);
      }
      return;
    }

    final isWeb = PlatformCapabilities.isWeb;
    final filename =
        _currentRecordingFileName ??
        'recording_${DateTime.now().millisecondsSinceEpoch}.${isWeb ? 'wav' : 'm4a'}';
    final mimeType = isWeb ? 'audio/wav' : 'audio/x-m4a';
    final media = PendingDeliveryMedia.fromXFile(
      XFile(path, name: filename, mimeType: mimeType),
      filename: filename,
      mimeType: mimeType,
    );

    if (mounted) {
      setState(() {
        _isRecording = false;
        _recordedMedia = media;
      });
    }

    widget.onRecorded(media);
  }

  Future<void> _pickFallbackAudio() async {
    setState(() => _pickingFallbackAudio = true);
    try {
      final media = await pickFallbackAudioFile();
      if (media == null) return;

      final validationError = await validatePendingDeliveryMedia(
        media,
        type: 'audio',
      );
      if (validationError != null) {
        _showMessage(validationError);
        return;
      }

      if (mounted) setState(() => _recordedMedia = media);
      widget.onRecorded(media);
    } catch (_) {
      _showMessage('Nao foi possivel selecionar o audio.');
    } finally {
      if (mounted) setState(() => _pickingFallbackAudio = false);
    }
  }

  void _clearAudio() {
    setState(() => _recordedMedia = null);
    widget.onDelete?.call();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String get _timerLabel {
    final minutes = (_seconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_seconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final hasAudio = _recordedMedia != null || widget.existingAudioUrl != null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _isRecording
              ? Colors.red.withValues(alpha: 0.6)
              : AppColors.surfaceLight,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: _isRecording ? _stopRecording : _startRecording,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _isRecording
                    ? Colors.red
                    : AppColors.primary.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isRecording ? Icons.stop : Icons.mic,
                color: _isRecording ? Colors.white : AppColors.primaryLight,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatus(hasAudio),
                if (_showUploadFallback) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _isRecording || _pickingFallbackAudio
                        ? null
                        : _pickFallbackAudio,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primaryLight,
                      padding: EdgeInsets.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      minimumSize: Size.zero,
                    ),
                    icon: Icon(
                      _pickingFallbackAudio
                          ? Icons.hourglass_top
                          : Icons.upload_file,
                      size: 16,
                    ),
                    label: Text(
                      _pickingFallbackAudio
                          ? 'Selecionando...'
                          : 'Enviar audio',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (hasAudio && !_isRecording && widget.onDelete != null)
            IconButton(
              icon: const Icon(
                Icons.delete_outline,
                color: AppColors.error,
                size: 20,
              ),
              onPressed: _clearAudio,
            ),
        ],
      ),
    );
  }

  Widget _buildStatus(bool hasAudio) {
    if (_isRecording) {
      return Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            'Gravando... $_timerLabel',
            style: const TextStyle(
              color: Colors.red,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      );
    }

    if (hasAudio) {
      return Row(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 18),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              _recordedMedia?.filename ?? 'Audio pronto para envio',
              style: const TextStyle(color: Colors.green, fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }

    return Text(
      _showUploadFallback
          ? 'Grave no navegador ou envie um arquivo de audio.'
          : 'Toque para gravar audio',
      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
    );
  }
}
