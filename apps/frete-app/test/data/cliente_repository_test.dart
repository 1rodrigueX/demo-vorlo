import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:frete_app/data/cliente_repository.dart';

import '../test_helpers/hive_test_helper.dart';

void main() {
  late Directory tempDir;
  late ClienteRepository repository;

  setUp(() async {
    tempDir = await openTestHiveBoxes();
    repository = ClienteRepository();
  });

  tearDown(() async {
    await closeTestHiveBoxes(tempDir);
  });

  test('começa vazio', () {
    expect(repository.getAll(), isEmpty);
  });

  test('add cria cliente e retorna com id gerado', () async {
    final cliente = await repository.add(
      nome: 'João Silva',
      telefone: '11999990000',
      documento: '123.456.789-00',
      endereco: 'Rua A, 100',
    );

    expect(cliente.id, isNotEmpty);
    expect(repository.getAll(), hasLength(1));
    expect(repository.getById(cliente.id)?.nome, 'João Silva');
  });

  test('getAll retorna ordenado por nome', () async {
    await repository.add(nome: 'Zeca', telefone: '');
    await repository.add(nome: 'Ana', telefone: '');
    await repository.add(nome: 'Marcos', telefone: '');

    final nomes = repository.getAll().map((c) => c.nome).toList();
    expect(nomes, ['Ana', 'Marcos', 'Zeca']);
  });

  test('update altera os dados do cliente existente', () async {
    final cliente = await repository.add(nome: 'João', telefone: '111');

    await repository.update(cliente.copyWith(nome: 'João Pedro', telefone: '222'));

    final atualizado = repository.getById(cliente.id)!;
    expect(atualizado.nome, 'João Pedro');
    expect(atualizado.telefone, '222');
  });

  test('delete remove o cliente', () async {
    final cliente = await repository.add(nome: 'João', telefone: '111');

    await repository.delete(cliente.id);

    expect(repository.getById(cliente.id), isNull);
    expect(repository.getAll(), isEmpty);
  });
}
