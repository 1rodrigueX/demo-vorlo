import 'package:flutter/material.dart';

import '../../data/configuracoes_repository.dart';
import '../../utils/formatters.dart';

class ImpostoScreen extends StatefulWidget {
  final ConfiguracoesRepository repository;

  const ImpostoScreen({super.key, required this.repository});

  @override
  State<ImpostoScreen> createState() => _ImpostoScreenState();
}

class _ImpostoScreenState extends State<ImpostoScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fatorController;

  @override
  void initState() {
    super.initState();
    _fatorController = TextEditingController(
      text: widget.repository.fatorImposto.toString(),
    );
    _fatorController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _fatorController.dispose();
    super.dispose();
  }

  double? get _fator {
    final valor = double.tryParse(_fatorController.text.replaceAll(',', '.'));
    if (valor == null || valor <= 0 || valor > 1) return null;
    return valor;
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    await widget.repository.setFatorImposto(_fator!);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fator de imposto salvo.')),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    const valorNfExemplo = 1000.0;
    final fatorExemplo = _fator ?? widget.repository.fatorImposto;

    return Scaffold(
      appBar: AppBar(title: const Text('Imposto')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'O valor da NF é emitido "bruto" para cobrir o imposto retido. '
              'O valor líquido que você realmente recebe é o valor da NF '
              'multiplicado por este fator.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _fatorController,
              decoration: const InputDecoration(
                labelText: 'Fator de imposto *',
                helperText: 'Entre 0 e 1. Padrão: 0.85 (imposto de 15%)',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (value) => _fator == null
                  ? 'Informe um valor entre 0 e 1 (ex: 0.85)'
                  : null,
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Exemplo com valor de NF de ${formatCurrency(valorNfExemplo)}:',
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Valor a receber'),
                        Text(
                          formatCurrency(valorNfExemplo * fatorExemplo),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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
