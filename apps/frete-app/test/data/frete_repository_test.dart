import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:frete_app/data/frete_repository.dart';
import 'package:frete_app/models/frete.dart';

import '../test_helpers/hive_test_helper.dart';

Frete _novoFrete({
  required FreteStatus status,
  required double valorFrete,
}) {
  return Frete(
    id: '',
    clienteId: 'cliente-1',
    motoristaId: 'motorista-1',
    origem: 'São Paulo',
    destino: 'Rio de Janeiro',
    data: DateTime(2026, 1, 10),
    distanciaKm: 430,
    valorPorKm: 5,
    valorFrete: valorFrete,
    calcularPorKm: true,
    status: status,
  );
}

void main() {
  late Directory tempDir;
  late FreteRepository repository;

  setUp(() async {
    tempDir = await openTestHiveBoxes();
    repository = FreteRepository();
  });

  tearDown(() async {
    await closeTestHiveBoxes(tempDir);
  });

  test('add gera id e persiste o frete', () async {
    final frete = await repository.add(
      _novoFrete(status: FreteStatus.cotacao, valorFrete: 2150),
    );

    expect(frete.id, isNotEmpty);
    expect(repository.getById(frete.id)?.valorFrete, 2150);
  });

  test('getAll ordena por data decrescente (mais recente primeiro)', () async {
    final antigo = await repository.add(
      _novoFrete(status: FreteStatus.concluido, valorFrete: 100)
          .copyWith(data: DateTime(2025, 1, 1)),
    );
    final recente = await repository.add(
      _novoFrete(status: FreteStatus.concluido, valorFrete: 200)
          .copyWith(data: DateTime(2026, 6, 1)),
    );

    final ids = repository.getAll().map((f) => f.id).toList();
    expect(ids, [recente.id, antigo.id]);
  });

  test('valorTotal soma somente os status informados', () async {
    await repository.add(_novoFrete(status: FreteStatus.concluido, valorFrete: 100));
    await repository.add(_novoFrete(status: FreteStatus.concluido, valorFrete: 250));
    await repository.add(_novoFrete(status: FreteStatus.cotacao, valorFrete: 999));

    final total = repository.valorTotal(statusPermitidos: [FreteStatus.concluido]);

    expect(total, 350);
  });

  test('valorTotal sem filtro soma todos os fretes', () async {
    await repository.add(_novoFrete(status: FreteStatus.concluido, valorFrete: 100));
    await repository.add(_novoFrete(status: FreteStatus.perdido, valorFrete: 50));

    expect(repository.valorTotal(), 150);
  });

  test('contarPorStatus conta corretamente cada status', () async {
    await repository.add(_novoFrete(status: FreteStatus.cotacao, valorFrete: 10));
    await repository.add(_novoFrete(status: FreteStatus.cotacao, valorFrete: 10));
    await repository.add(_novoFrete(status: FreteStatus.emAndamento, valorFrete: 10));

    expect(repository.contarPorStatus(FreteStatus.cotacao), 2);
    expect(repository.contarPorStatus(FreteStatus.emAndamento), 1);
    expect(repository.contarPorStatus(FreteStatus.concluido), 0);
  });

  test('update altera o status e o valor do frete', () async {
    final frete = await repository.add(
      _novoFrete(status: FreteStatus.cotacao, valorFrete: 500),
    );

    await repository.update(
      frete.copyWith(status: FreteStatus.concluido, valorFrete: 600),
    );

    final atualizado = repository.getById(frete.id)!;
    expect(atualizado.status, FreteStatus.concluido);
    expect(atualizado.valorFrete, 600);
  });

  test('delete remove o frete', () async {
    final frete = await repository.add(
      _novoFrete(status: FreteStatus.cotacao, valorFrete: 500),
    );

    await repository.delete(frete.id);

    expect(repository.getById(frete.id), isNull);
  });
}
