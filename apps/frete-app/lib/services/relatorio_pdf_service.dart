import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../data/cliente_repository.dart';
import '../data/configuracoes_repository.dart';
import '../models/frete.dart';
import '../utils/formatters.dart';

class RelatorioPdfService {
  Future<Uint8List> gerar({
    required List<Frete> fretes,
    required ClienteRepository clienteRepository,
    required ConfiguracoesRepository configuracoesRepository,
    required DateTime inicio,
    required DateTime fim,
  }) async {
    final doc = pw.Document();
    final fator = configuracoesRepository.fatorImposto;
    final clientes = await clienteRepository.getAll();
    final clientesPorId = {for (final c in clientes) c.id: c};

    final totalNF = fretes.fold(0.0, (soma, f) => soma + f.valorFrete);
    final totalAReceber = fretes.fold(
      0.0,
      (soma, f) => soma + configuracoesRepository.calcularValorAReceber(f.valorFrete),
    );

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        header: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'Relatório de fretes',
              style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
            ),
            pw.Text('Período: ${formatDate(inicio)} a ${formatDate(fim)}'),
            pw.SizedBox(height: 12),
          ],
        ),
        build: (context) => [
          pw.TableHelper.fromTextArray(
            headers: [
              'Data',
              'Origem -> Destino',
              'Cliente',
              'NF',
              'Status',
              'Valor NF',
              'A receber',
            ],
            data: fretes.map((frete) {
              final cliente = clientesPorId[frete.clienteId];
              return [
                formatDate(frete.data),
                '${frete.origem} -> ${frete.destino}',
                cliente?.nome ?? '-',
                frete.numeroNF.isEmpty ? '-' : frete.numeroNF,
                frete.status.label,
                formatCurrency(frete.valorFrete),
                formatCurrency(
                  configuracoesRepository.calcularValorAReceber(frete.valorFrete),
                ),
              ];
            }).toList(),
            cellStyle: const pw.TextStyle(fontSize: 9),
            headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
            cellAlignment: pw.Alignment.centerLeft,
          ),
          pw.SizedBox(height: 16),
          pw.Divider(),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.end,
            children: [
              pw.SizedBox(
                width: 220,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('Total NF'),
                        pw.Text(formatCurrency(totalNF)),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                          'Total a receber (fator $fator)',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                        pw.Text(
                          formatCurrency(totalAReceber),
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );

    return doc.save();
  }
}
