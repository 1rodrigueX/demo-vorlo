import 'package:flutter/material.dart';

import '../data/cliente_repository.dart';
import '../data/configuracoes_repository.dart';
import '../data/frete_repository.dart';
import '../data/motorista_repository.dart';
import 'clientes/clientes_list_screen.dart';
import 'dashboard/dashboard_screen.dart';
import 'fretes/fretes_list_screen.dart';
import 'motoristas/motoristas_list_screen.dart';
import 'relatorios/relatorio_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final _clienteRepository = ClienteRepository();
  final _motoristaRepository = MotoristaRepository();
  final _freteRepository = FreteRepository();
  final _configuracoesRepository = ConfiguracoesRepository();
  late final Future<void> _carregandoConfiguracoes;

  int _index = 0;

  @override
  void initState() {
    super.initState();
    _carregandoConfiguracoes = _configuracoesRepository.carregar();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _carregandoConfiguracoes,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        return _buildShell(context);
      },
    );
  }

  Widget _buildShell(BuildContext context) {
    final telas = [
      DashboardScreen(
        freteRepository: _freteRepository,
        clienteRepository: _clienteRepository,
        motoristaRepository: _motoristaRepository,
        configuracoesRepository: _configuracoesRepository,
      ),
      FretesListScreen(
        repository: _freteRepository,
        clienteRepository: _clienteRepository,
        motoristaRepository: _motoristaRepository,
        configuracoesRepository: _configuracoesRepository,
      ),
      RelatorioScreen(
        freteRepository: _freteRepository,
        clienteRepository: _clienteRepository,
        configuracoesRepository: _configuracoesRepository,
      ),
      ClientesListScreen(repository: _clienteRepository),
      MotoristasListScreen(repository: _motoristaRepository),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: telas),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => setState(() => _index = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Início'),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            label: 'Fretes',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            label: 'Relatórios',
          ),
          NavigationDestination(icon: Icon(Icons.people_outline), label: 'Clientes'),
          NavigationDestination(
            icon: Icon(Icons.badge_outlined),
            label: 'Motoristas',
          ),
        ],
      ),
    );
  }
}
