import 'package:flutter/material.dart';

enum FreteStatus {
  cotacao,
  emAndamento,
  concluido,
  perdido;

  String get label {
    switch (this) {
      case FreteStatus.cotacao:
        return 'Cotação';
      case FreteStatus.emAndamento:
        return 'Em andamento';
      case FreteStatus.concluido:
        return 'Concluído';
      case FreteStatus.perdido:
        return 'Perdido';
    }
  }

  Color get color {
    switch (this) {
      case FreteStatus.cotacao:
        return Colors.orange;
      case FreteStatus.emAndamento:
        return Colors.blue;
      case FreteStatus.concluido:
        return Colors.green;
      case FreteStatus.perdido:
        return Colors.red;
    }
  }

  /// Valor salvo no banco (check constraint de transportadora_fretes.status
  /// usa snake_case, diferente do .name do enum em Dart).
  String get dbValue {
    switch (this) {
      case FreteStatus.cotacao:
        return 'cotacao';
      case FreteStatus.emAndamento:
        return 'em_andamento';
      case FreteStatus.concluido:
        return 'concluido';
      case FreteStatus.perdido:
        return 'perdido';
    }
  }

  static FreteStatus fromDbValue(String? value) {
    return FreteStatus.values.firstWhere(
      (s) => s.dbValue == value,
      orElse: () => FreteStatus.cotacao,
    );
  }
}

class Frete {
  final String id;
  final String clienteId;
  final String motoristaId;
  final String origem;
  final String destino;
  final DateTime data;
  final double distanciaKm;
  final double valorPorKm;
  final double margemLucroPercentual;
  final double valorFrete;
  final bool calcularPorKm;
  final FreteStatus status;
  final String numeroNF;
  final String observacoes;

  const Frete({
    required this.id,
    required this.clienteId,
    required this.motoristaId,
    required this.origem,
    required this.destino,
    required this.data,
    required this.distanciaKm,
    required this.valorPorKm,
    required this.valorFrete,
    required this.calcularPorKm,
    this.margemLucroPercentual = 0,
    this.status = FreteStatus.cotacao,
    this.numeroNF = '',
    this.observacoes = '',
  });

  Frete copyWith({
    String? clienteId,
    String? motoristaId,
    String? origem,
    String? destino,
    DateTime? data,
    double? distanciaKm,
    double? valorPorKm,
    double? margemLucroPercentual,
    double? valorFrete,
    bool? calcularPorKm,
    FreteStatus? status,
    String? numeroNF,
    String? observacoes,
  }) {
    return Frete(
      id: id,
      clienteId: clienteId ?? this.clienteId,
      motoristaId: motoristaId ?? this.motoristaId,
      origem: origem ?? this.origem,
      destino: destino ?? this.destino,
      data: data ?? this.data,
      distanciaKm: distanciaKm ?? this.distanciaKm,
      valorPorKm: valorPorKm ?? this.valorPorKm,
      margemLucroPercentual: margemLucroPercentual ?? this.margemLucroPercentual,
      valorFrete: valorFrete ?? this.valorFrete,
      calcularPorKm: calcularPorKm ?? this.calcularPorKm,
      status: status ?? this.status,
      numeroNF: numeroNF ?? this.numeroNF,
      observacoes: observacoes ?? this.observacoes,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'cliente_id': clienteId,
      'motorista_id': motoristaId,
      'origem': origem,
      'destino': destino,
      'data': data.toIso8601String(),
      'distancia_km': distanciaKm,
      'valor_por_km': valorPorKm,
      'margem_lucro_percentual': margemLucroPercentual,
      'valor_frete': valorFrete,
      'calcular_por_km': calcularPorKm,
      'status': status.dbValue,
      'numero_nf': numeroNF,
      'observacoes': observacoes,
    };
  }

  factory Frete.fromMap(Map<dynamic, dynamic> map) {
    return Frete(
      id: map['id'] as String,
      clienteId: map['cliente_id'] as String,
      motoristaId: map['motorista_id'] as String,
      origem: map['origem'] as String,
      destino: map['destino'] as String,
      data: DateTime.parse(map['data'] as String),
      distanciaKm: (map['distancia_km'] as num?)?.toDouble() ?? 0,
      valorPorKm: (map['valor_por_km'] as num?)?.toDouble() ?? 0,
      margemLucroPercentual: (map['margem_lucro_percentual'] as num?)?.toDouble() ?? 0,
      valorFrete: (map['valor_frete'] as num?)?.toDouble() ?? 0,
      calcularPorKm: map['calcular_por_km'] as bool? ?? false,
      status: FreteStatus.fromDbValue(map['status'] as String?),
      numeroNF: map['numero_nf'] as String? ?? '',
      observacoes: map['observacoes'] as String? ?? '',
    );
  }
}
