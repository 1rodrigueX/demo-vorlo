import 'package:flutter/material.dart';

import '../../data/motorista_repository.dart';
import '../../widgets/empty_state.dart';
import 'motorista_form_screen.dart';

class MotoristasListScreen extends StatefulWidget {
  final MotoristaRepository repository;

  const MotoristasListScreen({super.key, required this.repository});

  @override
  State<MotoristasListScreen> createState() => _MotoristasListScreenState();
}

class _MotoristasListScreenState extends State<MotoristasListScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Motoristas')),
      body: ValueListenableBuilder(
        valueListenable: widget.repository.listenable(),
        builder: (context, _, _) {
          final motoristas = widget.repository.getAll();

          if (motoristas.isEmpty) {
            return const EmptyState(
              icon: Icons.local_shipping_outlined,
              message: 'Nenhum motorista cadastrado.\nToque em "+" para adicionar.',
            );
          }

          return ListView.separated(
            itemCount: motoristas.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final motorista = motoristas[index];
              return ListTile(
                leading: CircleAvatar(
                  child: Text(
                    motorista.nome.isNotEmpty ? motorista.nome[0].toUpperCase() : '?',
                  ),
                ),
                title: Text(motorista.nome),
                subtitle: Text(
                  [motorista.telefone, motorista.placaVeiculo]
                      .where((s) => s.isNotEmpty)
                      .join(' • '),
                ),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => MotoristaFormScreen(
                      repository: widget.repository,
                      motorista: motorista,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab-motoristas',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => MotoristaFormScreen(repository: widget.repository),
          ),
        ),
        tooltip: 'Novo motorista',
        child: const Icon(Icons.add),
      ),
    );
  }
}
