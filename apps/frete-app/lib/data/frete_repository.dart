import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/frete.dart';
import 'tenant_context.dart';

class FreteRepository {
  final _client = Supabase.instance.client;
  static const _uuid = Uuid();

  final ValueNotifier<int> version = ValueNotifier(0);

  Future<List<Frete>> getAll() async {
    final rows = await _client
        .from('transportadora_fretes')
        .select()
        .order('data', ascending: false);
    return rows.map((row) => Frete.fromMap(row)).toList();
  }

  Future<Frete?> getById(String id) async {
    final row = await _client.from('transportadora_fretes').select().eq('id', id).maybeSingle();
    return row == null ? null : Frete.fromMap(row);
  }

  Future<Frete> add(Frete frete) async {
    final novoFrete = Frete(
      id: _uuid.v4(),
      clienteId: frete.clienteId,
      motoristaId: frete.motoristaId,
      origem: frete.origem,
      destino: frete.destino,
      data: frete.data,
      distanciaKm: frete.distanciaKm,
      valorPorKm: frete.valorPorKm,
      margemLucroPercentual: frete.margemLucroPercentual,
      valorFrete: frete.valorFrete,
      calcularPorKm: frete.calcularPorKm,
      status: frete.status,
      numeroNF: frete.numeroNF,
      observacoes: frete.observacoes,
    );
    await _client.from('transportadora_fretes').insert({
      ...novoFrete.toMap(),
      'tenant_id': TenantContext.instance.tenantId,
    });
    version.value++;
    return novoFrete;
  }

  Future<void> update(Frete frete) async {
    await _client.from('transportadora_fretes').update(frete.toMap()).eq('id', frete.id);
    version.value++;
  }

  Future<void> delete(String id) async {
    await _client.from('transportadora_fretes').delete().eq('id', id);
    version.value++;
  }

  double valorTotal(List<Frete> fretes, {Iterable<FreteStatus>? statusPermitidos}) {
    return fretes
        .where((f) => statusPermitidos == null || statusPermitidos.contains(f.status))
        .fold(0.0, (soma, f) => soma + f.valorFrete);
  }

  int contarPorStatus(List<Frete> fretes, FreteStatus status) {
    return fretes.where((f) => f.status == status).length;
  }
}
