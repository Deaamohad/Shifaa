import 'dart:io';

import 'package:flutter/foundation.dart';

/// Override at build time:
/// `flutter run --dart-define=API_ORIGIN=https://api.yourserver.com`
const String _kApiOriginEnv = String.fromEnvironment(
  'API_ORIGIN',
  defaultValue: '',
);

String get apiOrigin {
  if (_kApiOriginEnv.isNotEmpty) {
    return _kApiOriginEnv.replaceAll(RegExp(r'/+$'), '');
  }
  // Android emulator reaches the host machine via 10.0.2.2
  if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

String get apiBaseUrl => '$apiOrigin/api';
