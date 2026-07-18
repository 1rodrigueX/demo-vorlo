import 'package:flutter/material.dart';

import '../../data/cliente_repository.dart';
import '../../widgets/empty_state.dart';
import 'cliente_form_screen.dart';

class ClientesListScreen extends StatefulWidget {
  final ClienteRepository repository;

  const ClientesListScreen({super.key, required this.repository});

  @override
  State<ClientesListScreen> createState() => _ClientesListScreenState();
}

class _ClientesListScreenState extends State<ClientesListScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Clientes')),
      body: ValueListenableBuilder(
        valueListenable: widget.repository.version,
        builder: (context, _, _) {
          return FutureBuilder(
            future: widget.repository.getAll(),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text('Erro ao carregar clientes: ${snapshot.error}'));
              }

              final clientes = snapshot.data ?? [];

              if (clientes.isEmpty) {
                return const EmptyState(
                  icon: Icons.people_outline,
                  message: 'Nenhum cliente cadastrado.\nToque em "+" para adicionar.',
                );
              }

              return ListView.separated(
                itemCount: clientes.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final cliente = clientes[index];
                  return ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        cliente.nome.isNotEmpty ? cliente.nome[0].toUpperCase() : '?',
                      ),
                    ),
                    title: Text(cliente.nome),
                    subtitle: Text(
                      [cliente.telefone, cliente.documento]
                          .where((s) => s.isNotEmpty)
                          .join(' • '),
                    ),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => ClienteFormScreen(
                          repository: widget.repository,
                          cliente: cliente,
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab-clientes',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => ClienteFormScreen(repository: widget.repository),
          ),
        ),
        tooltip: 'Novo cliente',
        child: const Icon(Icons.add),
      ),
    );
  }
}
