import 'package:hive_flutter/hive_flutter.dart';

class HiveBoxes {
  static const String clientes = 'clientes';
  static const String motoristas = 'motoristas';
  static const String fretes = 'fretes';
  static const String configuracoes = 'configuracoes';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<Map>(clientes),
      Hive.openBox<Map>(motoristas),
      Hive.openBox<Map>(fretes),
      Hive.openBox(configuracoes),
    ]);
  }
}
