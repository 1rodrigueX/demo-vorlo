import 'package:flutter_test/flutter_test.dart';

import 'package:frete_app/models/frete.dart';

void main() {
  test('toMap/fromMap faz round-trip preservando todos os campos', () {
    final frete = Frete(
      id: 'frete-1',
      clienteId: 'cliente-1',
      motoristaId: 'motorista-1',
      origem: 'Curitiba',
      destino: 'Florianópolis',
      data: DateTime(2026, 3, 5, 8, 30),
      distanciaKm: 300,
      valorPorKm: 4.5,
      margemLucroPercentual: 15,
      valorFrete: 1350,
      calcularPorKm: true,
      status: FreteStatus.emAndamento,
      numeroNF: 'NF-4521',
      observacoes: 'Carga frágil',
    );

    final restaurado = Frete.fromMap(frete.toMap());

    expect(restaurado.id, frete.id);
    expect(restaurado.clienteId, frete.clienteId);
    expect(restaurado.motoristaId, frete.motoristaId);
    expect(restaurado.origem, frete.origem);
    expect(restaurado.destino, frete.destino);
    expect(restaurado.data, frete.data);
    expect(restaurado.distanciaKm, frete.distanciaKm);
    expect(restaurado.valorPorKm, frete.valorPorKm);
    expect(restaurado.margemLucroPercentual, frete.margemLucroPercentual);
    expect(restaurado.valorFrete, frete.valorFrete);
    expect(restaurado.calcularPorKm, frete.calcularPorKm);
    expect(restaurado.status, frete.status);
    expect(restaurado.numeroNF, frete.numeroNF);
    expect(restaurado.observacoes, frete.observacoes);
  });

  test('fromMap usa status cotação quando o valor salvo é desconhecido', () {
    final map = {
      'id': 'x',
      'clienteId': 'c',
      'motoristaId': 'm',
      'origem': 'A',
      'destino': 'B',
      'data': DateTime(2026, 1, 1).toIso8601String(),
      'status': 'status-que-nao-existe-mais',
    };

    expect(Frete.fromMap(map).status, FreteStatus.cotacao);
  });

  test('copyWith altera apenas os campos informados', () {
    final original = Frete(
      id: 'id',
      clienteId: 'c1',
      motoristaId: 'm1',
      origem: 'A',
      destino: 'B',
      data: DateTime(2026, 1, 1),
      distanciaKm: 100,
      valorPorKm: 2,
      valorFrete: 200,
      calcularPorKm: true,
      status: FreteStatus.cotacao,
    );

    final atualizado = original.copyWith(status: FreteStatus.concluido);

    expect(atualizado.status, FreteStatus.concluido);
    expect(atualizado.origem, original.origem);
    expect(atualizado.valorFrete, original.valorFrete);
  });
}
