import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import '../../data/cliente_repository.dart';
import '../../data/configuracoes_repository.dart';
import '../../data/frete_repository.dart';
import '../../models/frete.dart';
import '../../services/relatorio_pdf_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_chip.dart';
import 'imposto_screen.dart';

class RelatorioScreen extends StatefulWidget {
  final FreteRepository freteRepository;
  final ClienteRepository clienteRepository;
  final ConfiguracoesRepository configuracoesRepository;

  const RelatorioScreen({
    super.key,
    required this.freteRepository,
    required this.clienteRepository,
    required this.configuracoesRepository,
  });

  @override
  State<RelatorioScreen> createState() => _RelatorioScreenState();
}

class _RelatorioScreenState extends State<RelatorioScreen> {
  late DateTimeRange _periodo;
  FreteStatus? _filtroStatus;
  bool _gerandoPdf = false;

  @override
  void initState() {
    super.initState();
    final hoje = DateTime.now();
    _periodo = DateTimeRange(
      start: DateTime(hoje.year, hoje.month, 1),
      end: hoje,
    );
  }

  Future<void> _selecionarPeriodo() async {
    final selecionado = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDateRange: _periodo,
    );
    if (selecionado != null) {
      setState(() => _periodo = selecionado);
    }
  }

  bool _dentroDoPeriodo(DateTime data) {
    final dia = DateUtils.dateOnly(data);
    final inicio = DateUtils.dateOnly(_periodo.start);
    final fim = DateUtils.dateOnly(_periodo.end);
    return !dia.isBefore(inicio) && !dia.isAfter(fim);
  }

  List<Frete> _fretesFiltrados() {
    return widget.freteRepository
        .getAll()
        .where((f) => _dentroDoPeriodo(f.data))
        .where((f) => _filtroStatus == null || f.status == _filtroStatus)
        .toList();
  }

  Future<void> _compartilharPdf() async {
    setState(() => _gerandoPdf = true);
    try {
      final bytes = await RelatorioPdfService().gerar(
        fretes: _fretesFiltrados(),
        clienteRepository: widget.clienteRepository,
        configuracoesRepository: widget.configuracoesRepository,
        inicio: _periodo.start,
        fim: _periodo.end,
      );
      await Printing.sharePdf(bytes: bytes, filename: 'relatorio_fretes.pdf');
    } finally {
      if (mounted) setState(() => _gerandoPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Relatórios'),
        actions: [
          _gerandoPdf
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : IconButton(
                  onPressed: _compartilharPdf,
                  icon: const Icon(Icons.picture_as_pdf_outlined),
                  tooltip: 'Compartilhar relatório em PDF',
                ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) =>
                    ImpostoScreen(repository: widget.configuracoesRepository),
              ),
            ),
            icon: const Icon(Icons.percent),
            tooltip: 'Configurar imposto',
          ),
        ],
      ),
      body: ValueListenableBuilder(
        valueListenable: widget.configuracoesRepository.listenable(),
        builder: (context, _, _) {
          return ValueListenableBuilder(
            valueListenable: widget.freteRepository.listenable(),
            builder: (context, _, _) {
              final fretes = _fretesFiltrados();

              final totalNF = fretes.fold(0.0, (soma, f) => soma + f.valorFrete);
              final totalAReceber = fretes.fold(
                0.0,
                (soma, f) =>
                    soma + widget.configuracoesRepository.calcularValorAReceber(f.valorFrete),
              );

              return Column(
                children: [
                  Card(
                    margin: const EdgeInsets.all(12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${formatDate(_periodo.start)} - ${formatDate(_periodo.end)}',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              TextButton.icon(
                                onPressed: _selecionarPeriodo,
                                icon: const Icon(Icons.date_range),
                                label: const Text('Alterar período'),
                              ),
                            ],
                          ),
                          const Divider(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total NF'),
                              Text(formatCurrency(totalNF)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Total a receber (fator ${widget.configuracoesRepository.fatorImposto})',
                              ),
                              Text(
                                formatCurrency(totalAReceber),
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ChoiceChip(
                            label: const Text('Todos'),
                            selected: _filtroStatus == null,
                            onSelected: (_) => setState(() => _filtroStatus = null),
                          ),
                          const SizedBox(width: 8),
                          for (final status in FreteStatus.values) ...[
                            ChoiceChip(
                              label: Text(status.label),
                              selected: _filtroStatus == status,
                              onSelected: (_) => setState(() => _filtroStatus = status),
                            ),
                            const SizedBox(width: 8),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: fretes.isEmpty
                        ? const EmptyState(
                            icon: Icons.receipt_long_outlined,
                            message: 'Nenhum frete encontrado nesse período.',
                          )
                        : ListView.separated(
                            itemCount: fretes.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final frete = fretes[index];
                              final cliente =
                                  widget.clienteRepository.getById(frete.clienteId);
                              final valorAReceber = widget.configuracoesRepository
                                  .calcularValorAReceber(frete.valorFrete);

                              return ListTile(
                                title: Text('${frete.origem} → ${frete.destino}'),
                                subtitle: Text(
                                  '${cliente?.nome ?? 'Cliente removido'} • '
                                  '${formatDate(frete.data)}'
                                  '${frete.numeroNF.isNotEmpty ? ' • NF ${frete.numeroNF}' : ''}',
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('NF: ${formatCurrency(frete.valorFrete)}'),
                                    Text(
                                      'Receber: ${formatCurrency(valorAReceber)}',
                                      style: const TextStyle(
                                        color: Colors.green,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    StatusChip(status: frete.status),
                                  ],
                                ),
                                isThreeLine: false,
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
