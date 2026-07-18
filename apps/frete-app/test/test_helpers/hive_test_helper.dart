import 'dart:io';

import 'package:hive/hive.dart';

import 'package:frete_app/data/hive_boxes.dart';

/// Initializes Hive against a fresh temp directory and opens the app boxes,
/// mirroring [HiveBoxes.init] without touching platform channels
/// (`Hive.initFlutter` needs `path_provider`, which isn't available under
/// `flutter test`).
Future<Directory> openTestHiveBoxes() async {
  final tempDir = await Directory.systemTemp.createTemp('frete_app_test_');
  Hive.init(tempDir.path);
  await Future.wait([
    Hive.openBox<Map>(HiveBoxes.clientes),
    Hive.openBox<Map>(HiveBoxes.motoristas),
    Hive.openBox<Map>(HiveBoxes.fretes),
    Hive.openBox(HiveBoxes.configuracoes),
  ]);
  return tempDir;
}

Future<void> closeTestHiveBoxes(Directory tempDir) async {
  await Hive.deleteFromDisk();
  if (await tempDir.exists()) {
    await tempDir.delete(recursive: true);
  }
}
