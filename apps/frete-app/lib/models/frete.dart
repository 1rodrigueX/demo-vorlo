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
      'clienteId': clienteId,
      'motoristaId': motoristaId,
      'origem': origem,
      'destino': destino,
      'data': data.toIso8601String(),
      'distanciaKm': distanciaKm,
      'valorPorKm': valorPorKm,
      'margemLucroPercentual': margemLucroPercentual,
      'valorFrete': valorFrete,
      'calcularPorKm': calcularPorKm,
      'status': status.name,
      'numeroNF': numeroNF,
      'observacoes': observacoes,
    };
  }

  factory Frete.fromMap(Map<dynamic, dynamic> map) {
    return Frete(
      id: map['id'] as String,
      clienteId: map['clienteId'] as String,
      motoristaId: map['motoristaId'] as String,
      origem: map['origem'] as String,
      destino: map['destino'] as String,
      data: DateTime.parse(map['data'] as String),
      distanciaKm: (map['distanciaKm'] as num?)?.toDouble() ?? 0,
      valorPorKm: (map['valorPorKm'] as num?)?.toDouble() ?? 0,
      margemLucroPercentual: (map['margemLucroPercentual'] as num?)?.toDouble() ?? 0,
      valorFrete: (map['valorFrete'] as num?)?.toDouble() ?? 0,
      calcularPorKm: map['calcularPorKm'] as bool? ?? false,
      status: FreteStatus.values.firstWhere(
        (s) => s.name == map['status'],
        orElse: () => FreteStatus.cotacao,
      ),
      numeroNF: map['numeroNF'] as String? ?? '',
      observacoes: map['observacoes'] as String? ?? '',
    );
  }
}
