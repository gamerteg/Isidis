abstract final class AppEnv {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static List<String> get missingSupabaseVars => [
    if (supabaseUrl.isEmpty) 'SUPABASE_URL',
    if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
  ];
}
