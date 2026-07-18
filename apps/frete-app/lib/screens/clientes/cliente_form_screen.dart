import 'package:flutter/material.dart';

import '../../data/cliente_repository.dart';
import '../../models/cliente.dart';

class ClienteFormScreen extends StatefulWidget {
  final ClienteRepository repository;
  final Cliente? cliente;

  const ClienteFormScreen({super.key, required this.repository, this.cliente});

  @override
  State<ClienteFormScreen> createState() => _ClienteFormScreenState();
}

class _ClienteFormScreenState extends State<ClienteFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nomeController;
  late final TextEditingController _telefoneController;
  late final TextEditingController _documentoController;
  late final TextEditingController _enderecoController;

  bool get _isEditing => widget.cliente != null;

  @override
  void initState() {
    super.initState();
    final cliente = widget.cliente;
    _nomeController = TextEditingController(text: cliente?.nome ?? '');
    _telefoneController = TextEditingController(text: cliente?.telefone ?? '');
    _documentoController = TextEditingController(text: cliente?.documento ?? '');
    _enderecoController = TextEditingController(text: cliente?.endereco ?? '');
  }

  @override
  void dispose() {
    _nomeController.dispose();
    _telefoneController.dispose();
    _documentoController.dispose();
    _enderecoController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;

    if (_isEditing) {
      await widget.repository.update(
        widget.cliente!.copyWith(
          nome: _nomeController.text.trim(),
          telefone: _telefoneController.text.trim(),
          documento: _documentoController.text.trim(),
          endereco: _enderecoController.text.trim(),
        ),
      );
    } else {
      await widget.repository.add(
        nome: _nomeController.text.trim(),
        telefone: _telefoneController.text.trim(),
        documento: _documentoController.text.trim(),
        endereco: _enderecoController.text.trim(),
      );
    }

    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _excluir() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir cliente'),
        content: Text('Deseja excluir "${widget.cliente!.nome}"?'),
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
      await widget.repository.delete(widget.cliente!.id);
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Editar cliente' : 'Novo cliente'),
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
              controller: _documentoController,
              decoration: const InputDecoration(labelText: 'CPF / CNPJ'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _enderecoController,
              decoration: const InputDecoration(labelText: 'Endereço'),
              textCapitalization: TextCapitalization.sentences,
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
