import 'package:supabase_flutter/supabase_flutter.dart';

/// Guarda o tenant_id da empresa do usuário logado, carregado uma vez após o
/// login. Os repositórios usam isso pra preencher tenant_id nos inserts — a
/// fronteira de segurança de verdade é a RLS do Supabase (with check), isso
/// aqui é só o que o cliente precisa mandar.
class TenantContext {
  TenantContext._();
  static final TenantContext instance = TenantContext._();

  String? _tenantId;

  String get tenantId {
    final id = _tenantId;
    if (id == null) {
      throw StateError('TenantContext ainda não foi carregado — chame load() depois do login.');
    }
    return id;
  }

  Future<void> load() async {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    final response = await Supabase.instance.client
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();
    _tenantId = response['tenant_id'] as String;
  }

  void clear() => _tenantId = null;
}
