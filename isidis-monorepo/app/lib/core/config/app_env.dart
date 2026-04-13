abstract final class AppEnv {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.isidis.com.br',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static List<String> get missingSupabaseVars => [
    if (supabaseUrl.isEmpty) 'SUPABASE_URL',
    if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
  ];
}
