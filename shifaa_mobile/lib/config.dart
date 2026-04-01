import 'dart:io';

import 'package:flutter/foundation.dart';

/// Laravel API origin (no `/api` suffix). Override with:
/// `flutter run --dart-define=API_ORIGIN=http://192.168.1.10:8000`
const String _kApiOriginEnv = String.fromEnvironment(
  'API_ORIGIN',
  defaultValue: '',
);

/// Base URL for HTTP calls. Android emulator uses 10.0.2.2 to reach host machine.
String get apiOrigin {
  if (_kApiOriginEnv.isNotEmpty) return _kApiOriginEnv.replaceAll(RegExp(r'/+$'), '');
  if (kIsWeb) return 'http://127.0.0.1:8000';
  if (Platform.isAndroid) return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

String get apiBaseUrl => '$apiOrigin/api';
