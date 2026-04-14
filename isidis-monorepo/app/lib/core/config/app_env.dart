abstract final class AppEnv {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.isidis.com.br',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static const asaasEnvironment = String.fromEnvironment(
    'ASAAS_ENV',
    defaultValue: 'sandbox',
  );

  static bool get isProduction => asaasEnvironment == 'production';

  static List<String> get missingSupabaseVars => [
    if (supabaseUrl.isEmpty) 'SUPABASE_URL',
    if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
  ];
}
