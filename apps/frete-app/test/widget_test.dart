import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:frete_app/main.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('pt_BR');
    // Sem isso, o client de storage local do Supabase (SharedPreferences)
    // não tem implementação de plugin disponível sob `flutter test`.
    SharedPreferences.setMockInitialValues({});
    // URL/chave fictícias — sem sessão local, nenhuma chamada de rede
    // acontece só de inicializar o client, então isso basta pro AuthGate
    // decidir "sem sessão -> mostra login" sem precisar de um backend real.
    await Supabase.initialize(
      url: 'https://example.supabase.co',
      publishableKey: 'test-anon-key',
    );
  });

  testWidgets('sem sessão, abre na tela de login', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();

    expect(find.text('FALA AI Transportadora'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'E-mail'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Senha'), findsOneWidget);
  });

  testWidgets('valida campos obrigatórios antes de tentar logar', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();

    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pump();

    expect(find.text('Informe seu e-mail'), findsOneWidget);
    expect(find.text('Informe sua senha'), findsOneWidget);
  });
}
