class Motorista {
  final String id;
  final String nome;
  final String telefone;
  final String cnh;
  final String placaVeiculo;

  const Motorista({
    required this.id,
    required this.nome,
    required this.telefone,
    this.cnh = '',
    this.placaVeiculo = '',
  });

  Motorista copyWith({
    String? nome,
    String? telefone,
    String? cnh,
    String? placaVeiculo,
  }) {
    return Motorista(
      id: id,
      nome: nome ?? this.nome,
      telefone: telefone ?? this.telefone,
      cnh: cnh ?? this.cnh,
      placaVeiculo: placaVeiculo ?? this.placaVeiculo,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'nome': nome,
      'telefone': telefone,
      'cnh': cnh,
      'placa_veiculo': placaVeiculo,
    };
  }

  factory Motorista.fromMap(Map<dynamic, dynamic> map) {
    return Motorista(
      id: map['id'] as String,
      nome: map['nome'] as String,
      telefone: map['telefone'] as String? ?? '',
      cnh: map['cnh'] as String? ?? '',
      placaVeiculo: map['placa_veiculo'] as String? ?? '',
    );
  }
}
