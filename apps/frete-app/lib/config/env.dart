/// Valores injetados em build/run time via `--dart-define-from-file=env.json`
/// (veja env.example.json). Mesmo projeto Supabase do site — login criado no
/// site funciona direto aqui, sem nenhuma sincronização extra.
class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
