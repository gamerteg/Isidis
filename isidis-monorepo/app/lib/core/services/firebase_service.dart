import 'package:go_router/go_router.dart';

class FirebaseService {
  static GoRouter? _router;

  static void setRouter(GoRouter router) => _router = router;

  static GoRouter? get router => _router;

  static Future<void> initialize() async {}
}
