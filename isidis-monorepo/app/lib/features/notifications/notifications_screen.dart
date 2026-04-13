import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _loading = true;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final r = await api.get('/notifications');
      if (mounted) {
        setState(() {
          _notifications = (r.data['data'] as List<dynamic>?) ?? [];
          _unreadCount = r.data['unreadCount'] as int? ?? 0;
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
        .channel('notifications:$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            final newNotif = payload.newRecord;
            if (mounted && newNotif.isNotEmpty) {
              setState(() {
                _notifications.insert(0, newNotif);
                _unreadCount++;
              });
            }
          },
        )
        .subscribe();
  }

  Future<void> _markAllRead() async {
    try {
      await api.patch('/notifications/read-all');
      if (mounted) {
        setState(() {
          _unreadCount = 0;
          _notifications = _notifications.map((n) {
            final notif = Map<String, dynamic>.from(n as Map<String, dynamic>);
            notif['read_at'] ??= DateTime.now().toIso8601String();
            return notif;
          }).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _markRead(String id) async {
    try {
      await api.patch('/notifications/$id/read');
    } catch (_) {}
  }

  void _handleTap(Map<String, dynamic> notif) {
    final id = notif['id'] as String;
    final link = notif['link'] as String?;
    final isRead = notif['read_at'] != null;

    if (!isRead) {
      _markRead(id);
      setState(() {
        final idx = _notifications.indexWhere(
          (n) => (n as Map<String, dynamic>)['id'] == id,
        );
        if (idx >= 0) {
          final updated = Map<String, dynamic>.from(
            _notifications[idx] as Map<String, dynamic>,
          );
          updated['read_at'] = DateTime.now().toIso8601String();
          _notifications[idx] = updated;
          _unreadCount = (_unreadCount - 1).clamp(0, 9999);
        }
      });
    }

    if (link != null && link.isNotEmpty) {
      context.push(link);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'Notificações',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$_unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text(
                'Marcar todas',
                style: TextStyle(color: AppColors.primaryLight, fontSize: 13),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _notifications.isEmpty
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.notifications_none,
                      color: AppColors.textMuted,
                      size: 56,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Nenhuma notificação',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              )
            : ListView.separated(
                itemCount: _notifications.length,
                separatorBuilder: (_, __) => Divider(
                  color: Colors.white.withValues(alpha: 0.05),
                  height: 1,
                ),
                itemBuilder: (_, i) {
                  final n = _notifications[i] as Map<String, dynamic>;
                  return _NotificationTile(
                    notification: n,
                    onTap: () => _handleTap(n),
                  );
                },
              ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final Map<String, dynamic> notification;
  final VoidCallback onTap;

  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final type = notification['type'] as String? ?? '';
    final title = notification['title'] as String? ?? '';
    final message = notification['message'] as String? ?? '';
    final isRead = notification['read_at'] != null;
    final createdAt = DateTime.tryParse(
      notification['created_at'] as String? ?? '',
    )?.toLocal();

    final (IconData icon, Color color) = switch (type) {
      'ORDER_STATUS' => (Icons.receipt_long, AppColors.primaryLight),
      'NEW_MESSAGE' => (Icons.chat_bubble, Colors.teal),
      'PAYMENT' => (Icons.payment, Colors.green),
      'REVIEW_REQUEST' => (Icons.star, const Color(0xFFFBBF24)),
      'WALLET_RELEASED' => (Icons.account_balance_wallet, Colors.green),
      'SYSTEM' => (Icons.info_outline, AppColors.textMuted),
      _ => (Icons.notifications, AppColors.primaryLight),
    };

    String timeLabel = '';
    if (createdAt != null) {
      final now = DateTime.now();
      if (now.difference(createdAt).inMinutes < 60) {
        timeLabel = '${now.difference(createdAt).inMinutes}min';
      } else if (now.difference(createdAt).inHours < 24) {
        timeLabel = '${now.difference(createdAt).inHours}h';
      } else {
        timeLabel = DateFormat('dd/MM').format(createdAt);
      }
    }

    return InkWell(
      onTap: onTap,
      child: Container(
        color: isRead
            ? Colors.transparent
            : AppColors.primary.withValues(alpha: 0.05),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: isRead
                                ? FontWeight.normal
                                : FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        timeLabel,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (!isRead)
              Padding(
                padding: const EdgeInsets.only(left: 8, top: 4),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
