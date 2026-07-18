import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/motorista.dart';
import 'hive_boxes.dart';

class MotoristaRepository {
  final Box<Map> _box = Hive.box<Map>(HiveBoxes.motoristas);
  static const _uuid = Uuid();

  ValueListenable<Box<Map>> listenable() => _box.listenable();

  List<Motorista> getAll() {
    final motoristas = _box.values.map((m) => Motorista.fromMap(m)).toList();
    motoristas.sort((a, b) => a.nome.compareTo(b.nome));
    return motoristas;
  }

  Motorista? getById(String id) {
    final map = _box.get(id);
    return map == null ? null : Motorista.fromMap(map);
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
    await _box.put(motorista.id, motorista.toMap());
    return motorista;
  }

  Future<void> update(Motorista motorista) async {
    await _box.put(motorista.id, motorista.toMap());
  }

  Future<void> delete(String id) async {
    await _box.delete(id);
  }
}
