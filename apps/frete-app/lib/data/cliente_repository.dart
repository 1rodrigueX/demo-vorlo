import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/cliente.dart';
import 'tenant_context.dart';

class ClienteRepository {
  final _client = Supabase.instance.client;
  static const _uuid = Uuid();

  /// Incrementa a cada escrita — telas escutam isso pra saber quando
  /// re-buscar a lista (substitui o Box.listenable() do Hive).
  final ValueNotifier<int> version = ValueNotifier(0);

  Future<List<Cliente>> getAll() async {
    final rows = await _client.from('transportadora_clientes').select().order('nome');
    return rows.map((row) => Cliente.fromMap(row)).toList();
  }

  Future<Cliente?> getById(String id) async {
    final row = await _client.from('transportadora_clientes').select().eq('id', id).maybeSingle();
    return row == null ? null : Cliente.fromMap(row);
  }

  Future<Cliente> add({
    required String nome,
    required String telefone,
    String documento = '',
    String endereco = '',
  }) async {
    final cliente = Cliente(
      id: _uuid.v4(),
      nome: nome,
      telefone: telefone,
      documento: documento,
      endereco: endereco,
    );
    await _client.from('transportadora_clientes').insert({
      ...cliente.toMap(),
      'tenant_id': TenantContext.instance.tenantId,
    });
    version.value++;
    return cliente;
  }

  Future<void> update(Cliente cliente) async {
    await _client.from('transportadora_clientes').update(cliente.toMap()).eq('id', cliente.id);
    version.value++;
  }

  Future<void> delete(String id) async {
    await _client.from('transportadora_clientes').delete().eq('id', id);
    version.value++;
  }
}
