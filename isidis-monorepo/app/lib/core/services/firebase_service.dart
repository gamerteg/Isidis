import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../supabase/supabase_service.dart';

class FirebaseService {
  static GoRouter? _router;

  static void setRouter(GoRouter router) => _router = router;

  static GoRouter? get router => _router;

  static Future<void> initialize() async {
    if (kIsWeb) return;
    try {
      await Firebase.initializeApp();

      final messaging = FirebaseMessaging.instance;

      await messaging.requestPermission(alert: true, badge: true, sound: true);

      final token = await messaging.getToken();
      debugPrint('[Firebase] FCM token: $token');
      if (token != null) {
        await _sendTokenToApi(token);
      }

      messaging.onTokenRefresh.listen((newToken) async {
        await _sendTokenToApi(newToken);
      });

      SupabaseService.authStateChanges.listen((_) async {
        if (!SupabaseService.isLoggedIn) return;
        final currentToken = await messaging.getToken();
        if (currentToken != null) {
          await _sendTokenToApi(currentToken);
        }
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[Firebase] Foreground: ${message.notification?.title}');
      });

      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        final route = message.data['route'] as String?;
        if (route != null) _router?.go(route);
      });
    } catch (e) {
      debugPrint('[Firebase] Initialization failed (non-fatal): $e');
    }
  }

  static Future<void> _sendTokenToApi(String token) async {
    if (!SupabaseService.isLoggedIn) {
      debugPrint(
        '[Firebase] Usuario sem sessao; token sera enviado apos login',
      );
      return;
    }

    try {
      final platform = defaultTargetPlatform == TargetPlatform.iOS
          ? 'ios'
          : 'android';
      await api.post(
        '/device-tokens',
        data: {'token': token, 'platform': platform},
      );
      debugPrint('[Firebase] Token enviado para API');
    } catch (error) {
      debugPrint('[Firebase] Falha ao enviar token: $error');
    }
  }
}
