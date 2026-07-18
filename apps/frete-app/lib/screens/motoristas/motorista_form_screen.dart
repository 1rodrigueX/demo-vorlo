import 'package:flutter/material.dart';

import '../../data/motorista_repository.dart';
import '../../models/motorista.dart';

class MotoristaFormScreen extends StatefulWidget {
  final MotoristaRepository repository;
  final Motorista? motorista;

  const MotoristaFormScreen({super.key, required this.repository, this.motorista});

  @override
  State<MotoristaFormScreen> createState() => _MotoristaFormScreenState();
}

class _MotoristaFormScreenState extends State<MotoristaFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nomeController;
  late final TextEditingController _telefoneController;
  late final TextEditingController _cnhController;
  late final TextEditingController _placaController;

  bool get _isEditing => widget.motorista != null;

  @override
  void initState() {
    super.initState();
    final motorista = widget.motorista;
    _nomeController = TextEditingController(text: motorista?.nome ?? '');
    _telefoneController = TextEditingController(text: motorista?.telefone ?? '');
    _cnhController = TextEditingController(text: motorista?.cnh ?? '');
    _placaController = TextEditingController(text: motorista?.placaVeiculo ?? '');
  }

  @override
  void dispose() {
    _nomeController.dispose();
    _telefoneController.dispose();
    _cnhController.dispose();
    _placaController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;

    if (_isEditing) {
      await widget.repository.update(
        widget.motorista!.copyWith(
          nome: _nomeController.text.trim(),
          telefone: _telefoneController.text.trim(),
          cnh: _cnhController.text.trim(),
          placaVeiculo: _placaController.text.trim(),
        ),
      );
    } else {
      await widget.repository.add(
        nome: _nomeController.text.trim(),
        telefone: _telefoneController.text.trim(),
        cnh: _cnhController.text.trim(),
        placaVeiculo: _placaController.text.trim(),
      );
    }

    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _excluir() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir motorista'),
        content: Text('Deseja excluir "${widget.motorista!.nome}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      await widget.repository.delete(widget.motorista!.id);
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Editar motorista' : 'Novo motorista'),
        actions: [
          if (_isEditing)
            IconButton(
              onPressed: _excluir,
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Excluir',
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nomeController,
              decoration: const InputDecoration(labelText: 'Nome *'),
              textCapitalization: TextCapitalization.words,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Informe o nome' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _telefoneController,
              decoration: const InputDecoration(labelText: 'Telefone'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cnhController,
              decoration: const InputDecoration(labelText: 'CNH'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _placaController,
              decoration: const InputDecoration(labelText: 'Placa do veículo'),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _salvar,
              child: const Text('Salvar'),
            ),
          ],
        ),
      ),
    );
  }
}
