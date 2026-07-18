class Cliente {
  final String id;
  final String nome;
  final String telefone;
  final String documento;
  final String endereco;

  const Cliente({
    required this.id,
    required this.nome,
    required this.telefone,
    this.documento = '',
    this.endereco = '',
  });

  Cliente copyWith({
    String? nome,
    String? telefone,
    String? documento,
    String? endereco,
  }) {
    return Cliente(
      id: id,
      nome: nome ?? this.nome,
      telefone: telefone ?? this.telefone,
      documento: documento ?? this.documento,
      endereco: endereco ?? this.endereco,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'nome': nome,
      'telefone': telefone,
      'documento': documento,
      'endereco': endereco,
    };
  }

  factory Cliente.fromMap(Map<dynamic, dynamic> map) {
    return Cliente(
      id: map['id'] as String,
      nome: map['nome'] as String,
      telefone: map['telefone'] as String? ?? '',
      documento: map['documento'] as String? ?? '',
      endereco: map['endereco'] as String? ?? '',
    );
  }
}
