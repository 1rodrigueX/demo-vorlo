import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/cliente.dart';
import 'hive_boxes.dart';

class ClienteRepository {
  final Box<Map> _box = Hive.box<Map>(HiveBoxes.clientes);
  static const _uuid = Uuid();

  ValueListenable<Box<Map>> listenable() => _box.listenable();

  List<Cliente> getAll() {
    final clientes = _box.values.map((m) => Cliente.fromMap(m)).toList();
    clientes.sort((a, b) => a.nome.compareTo(b.nome));
    return clientes;
  }

  Cliente? getById(String id) {
    final map = _box.get(id);
    return map == null ? null : Cliente.fromMap(map);
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
    await _box.put(cliente.id, cliente.toMap());
    return cliente;
  }

  Future<void> update(Cliente cliente) async {
    await _box.put(cliente.id, cliente.toMap());
  }

  Future<void> delete(String id) async {
    await _box.delete(id);
  }
}
