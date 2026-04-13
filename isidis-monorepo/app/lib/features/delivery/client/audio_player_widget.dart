import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../../../core/theme/app_theme.dart';

class AudioPlayerWidget extends StatefulWidget {
  final String url;

  const AudioPlayerWidget({super.key, required this.url});

  @override
  State<AudioPlayerWidget> createState() => _AudioPlayerWidgetState();
}

class _AudioPlayerWidgetState extends State<AudioPlayerWidget> {
  late final AudioPlayer _player;
  bool _loading = true;
  bool _hasError = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      await _player.setUrl(widget.url);
      _duration = _player.duration ?? Duration.zero;
      _player.positionStream.listen((pos) {
        if (mounted) setState(() => _position = pos);
      });
      _player.durationStream.listen((dur) {
        if (mounted) setState(() => _duration = dur ?? Duration.zero);
      });
      if (mounted) setState(() => _loading = false);
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
          _hasError = true;
        });
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Row(
          children: [
            Icon(Icons.error_outline, color: AppColors.error, size: 18),
            SizedBox(width: 8),
            Text(
              'Áudio indisponível',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: _loading
          ? const SizedBox(
              height: 40,
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          : Row(
              children: [
                // Play/Pause
                StreamBuilder<PlayerState>(
                  stream: _player.playerStateStream,
                  builder: (_, snapshot) {
                    final playing = snapshot.data?.playing ?? false;
                    final completed =
                        snapshot.data?.processingState ==
                        ProcessingState.completed;

                    return GestureDetector(
                      onTap: () async {
                        if (completed) {
                          await _player.seek(Duration.zero);
                          await _player.play();
                        } else if (playing) {
                          await _player.pause();
                        } else {
                          await _player.play();
                        }
                      },
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          completed || !playing
                              ? Icons.play_arrow
                              : Icons.pause,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    );
                  },
                ),

                const SizedBox(width: 10),

                // Progress slider
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          trackHeight: 3,
                          thumbShape: const RoundSliderThumbShape(
                            enabledThumbRadius: 6,
                          ),
                          overlayShape: const RoundSliderOverlayShape(
                            overlayRadius: 12,
                          ),
                          activeTrackColor: AppColors.primary,
                          inactiveTrackColor: AppColors.primary.withOpacity(
                            0.2,
                          ),
                          thumbColor: AppColors.primaryLight,
                        ),
                        child: Slider(
                          value: _duration.inMilliseconds > 0
                              ? (_position.inMilliseconds /
                                        _duration.inMilliseconds)
                                    .clamp(0.0, 1.0)
                              : 0,
                          onChanged: (v) {
                            _player.seek(
                              Duration(
                                milliseconds: (v * _duration.inMilliseconds)
                                    .toInt(),
                              ),
                            );
                          },
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _formatDuration(_position),
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 11,
                              ),
                            ),
                            Text(
                              _formatDuration(_duration),
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 11,
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
