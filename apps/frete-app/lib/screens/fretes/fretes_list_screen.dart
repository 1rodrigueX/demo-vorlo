import 'package:flutter/material.dart';

import '../../data/cliente_repository.dart';
import '../../data/configuracoes_repository.dart';
import '../../data/frete_repository.dart';
import '../../data/motorista_repository.dart';
import '../../models/frete.dart';
import '../../utils/formatters.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_chip.dart';
import 'frete_form_screen.dart';

class FretesListScreen extends StatefulWidget {
  final FreteRepository repository;
  final ClienteRepository clienteRepository;
  final MotoristaRepository motoristaRepository;
  final ConfiguracoesRepository configuracoesRepository;

  const FretesListScreen({
    super.key,
    required this.repository,
    required this.clienteRepository,
    required this.motoristaRepository,
    required this.configuracoesRepository,
  });

  @override
  State<FretesListScreen> createState() => _FretesListScreenState();
}

class _FretesListScreenState extends State<FretesListScreen> {
  FreteStatus? _filtro;
  DateTimeRange? _filtroData;

  Future<void> _selecionarFiltroData() async {
    final selecionado = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDateRange: _filtroData,
    );
    if (selecionado != null) {
      setState(() => _filtroData = selecionado);
    }
  }

  bool _dentroDoFiltroData(DateTime data) {
    if (_filtroData == null) return true;
    final dia = DateUtils.dateOnly(data);
    final inicio = DateUtils.dateOnly(_filtroData!.start);
    final fim = DateUtils.dateOnly(_filtroData!.end);
    return !dia.isBefore(inicio) && !dia.isAfter(fim);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fretes'),
        actions: [
          IconButton(
            onPressed: _selecionarFiltroData,
            icon: Icon(
              _filtroData == null ? Icons.date_range_outlined : Icons.date_range,
            ),
            tooltip: 'Filtrar por data',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  if (_filtroData != null) ...[
                    InputChip(
                      label: Text(
                        '${formatDate(_filtroData!.start)} - ${formatDate(_filtroData!.end)}',
                      ),
                      onDeleted: () => setState(() => _filtroData = null),
                    ),
                    const SizedBox(width: 8),
                  ],
                  ChoiceChip(
                    label: const Text('Todos'),
                    selected: _filtro == null,
                    onSelected: (_) => setState(() => _filtro = null),
                  ),
                  const SizedBox(width: 8),
                  for (final status in FreteStatus.values) ...[
                    ChoiceChip(
                      label: Text(status.label),
                      selected: _filtro == status,
                      onSelected: (_) => setState(() => _filtro = status),
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
          ),
          Expanded(
            child: ValueListenableBuilder(
              valueListenable: widget.repository.listenable(),
              builder: (context, _, _) {
                final fretes = widget.repository
                    .getAll()
                    .where((f) => _filtro == null || f.status == _filtro)
                    .where((f) => _dentroDoFiltroData(f.data))
                    .toList();

                if (fretes.isEmpty) {
                  return const EmptyState(
                    icon: Icons.local_shipping_outlined,
                    message: 'Nenhum frete encontrado.\nToque em "+" para adicionar.',
                  );
                }

                return ListView.separated(
                  itemCount: fretes.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final frete = fretes[index];
                    final cliente = widget.clienteRepository.getById(frete.clienteId);
                    return ListTile(
                      title: Text('${frete.origem} → ${frete.destino}'),
                      subtitle: Text(
                        '${cliente?.nome ?? 'Cliente removido'} • ${formatDate(frete.data)}',
                      ),
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
                            repository: widget.repository,
                            clienteRepository: widget.clienteRepository,
                            motoristaRepository: widget.motoristaRepository,
                            configuracoesRepository: widget.configuracoesRepository,
                            frete: frete,
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab-fretes-lista',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => FreteFormScreen(
              repository: widget.repository,
              clienteRepository: widget.clienteRepository,
              motoristaRepository: widget.motoristaRepository,
              configuracoesRepository: widget.configuracoesRepository,
            ),
          ),
        ),
        tooltip: 'Novo frete',
        child: const Icon(Icons.add),
      ),
    );
  }
}
