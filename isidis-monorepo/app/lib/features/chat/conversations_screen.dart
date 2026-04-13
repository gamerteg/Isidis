import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  List<dynamic> _conversations = [];
  bool _loading = true;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadConversations();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    try {
      final r = await api.get('/conversations');
      if (mounted) {
        setState(() {
          _conversations = (r.data['data'] as List<dynamic>?) ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _subscribeRealtime() {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;

    _channel = Supabase.instance.client
        .channel('conversations:$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'conversations',
          callback: (_) => _loadConversations(),
        )
        .subscribe();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Mensagens',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadConversations,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _conversations.isEmpty
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.chat_bubble_outline,
                      color: AppColors.textMuted,
                      size: 56,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Nenhuma conversa ainda',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Suas conversas com cartomantes\naparecerão aqui.',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            : ListView.separated(
                itemCount: _conversations.length,
                separatorBuilder: (_, __) => Divider(
                  color: Colors.white.withValues(alpha: 0.06),
                  height: 1,
                ),
                itemBuilder: (_, i) {
                  final c = _conversations[i] as Map<String, dynamic>;
                  return _ConversationTile(
                    conversation: c,
                    onTap: () => context.push('/chat/${c['id']}', extra: c),
                  );
                },
              ),
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Map<String, dynamic> conversation;
  final VoidCallback onTap;

  const _ConversationTile({required this.conversation, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final myId = SupabaseService.currentUser?.id;
    final client = conversation['client'] as Map<String, dynamic>?;
    final reader = conversation['reader'] as Map<String, dynamic>?;

    // O "outro" na conversa
    final isClient = client?['id'] == myId;
    final other = isClient ? reader : client;
    final otherName = other?['full_name'] as String? ?? 'Usuário';
    final otherAvatar = other?['avatar_url'] as String?;

    final lastMsg = conversation['last_message'] as String?;
    final lastAt = conversation['last_message_at'] as String?;

    String timeLabel = '';
    if (lastAt != null) {
      final dt = DateTime.tryParse(lastAt)?.toLocal();
      if (dt != null) {
        final now = DateTime.now();
        if (now.difference(dt).inDays == 0) {
          timeLabel = DateFormat('HH:mm').format(dt);
        } else if (now.difference(dt).inDays < 7) {
          timeLabel = DateFormat('E', 'pt_BR').format(dt);
        } else {
          timeLabel = DateFormat('dd/MM').format(dt);
        }
      }
    }

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: CircleAvatar(
        radius: 26,
        backgroundColor: AppColors.primary.withValues(alpha: 0.2),
        backgroundImage: otherAvatar != null ? NetworkImage(otherAvatar) : null,
        child: otherAvatar == null
            ? Text(
                otherName.isNotEmpty ? otherName[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: AppColors.primaryLight,
                  fontWeight: FontWeight.bold,
                ),
              )
            : null,
      ),
      title: Text(
        otherName,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        lastMsg ?? 'Iniciar conversa',
        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Text(
        timeLabel,
        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
      ),
    );
  }
}
