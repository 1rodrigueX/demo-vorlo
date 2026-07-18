import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/motorista.dart';
import 'tenant_context.dart';

class MotoristaRepository {
  final _client = Supabase.instance.client;
  static const _uuid = Uuid();

  final ValueNotifier<int> version = ValueNotifier(0);

  Future<List<Motorista>> getAll() async {
    final rows = await _client.from('transportadora_motoristas').select().order('nome');
    return rows.map((row) => Motorista.fromMap(row)).toList();
  }

  Future<Motorista?> getById(String id) async {
    final row = await _client.from('transportadora_motoristas').select().eq('id', id).maybeSingle();
    return row == null ? null : Motorista.fromMap(row);
  }

  Future<Motorista> add({
    required String nome,
    required String telefone,
    String cnh = '',
    String placaVeiculo = '',
  }) async {
    final motorista = Motorista(
      id: _uuid.v4(),
      nome: nome,
      telefone: telefone,
      cnh: cnh,
      placaVeiculo: placaVeiculo,
    );
    await _client.from('transportadora_motoristas').insert({
      ...motorista.toMap(),
      'tenant_id': TenantContext.instance.tenantId,
    });
    version.value++;
    return motorista;
  }

  Future<void> update(Motorista motorista) async {
    await _client.from('transportadora_motoristas').update(motorista.toMap()).eq('id', motorista.id);
    version.value++;
  }

  Future<void> delete(String id) async {
    await _client.from('transportadora_motoristas').delete().eq('id', id);
    version.value++;
  }
}
