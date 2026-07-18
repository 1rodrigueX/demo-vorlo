import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'hive_boxes.dart';

/// Guarda configurações gerais do app, como o fator de imposto usado para
/// calcular o valor líquido a receber a partir do valor da NF.
class ConfiguracoesRepository {
  final Box _box = Hive.box(HiveBoxes.configuracoes);

  static const String _chaveFatorImposto = 'fatorImposto';

  /// Valor da NF × [fatorImposto] = valor líquido a receber.
  ///
  /// Por padrão, 0,85: a NF é emitida com o valor "bruto" (valor líquido
  /// dividido por 0,85) para cobrir os 15% de imposto retido, então o valor
  /// realmente recebido é 85% do valor da NF.
  static const double fatorImpostoPadrao = 0.85;

  ValueListenable<Box> listenable() => _box.listenable();

  double get fatorImposto =>
      (_box.get(_chaveFatorImposto) as num?)?.toDouble() ?? fatorImpostoPadrao;

  Future<void> setFatorImposto(double valor) => _box.put(_chaveFatorImposto, valor);

  double calcularValorAReceber(double valorNF) => valorNF * fatorImposto;
}
