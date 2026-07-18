import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'tenant_context.dart';

/// Guarda configurações gerais do app, como o fator de imposto usado para
/// calcular o valor líquido a receber a partir do valor da NF.
///
/// fatorImposto fica em cache local (carregado uma vez via [carregar]) pra
/// telas poderem ler sincronamente enquanto montam o preview de valores —
/// diferente de clientes/motoristas/fretes, aqui é só um número, não vale a
/// pena buscar de novo a cada tela.
class ConfiguracoesRepository {
  final _client = Supabase.instance.client;

  /// Valor da NF × [fatorImposto] = valor líquido a receber.
  ///
  /// Por padrão, 0,85: a NF é emitida com o valor "bruto" (valor líquido
  /// dividido por 0,85) para cobrir os 15% de imposto retido, então o valor
  /// realmente recebido é 85% do valor da NF.
  static const double fatorImpostoPadrao = 0.85;

  double _fatorImposto = fatorImpostoPadrao;
  final ValueNotifier<int> version = ValueNotifier(0);

  double get fatorImposto => _fatorImposto;

  Future<void> carregar() async {
    final row = await _client
        .from('transportadora_configuracoes')
        .select('fator_imposto')
        .eq('tenant_id', TenantContext.instance.tenantId)
        .maybeSingle();
    _fatorImposto = (row?['fator_imposto'] as num?)?.toDouble() ?? fatorImpostoPadrao;
    version.value++;
  }

  Future<void> setFatorImposto(double valor) async {
    await _client.from('transportadora_configuracoes').upsert({
      'tenant_id': TenantContext.instance.tenantId,
      'fator_imposto': valor,
    });
    _fatorImposto = valor;
    version.value++;
  }

  double calcularValorAReceber(double valorNF) => valorNF * _fatorImposto;
}
