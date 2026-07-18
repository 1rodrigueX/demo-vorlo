import 'package:flutter/material.dart';

import '../../data/cliente_repository.dart';
import '../../data/configuracoes_repository.dart';
import '../../data/frete_repository.dart';
import '../../data/motorista_repository.dart';
import '../../models/cliente.dart';
import '../../models/frete.dart';
import '../../models/motorista.dart';
import '../../services/distance_service.dart';
import '../../utils/formatters.dart';

class FreteFormScreen extends StatefulWidget {
  final FreteRepository repository;
  final ClienteRepository clienteRepository;
  final MotoristaRepository motoristaRepository;
  final ConfiguracoesRepository configuracoesRepository;
  final Frete? frete;

  const FreteFormScreen({
    super.key,
    required this.repository,
    required this.clienteRepository,
    required this.motoristaRepository,
    required this.configuracoesRepository,
    this.frete,
  });

  @override
  State<FreteFormScreen> createState() => _FreteFormScreenState();
}

class _FreteFormScreenState extends State<FreteFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _distanceService = DistanceService();

  late final TextEditingController _origemController;
  late final TextEditingController _destinoController;
  late final TextEditingController _distanciaController;
  late final TextEditingController _valorPorKmController;
  late final TextEditingController _valorFixoController;
  late final TextEditingController _margemLucroController;
  late final TextEditingController _numeroNFController;
  late final TextEditingController _observacoesController;

  late final FocusNode _origemFocusNode;
  late final FocusNode _destinoFocusNode;

  String? _clienteId;
  String? _motoristaId;
  late DateTime _data;
  late bool _calcularPorKm;
  late FreteStatus _status;
  bool _calculandoDistancia = false;

  late final Future<void> _carregandoListas;
  List<Cliente> _clientes = [];
  List<Motorista> _motoristas = [];

  bool get _isEditing => widget.frete != null;

  @override
  void initState() {
    super.initState();
    _carregandoListas = _carregarListas();
    final frete = widget.frete;
    _origemController = TextEditingController(text: frete?.origem ?? '');
    _destinoController = TextEditingController(text: frete?.destino ?? '');
    _distanciaController = TextEditingController(
      text: frete != null && frete.distanciaKm != 0 ? frete.distanciaKm.toString() : '',
    );
    _valorPorKmController = TextEditingController(
      text: frete != null && frete.valorPorKm != 0 ? frete.valorPorKm.toString() : '',
    );
    _valorFixoController = TextEditingController(
      text: frete != null && !frete.calcularPorKm && frete.valorFrete != 0
          ? frete.valorFrete.toString()
          : '',
    );
    _margemLucroController = TextEditingController(
      text: frete != null && frete.margemLucroPercentual != 0
          ? frete.margemLucroPercentual.toString()
          : '',
    );
    _numeroNFController = TextEditingController(text: frete?.numeroNF ?? '');
    _observacoesController = TextEditingController(text: frete?.observacoes ?? '');

    _origemFocusNode = FocusNode()..addListener(_onEnderecoFocusChange);
    _destinoFocusNode = FocusNode()..addListener(_onEnderecoFocusChange);

    _clienteId = frete?.clienteId;
    _motoristaId = frete?.motoristaId;
    _data = frete?.data ?? DateTime.now();
    _calcularPorKm = frete?.calcularPorKm ?? true;
    _status = frete?.status ?? FreteStatus.cotacao;

    _distanciaController.addListener(_atualizarValorCalculado);
    _valorPorKmController.addListener(_atualizarValorCalculado);
    _valorFixoController.addListener(_atualizarValorCalculado);
    _margemLucroController.addListener(_atualizarValorCalculado);
  }

  @override
  void dispose() {
    _origemController.dispose();
    _destinoController.dispose();
    _distanciaController.dispose();
    _valorPorKmController.dispose();
    _valorFixoController.dispose();
    _margemLucroController.dispose();
    _numeroNFController.dispose();
    _observacoesController.dispose();
    _origemFocusNode.dispose();
    _destinoFocusNode.dispose();
    super.dispose();
  }

  Future<void> _carregarListas() async {
    final resultados = await Future.wait([
      widget.clienteRepository.getAll(),
      widget.motoristaRepository.getAll(),
    ]);
    if (!mounted) return;
    setState(() {
      _clientes = resultados[0] as List<Cliente>;
      _motoristas = resultados[1] as List<Motorista>;
    });
  }

  void _atualizarValorCalculado() => setState(() {});

  void _onEnderecoFocusChange() {
    if (!_origemFocusNode.hasFocus &&
        !_destinoFocusNode.hasFocus &&
        _calcularPorKm &&
        _origemController.text.trim().isNotEmpty &&
        _destinoController.text.trim().isNotEmpty) {
      _calcularDistanciaAutomaticamente();
    }
  }

  double get _distancia => double.tryParse(_distanciaController.text.replaceAll(',', '.')) ?? 0;
  double get _valorPorKm => double.tryParse(_valorPorKmController.text.replaceAll(',', '.')) ?? 0;
  double get _valorFixo => double.tryParse(_valorFixoController.text.replaceAll(',', '.')) ?? 0;
  double get _margemLucro =>
      double.tryParse(_margemLucroController.text.replaceAll(',', '.')) ?? 0;
  double get _valorBase => _calcularPorKm ? _distancia * _valorPorKm : _valorFixo;
  double get _valorFinal => _valorBase * (1 + _margemLucro / 100);

  Future<void> _calcularDistanciaAutomaticamente() async {
    final origem = _origemController.text.trim();
    final destino = _destinoController.text.trim();
    if (origem.isEmpty || destino.isEmpty || _calculandoDistancia) return;

    setState(() => _calculandoDistancia = true);
    final distancia = await _distanceService.calcularDistanciaKm(origem, destino);
    if (!mounted) return;
    setState(() => _calculandoDistancia = false);

    if (distancia == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Não foi possível calcular a distância automaticamente. Informe manualmente.',
          ),
        ),
      );
      return;
    }

    _distanciaController.text = distancia.toStringAsFixed(1);
  }

  Future<void> _selecionarData() async {
    final selecionada = await showDatePicker(
      context: context,
      initialDate: _data,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (selecionada != null) {
      setState(() => _data = selecionada);
    }
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;

    final frete = Frete(
      id: widget.frete?.id ?? '',
      clienteId: _clienteId!,
      motoristaId: _motoristaId!,
      origem: _origemController.text.trim(),
      destino: _destinoController.text.trim(),
      data: _data,
      distanciaKm: _calcularPorKm ? _distancia : 0,
      valorPorKm: _calcularPorKm ? _valorPorKm : 0,
      margemLucroPercentual: _margemLucro,
      valorFrete: _valorFinal,
      calcularPorKm: _calcularPorKm,
      status: _status,
      numeroNF: _numeroNFController.text.trim(),
      observacoes: _observacoesController.text.trim(),
    );

    if (_isEditing) {
      await widget.repository.update(frete);
    } else {
      await widget.repository.add(frete);
    }

    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _excluir() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir frete'),
        content: const Text('Deseja excluir este frete?'),
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
      await widget.repository.delete(widget.frete!.id);
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Editar frete' : 'Novo frete'),
        actions: [
          if (_isEditing)
            IconButton(
              onPressed: _excluir,
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Excluir',
            ),
        ],
      ),
      body: FutureBuilder<void>(
        future: _carregandoListas,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          return _buildForm(context);
        },
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final clientes = _clientes;
    final motoristas = _motoristas;
    final nfObrigatoria = _status == FreteStatus.concluido;

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
            if (clientes.isEmpty || motoristas.isEmpty)
              Card(
                color: Theme.of(context).colorScheme.errorContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    'Cadastre pelo menos um cliente e um motorista antes de criar um frete.',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onErrorContainer,
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _clienteId,
              decoration: const InputDecoration(labelText: 'Cliente *'),
              items: clientes
                  .map((c) => DropdownMenuItem(value: c.id, child: Text(c.nome)))
                  .toList(),
              onChanged: (value) => setState(() => _clienteId = value),
              validator: (value) => value == null ? 'Selecione um cliente' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _motoristaId,
              decoration: const InputDecoration(labelText: 'Motorista *'),
              items: motoristas
                  .map((m) => DropdownMenuItem(value: m.id, child: Text(m.nome)))
                  .toList(),
              onChanged: (value) => setState(() => _motoristaId = value),
              validator: (value) => value == null ? 'Selecione um motorista' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _origemController,
              focusNode: _origemFocusNode,
              decoration: const InputDecoration(labelText: 'Origem *'),
              textCapitalization: TextCapitalization.words,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Informe a origem' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _destinoController,
              focusNode: _destinoFocusNode,
              decoration: const InputDecoration(labelText: 'Destino *'),
              textCapitalization: TextCapitalization.words,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Informe o destino' : null,
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Data'),
              subtitle: Text(formatDate(_data)),
              trailing: const Icon(Icons.calendar_today),
              onTap: _selecionarData,
            ),
            const Divider(),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Calcular valor por km'),
              subtitle: const Text('Desative para informar um valor fixo'),
              value: _calcularPorKm,
              onChanged: (value) => setState(() => _calcularPorKm = value),
            ),
            const SizedBox(height: 8),
            if (_calcularPorKm) ...[
              TextFormField(
                controller: _distanciaController,
                decoration: InputDecoration(
                  labelText: 'Distância (km) *',
                  helperText:
                      'Preenchida automaticamente ao sair dos campos origem/destino',
                  suffixIcon: _calculandoDistancia
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : IconButton(
                          icon: const Icon(Icons.route),
                          tooltip: 'Calcular distância automaticamente',
                          onPressed: _calcularDistanciaAutomaticamente,
                        ),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) => _calcularPorKm && _distancia <= 0
                    ? 'Informe a distância'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _valorPorKmController,
                decoration: const InputDecoration(labelText: 'Valor por km (R\$) *'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) => _calcularPorKm && _valorPorKm <= 0
                    ? 'Informe o valor por km'
                    : null,
              ),
            ] else
              TextFormField(
                controller: _valorFixoController,
                decoration: const InputDecoration(labelText: 'Valor do frete (R\$) *'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) =>
                    !_calcularPorKm && _valorFixo <= 0 ? 'Informe o valor do frete' : null,
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _margemLucroController,
              decoration: const InputDecoration(
                labelText: 'Margem de lucro desejada (%)',
                helperText: 'Percentual aplicado sobre o valor base do frete',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Valor base'),
                        Text(formatCurrency(_valorBase)),
                      ],
                    ),
                    if (_margemLucro != 0) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Lucro (${_margemLucro.toStringAsFixed(1)}%)'),
                          Text(formatCurrency(_valorFinal - _valorBase)),
                        ],
                      ),
                    ],
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Valor final do frete (NF)'),
                        Text(
                          formatCurrency(_valorFinal),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Valor a receber (fator ${widget.configuracoesRepository.fatorImposto})',
                        ),
                        Text(
                          formatCurrency(
                            widget.configuracoesRepository
                                .calcularValorAReceber(_valorFinal),
                          ),
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<FreteStatus>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: FreteStatus.values
                  .map((s) => DropdownMenuItem(value: s, child: Text(s.label)))
                  .toList(),
              onChanged: (value) => setState(() => _status = value ?? _status),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _numeroNFController,
              decoration: InputDecoration(
                labelText: nfObrigatoria ? 'Número da NF *' : 'Número da NF',
                helperText: 'Obrigatório para concluir o frete',
              ),
              validator: (value) => nfObrigatoria && (value == null || value.trim().isEmpty)
                  ? 'Informe o número da NF para concluir o frete'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _observacoesController,
              decoration: const InputDecoration(labelText: 'Observações'),
              textCapitalization: TextCapitalization.sentences,
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: clientes.isEmpty || motoristas.isEmpty ? null : _salvar,
              child: const Text('Salvar'),
            ),
          ],
        ),
      );
  }
}



