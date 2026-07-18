import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/frete.dart';
import 'hive_boxes.dart';

class FreteRepository {
  final Box<Map> _box = Hive.box<Map>(HiveBoxes.fretes);
  static const _uuid = Uuid();

  ValueListenable<Box<Map>> listenable() => _box.listenable();

  List<Frete> getAll() {
    final fretes = _box.values.map((m) => Frete.fromMap(m)).toList();
    fretes.sort((a, b) => b.data.compareTo(a.data));
    return fretes;
  }

  Frete? getById(String id) {
    final map = _box.get(id);
    return map == null ? null : Frete.fromMap(map);
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
      valorFrete: frete.valorFrete,
      calcularPorKm: frete.calcularPorKm,
      status: frete.status,
      observacoes: frete.observacoes,
    );
    await _box.put(novoFrete.id, novoFrete.toMap());
    return novoFrete;
  }

  Future<void> update(Frete frete) async {
    await _box.put(frete.id, frete.toMap());
  }

  Future<void> delete(String id) async {
    await _box.delete(id);
  }

  double valorTotal({Iterable<FreteStatus>? statusPermitidos}) {
    return getAll()
        .where(
          (f) => statusPermitidos == null || statusPermitidos.contains(f.status),
        )
        .fold(0.0, (soma, f) => soma + f.valorFrete);
  }

  int contarPorStatus(FreteStatus status) {
    return getAll().where((f) => f.status == status).length;
  }
}
