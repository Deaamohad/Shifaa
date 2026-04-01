import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class AuthService extends ChangeNotifier {
  AuthService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Accept': 'application/json'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final t = token;
          if (t != null) {
            options.headers['Authorization'] = 'Bearer $t';
          }
          return handler.next(options);
        },
        onError: (e, handler) {
          if (e.response?.statusCode == 401) {
            _clearMemory();
            _persist().then((_) => notifyListeners());
          }
          return handler.next(e);
        },
      ),
    );
  }

  late final Dio _dio;
  Dio get dio => _dio;

  String? token;
  Map<String, dynamic>? user;
  bool ready = false;

  String? get role => user?['role'] as String?;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString(_kTokenKey);
    final raw = prefs.getString(_kUserKey);
    if (raw != null) {
      try {
        user = jsonDecode(raw) as Map<String, dynamic>;
      } catch (_) {
        user = null;
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<String?> login(String email, String password) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/login',
        data: {'email': email.trim(), 'password': password},
      );
      final data = res.data;
      if (data == null) return 'Empty response';
      token = data['token'] as String?;
      final u = data['user'];
      if (u is Map<String, dynamic>) {
        user = u;
      } else if (u is Map) {
        user = Map<String, dynamic>.from(u);
      } else {
        return 'Invalid user payload';
      }
      await _persist();
      notifyListeners();
      return null;
    } on DioException catch (e) {
      return _dioErrorMessage(e);
    }
  }

  Future<void> logout() async {
    try {
      if (token != null) {
        await _dio.post('/logout');
      }
    } catch (_) {
      // still clear local session
    }
    _clearMemory();
    await _persist();
    notifyListeners();
  }

  void _clearMemory() {
    token = null;
    user = null;
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (token != null && user != null) {
      await prefs.setString(_kTokenKey, token!);
      await prefs.setString(_kUserKey, jsonEncode(user));
    } else {
      await prefs.remove(_kTokenKey);
      await prefs.remove(_kUserKey);
    }
  }

  static String _dioErrorMessage(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout) {
      return 'Cannot reach the API at $apiBaseUrl.\n'
          'Start the backend: cd shifaa-api && php artisan serve\n'
          'Or use: flutter run --dart-define=API_ORIGIN=http://YOUR_IP:8000';
    }
    final data = e.response?.data;
    if (data is Map) {
      final msg = data['message'];
      if (msg is String) return msg;
      final errs = data['errors'];
      if (errs is Map) {
        final parts = errs.values.expand((v) => v is List ? v.cast<Object>() : [v]);
        return parts.map((x) => x.toString()).join(' ');
      }
    }
    return e.message ?? 'Request failed';
  }
}

const _kTokenKey = 'shifaa_token';
const _kUserKey = 'shifaa_user';
