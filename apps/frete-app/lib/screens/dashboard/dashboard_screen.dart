import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/cliente_repository.dart';
import '../../data/configuracoes_repository.dart';
import '../../data/frete_repository.dart';
import '../../data/motorista_repository.dart';
import '../../models/frete.dart';
import '../../utils/formatters.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_chip.dart';
import '../fretes/frete_form_screen.dart';

class DashboardScreen extends StatefulWidget {
  final FreteRepository freteRepository;
  final ClienteRepository clienteRepository;
  final MotoristaRepository motoristaRepository;
  final ConfiguracoesRepository configuracoesRepository;

  const DashboardScreen({
    super.key,
    required this.freteRepository,
    required this.clienteRepository,
    required this.motoristaRepository,
    required this.configuracoesRepository,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Frete App'),
        actions: [
          IconButton(
            onPressed: () => Supabase.instance.client.auth.signOut(),
            icon: const Icon(Icons.logout),
            tooltip: 'Sair',
          ),
        ],
      ),
      body: ValueListenableBuilder(
        valueListenable: widget.freteRepository.version,
        builder: (context, _, _) {
          return FutureBuilder<List<Frete>>(
            future: widget.freteRepository.getAll(),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text('Erro ao carregar fretes: ${snapshot.error}'));
              }

              final fretes = snapshot.data ?? [];
              final valorConcluidos = widget.freteRepository.valorTotal(
                fretes,
                statusPermitidos: [FreteStatus.concluido],
              );
              final emCotacao =
                  widget.freteRepository.contarPorStatus(fretes, FreteStatus.cotacao);
              final emAndamento =
                  widget.freteRepository.contarPorStatus(fretes, FreteStatus.emAndamento);
              final recentes = fretes.take(5).toList();

              return RefreshIndicator(
                onRefresh: () async => setState(() {}),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _ResumoCard(
                            titulo: 'Total de fretes',
                            valor: '${fretes.length}',
                            icone: Icons.local_shipping,
                            cor: Colors.deepPurple,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _ResumoCard(
                            titulo: 'Faturamento (concluídos)',
                            valor: formatCurrency(valorConcluidos),
                            icone: Icons.attach_money,
                            cor: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _ResumoCard(
                            titulo: 'Em cotação',
                            valor: '$emCotacao',
                            icone: Icons.hourglass_empty,
                            cor: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _ResumoCard(
                            titulo: 'Em andamento',
                            valor: '$emAndamento',
                            icone: Icons.route,
                            cor: Colors.blue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text('Fretes recentes', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (recentes.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: EmptyState(
                          icon: Icons.inbox_outlined,
                          message: 'Nenhum frete cadastrado ainda.',
                        ),
                      )
                    else
                      Card(
                        child: Column(
                          children: [
                            for (final frete in recentes)
                              ListTile(
                                title: Text('${frete.origem} → ${frete.destino}'),
                                subtitle: Text(formatDate(frete.data)),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(formatCurrency(frete.valorFrete)),
                                    const SizedBox(height: 4),
                                    StatusChip(status: frete.status),
                                  ],
                                ),
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (context) => FreteFormScreen(
                                      repository: widget.freteRepository,
                                      clienteRepository: widget.clienteRepository,
                                      motoristaRepository: widget.motoristaRepository,
                                      configuracoesRepository: widget.configuracoesRepository,
                                      frete: frete,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab-dashboard',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => FreteFormScreen(
              repository: widget.freteRepository,
              clienteRepository: widget.clienteRepository,
              motoristaRepository: widget.motoristaRepository,
              configuracoesRepository: widget.configuracoesRepository,
            ),
          ),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Novo frete'),
      ),
    );
  }
}

class _ResumoCard extends StatelessWidget {
  final String titulo;
  final String valor;
  final IconData icone;
  final Color cor;

  const _ResumoCard({
    required this.titulo,
    required this.valor,
    required this.icone,
    required this.cor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icone, color: cor),
            const SizedBox(height: 8),
            Text(
              valor,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              titulo,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
