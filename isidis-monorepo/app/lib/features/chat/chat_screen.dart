import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';

class ChatScreen extends StatefulWidget {
  final String conversationId;
  final Map<String, dynamic>? conversationData;

  const ChatScreen({
    super.key,
    required this.conversationId,
    this.conversationData,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _loading = true;
  bool _sending = false;
  RealtimeChannel? _channel;
  String? _myId;

  // Dados da outra pessoa na conversa
  String _otherName = '';
  String? _otherAvatar;

  @override
  void initState() {
    super.initState();
    _myId = SupabaseService.currentUser?.id;
    _resolveOtherPerson();
    _loadMessages();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _channel?.unsubscribe();
    super.dispose();
  }

  void _resolveOtherPerson() {
    final conv = widget.conversationData;
    if (conv == null) return;
    final client = conv['client'] as Map<String, dynamic>?;
    final reader = conv['reader'] as Map<String, dynamic>?;
    final isClient = client?['id'] == _myId;
    final other = isClient ? reader : client;
    _otherName = other?['full_name'] as String? ?? 'Usuário';
    _otherAvatar = other?['avatar_url'] as String?;
  }

  Future<void> _loadMessages() async {
    try {
      final r = await api.get(
        '/conversations/${widget.conversationId}/messages',
      );
      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(
            ((r.data['data'] as List<dynamic>?) ?? [])
                .cast<Map<String, dynamic>>(),
          );
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
        .channel('chat:${widget.conversationId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: widget.conversationId,
          ),
          callback: (payload) {
            final newMsg = payload.newRecord;
            if (mounted && newMsg.isNotEmpty) {
              // Evitar duplicata (mensagem enviada pelo próprio usuário)
              if (_messages.any((m) => m['id'] == newMsg['id'])) return;
              setState(() => _messages.add(newMsg));
              _scrollToBottom();
            }
          },
        )
        .subscribe();
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    _msgCtrl.clear();
    setState(() => _sending = true);

    // Optimistic update
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final tempMsg = {
      'id': tempId,
      'content': text,
      'sender_id': _myId,
      'created_at': DateTime.now().toIso8601String(),
      'read_at': null,
      'type': 'TEXT',
    };
    setState(() => _messages.add(tempMsg));
    _scrollToBottom();

    try {
      final r = await api.post(
        '/conversations/${widget.conversationId}/messages',
        data: {'content': text},
      );
      // Substituir mensagem temporária pela real
      final realMsg = r.data['data'] as Map<String, dynamic>?;
      if (realMsg != null && mounted) {
        setState(() {
          // Remove duplicata que pode ter chegado via Realtime antes do HTTP
          _messages.removeWhere(
            (m) => m['id'] == realMsg['id'] && m['id'] != tempId,
          );
          final idx = _messages.indexWhere((m) => m['id'] == tempId);
          if (idx >= 0) _messages[idx] = realMsg;
        });
      }
    } catch (e) {
      // Reverter optimistic update em caso de erro
      if (mounted) {
        setState(() => _messages.removeWhere((m) => m['id'] == tempId));
        final errMsg = e.toString().contains('403')
            ? 'Sem permissão para enviar mensagem.'
            : e.toString().contains('401')
            ? 'Sessão expirada. Faça login novamente.'
            : 'Erro ao enviar mensagem.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errMsg)),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.2),
              backgroundImage: _otherAvatar != null
                  ? NetworkImage(_otherAvatar!)
                  : null,
              child: _otherAvatar == null
                  ? Text(
                      _otherName.isNotEmpty ? _otherName[0].toUpperCase() : '?',
                      style: const TextStyle(
                        color: AppColors.primaryLight,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Text(
              _otherName,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Messages ──────────────────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                ? const Center(
                    child: Text(
                      'Nenhuma mensagem ainda.\nDiga olá! 👋',
                      style: TextStyle(color: AppColors.textMuted),
                      textAlign: TextAlign.center,
                    ),
                  )
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) {
                      final msg = _messages[i];
                      final isMe = msg['sender_id'] == _myId;
                      final showDate =
                          i == 0 || _shouldShowDate(_messages[i - 1], msg);
                      return Column(
                        children: [
                          if (showDate)
                            _DateDivider(msg['created_at'] as String?),
                          _MessageBubble(message: msg, isMe: isMe),
                        ],
                      );
                    },
                  ),
          ),

          // ── Input ─────────────────────────────────────────────────────────
          Container(
            padding: EdgeInsets.fromLTRB(
              16,
              8,
              16,
              MediaQuery.of(context).padding.bottom + 8,
            ),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border(
                top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    style: const TextStyle(color: AppColors.textPrimary),
                    maxLines: 4,
                    minLines: 1,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Digite uma mensagem...',
                      hintStyle: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 14,
                      ),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: _sending
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.send, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _shouldShowDate(Map<String, dynamic> prev, Map<String, dynamic> curr) {
    final prevDt = DateTime.tryParse(
      prev['created_at'] as String? ?? '',
    )?.toLocal();
    final currDt = DateTime.tryParse(
      curr['created_at'] as String? ?? '',
    )?.toLocal();
    if (prevDt == null || currDt == null) return false;
    return prevDt.day != currDt.day ||
        prevDt.month != currDt.month ||
        prevDt.year != currDt.year;
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> message;
  final bool isMe;

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final content = message['content'] as String? ?? '';
    final createdAt = DateTime.tryParse(
      message['created_at'] as String? ?? '',
    )?.toLocal();
    final timeStr = createdAt != null
        ? DateFormat('HH:mm').format(createdAt)
        : '';
    final isTemp = (message['id'] as String? ?? '').startsWith('temp_');

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isMe ? 18 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 18),
          ),
        ),
        child: Column(
          crossAxisAlignment: isMe
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              content,
              style: TextStyle(
                color: isMe ? Colors.white : AppColors.textPrimary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  timeStr,
                  style: TextStyle(
                    color: isMe ? Colors.white54 : AppColors.textMuted,
                    fontSize: 10,
                  ),
                ),
                if (isMe && !isTemp) ...[
                  const SizedBox(width: 4),
                  Icon(
                    message['read_at'] != null ? Icons.done_all : Icons.done,
                    size: 12,
                    color: message['read_at'] != null
                        ? Colors.lightBlueAccent
                        : Colors.white54,
                  ),
                ],
                if (isTemp) ...[
                  const SizedBox(width: 4),
                  const SizedBox(
                    width: 10,
                    height: 10,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: Colors.white54,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DateDivider extends StatelessWidget {
  final String? dateStr;
  const _DateDivider(this.dateStr);

  @override
  Widget build(BuildContext context) {
    final dt = DateTime.tryParse(dateStr ?? '')?.toLocal();
    if (dt == null) return const SizedBox.shrink();

    final now = DateTime.now();
    String label;
    if (now.difference(dt).inDays == 0) {
      label = 'Hoje';
    } else if (now.difference(dt).inDays == 1) {
      label = 'Ontem';
    } else {
      label = DateFormat('dd/MM/yyyy').format(dt);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.1))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
          ),
          Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.1))),
        ],
      ),
    );
  }
}
