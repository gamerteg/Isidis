import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_env.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    final missingVars = AppEnv.missingSupabaseVars;
    if (missingVars.isNotEmpty) {
      throw StateError(
        'Missing required dart-define(s): ${missingVars.join(', ')}',
      );
    }

    await Supabase.initialize(
      url: AppEnv.supabaseUrl,
      anonKey: AppEnv.supabaseAnonKey,
    );
  }

  static User? get currentUser => client.auth.currentUser;
  static Session? get currentSession => client.auth.currentSession;
  static bool get isLoggedIn => currentUser != null;

  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) => client.auth.signInWithPassword(email: email, password: password);

  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    Map<String, dynamic>? data,
  }) => client.auth.signUp(email: email, password: password, data: data);

  static Future<void> signOut() => client.auth.signOut();

  static Future<void> resetPassword(String email) =>
      client.auth.resetPasswordForEmail(email);
}
