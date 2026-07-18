import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:frete_app/data/motorista_repository.dart';

import '../test_helpers/hive_test_helper.dart';

void main() {
  late Directory tempDir;
  late MotoristaRepository repository;

  setUp(() async {
    tempDir = await openTestHiveBoxes();
    repository = MotoristaRepository();
  });

  tearDown(() async {
    await closeTestHiveBoxes(tempDir);
  });

  test('add cria motorista e retorna com id gerado', () async {
    final motorista = await repository.add(
      nome: 'Carlos Souza',
      telefone: '11988887777',
      cnh: '01234567890',
      placaVeiculo: 'ABC1D23',
    );

    expect(motorista.id, isNotEmpty);
    expect(repository.getById(motorista.id)?.placaVeiculo, 'ABC1D23');
  });

  test('update altera os dados do motorista existente', () async {
    final motorista = await repository.add(nome: 'Carlos', telefone: '111');

    await repository.update(motorista.copyWith(placaVeiculo: 'XYZ9Z99'));

    expect(repository.getById(motorista.id)?.placaVeiculo, 'XYZ9Z99');
  });

  test('delete remove o motorista', () async {
    final motorista = await repository.add(nome: 'Carlos', telefone: '111');

    await repository.delete(motorista.id);

    expect(repository.getById(motorista.id), isNull);
  });
}
