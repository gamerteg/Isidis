import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

class FirebaseService {
  static GoRouter? _router;

  static void setRouter(GoRouter router) => _router = router;

  static GoRouter? get router => _router;

  static Future<void> initialize() async {
    if (kIsWeb) return;
    try {
      await Firebase.initializeApp();

      final messaging = FirebaseMessaging.instance;

      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      debugPrint('[Firebase] FCM token: $token');
      // TODO: POST token para /me/fcm-token

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
}
