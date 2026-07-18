import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/tenant_context.dart';
import '../home_shell.dart';
import 'entitlement_blocked_screen.dart';
import 'login_screen.dart';

/// Decide entre login, "sem acesso" e o app de verdade, reagindo a
/// mudanças de sessão (login/logout) automaticamente.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? _lastUserId;
  Future<bool>? _entitlementFuture;

  Future<bool> _verificarAcesso() async {
    final temAcesso =
        await Supabase.instance.client.rpc('current_tenant_has_transportadora') as bool;
    if (temAcesso) {
      await TenantContext.instance.load();
    }
    return temAcesso;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      initialData: AuthState(
        AuthChangeEvent.initialSession,
        Supabase.instance.client.auth.currentSession,
      ),
      builder: (context, snapshot) {
        final session = snapshot.data?.session;

        if (session == null) {
          _lastUserId = null;
          _entitlementFuture = null;
          TenantContext.instance.clear();
          return const LoginScreen();
        }

        if (_lastUserId != session.user.id) {
          _lastUserId = session.user.id;
          _entitlementFuture = _verificarAcesso();
        }

        return FutureBuilder<bool>(
          future: _entitlementFuture,
          builder: (context, entitlementSnapshot) {
            if (entitlementSnapshot.connectionState != ConnectionState.done) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }
            if (entitlementSnapshot.data == true) {
              return const HomeShell();
            }
            return const EntitlementBlockedScreen();
          },
        );
      },
    );
  }
}
