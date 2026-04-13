import 'dart:async';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/theme/app_theme.dart';

/// Widget inline de gravação de áudio.
/// Exibe botão mic → ao pressionar grava → ao soltar para → retorna caminho do arquivo.
class AudioRecorderWidget extends StatefulWidget {
  final String? existingAudioUrl;
  final void Function(String filePath) onRecorded;
  final VoidCallback? onDelete;

  const AudioRecorderWidget({
    super.key,
    this.existingAudioUrl,
    required this.onRecorded,
    this.onDelete,
  });

  @override
  State<AudioRecorderWidget> createState() => _AudioRecorderWidgetState();
}

class _AudioRecorderWidgetState extends State<AudioRecorderWidget> {
  final _recorder = AudioRecorder();
  bool _isRecording = false;
  int _seconds = 0;
  Timer? _timer;
  String? _recordedPath;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permissão de microfone necessária.')),
        );
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    final path =
        '${dir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _recorder.start(const RecordConfig(), path: path);
    setState(() {
      _isRecording = true;
      _seconds = 0;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _seconds++);
    });
  }

  Future<void> _stopRecording() async {
    _timer?.cancel();
    final path = await _recorder.stop();
    if (path != null) {
      setState(() {
        _isRecording = false;
        _recordedPath = path;
      });
      widget.onRecorded(path);
    }
  }

  String get _timerLabel {
    final m = (_seconds ~/ 60).toString().padLeft(2, '0');
    final s = (_seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final hasAudio = _recordedPath != null || widget.existingAudioUrl != null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _isRecording
              ? Colors.red.withOpacity(0.6)
              : AppColors.surfaceLight,
        ),
      ),
      child: Row(
        children: [
          // Botão gravar / parar
          GestureDetector(
            onTap: _isRecording ? _stopRecording : _startRecording,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _isRecording
                    ? Colors.red
                    : AppColors.primary.withOpacity(0.2),
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

          // Status
          Expanded(
            child: _isRecording
                ? Row(
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
                  )
                : hasAudio
                ? Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 18,
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'Áudio gravado',
                        style: TextStyle(color: Colors.green, fontSize: 13),
                      ),
                    ],
                  )
                : const Text(
                    'Toque para gravar áudio',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
          ),

          // Deletar áudio
          if (hasAudio && !_isRecording && widget.onDelete != null)
            IconButton(
              icon: const Icon(
                Icons.delete_outline,
                color: AppColors.error,
                size: 20,
              ),
              onPressed: () {
                setState(() => _recordedPath = null);
                widget.onDelete!();
              },
            ),
        ],
      ),
    );
  }
}
