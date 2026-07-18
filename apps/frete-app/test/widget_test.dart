import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:frete_app/main.dart';

import 'test_helpers/hive_test_helper.dart';

void main() {
  late Directory tempDir;

  setUpAll(() async {
    await initializeDateFormatting('pt_BR');
  });

  setUp(() async {
    tempDir = await openTestHiveBoxes();
  });

  tearDown(() async {
    await closeTestHiveBoxes(tempDir);
  });

  testWidgets('abre no Dashboard mostrando estado vazio', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    expect(find.text('Frete App'), findsOneWidget);
    expect(find.text('Nenhum frete cadastrado ainda.'), findsOneWidget);
    expect(find.text('Novo frete'), findsOneWidget);
  });

  testWidgets('navega entre as abas pela bottom navigation bar', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Clientes'));
    await tester.pumpAndSettle();
    expect(find.text('Nenhum cliente cadastrado.\nToque em "+" para adicionar.'),
        findsOneWidget);

    await tester.tap(find.text('Motoristas'));
    await tester.pumpAndSettle();
    expect(
      find.text('Nenhum motorista cadastrado.\nToque em "+" para adicionar.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Fretes'));
    await tester.pumpAndSettle();
    expect(find.text('Nenhum frete encontrado.\nToque em "+" para adicionar.'),
        findsOneWidget);
  });
}
