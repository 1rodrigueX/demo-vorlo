import 'dart:convert';

import 'package:http/http.dart' as http;

class _LatLng {
  final double lat;
  final double lon;

  const _LatLng(this.lat, this.lon);
}

/// Calcula a distância rodoviária entre dois endereços usando serviços
/// públicos e gratuitos do OpenStreetMap (Nominatim para geocodificação e
/// OSRM para roteirização) — não requer chave de API.
class DistanceService {
  static const _userAgent = 'frete_app/1.0 (uso pessoal)';

  Future<_LatLng?> _geocode(String endereco) async {
    final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
      'q': endereco,
      'format': 'json',
      'limit': '1',
    });

    final response = await http.get(uri, headers: {'User-Agent': _userAgent});
    if (response.statusCode != 200) return null;

    final results = jsonDecode(response.body) as List;
    if (results.isEmpty) return null;

    final primeiro = results.first as Map<String, dynamic>;
    final lat = double.tryParse(primeiro['lat'] as String? ?? '');
    final lon = double.tryParse(primeiro['lon'] as String? ?? '');
    if (lat == null || lon == null) return null;

    return _LatLng(lat, lon);
  }

  /// Retorna a distância em km entre [origem] e [destino], ou `null` se
  /// algum dos endereços não puder ser localizado ou a rota não puder ser
  /// calculada.
  Future<double?> calcularDistanciaKm(String origem, String destino) async {
    final pontoOrigem = await _geocode(origem);
    if (pontoOrigem == null) return null;

    // Respeita a política de uso do Nominatim (máx. ~1 req/s).
    await Future.delayed(const Duration(seconds: 1));

    final pontoDestino = await _geocode(destino);
    if (pontoDestino == null) return null;

    final uri = Uri.https(
      'router.project-osrm.org',
      '/route/v1/driving/'
          '${pontoOrigem.lon},${pontoOrigem.lat};'
          '${pontoDestino.lon},${pontoDestino.lat}',
      {'overview': 'false'},
    );

    final response = await http.get(uri);
    if (response.statusCode != 200) return null;

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data['code'] != 'Ok') return null;

    final rotas = data['routes'] as List?;
    if (rotas == null || rotas.isEmpty) return null;

    final metros = (rotas.first as Map<String, dynamic>)['distance'] as num;
    return metros / 1000;
  }
}
