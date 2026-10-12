import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages PIN (hashed), biometric unlock, inactivity lock, and DB passphrase.
class AuthService {
  static const _pinKey = 'pin_hash';
  static const _saltKey = 'db_salt';
  static const _bioKey = 'bio_enabled';
  static const inactivity = Duration(minutes: 3);

  final _bio = LocalAuthentication();

  Future<bool> hasPin() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_pinKey) != null;
  }

  String _hash(String pin) => sha256.convert(utf8.encode('$pin:carbond-salt')).toString();

  Future<void> setPin(String pin) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_pinKey, _hash(pin));
    if (!p.containsKey(_saltKey)) {
      await p.setString(_saltKey, DateTime.now().microsecondsSinceEpoch.toString());
    }
  }

  Future<bool> verifyPin(String pin) async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_pinKey) == _hash(pin);
  }

  Future<bool> changePin(String oldPin, String newPin) async {
    if (!await verifyPin(oldPin)) return false;
    await setPin(newPin);
    return true;
  }

  /// Stable DB passphrase. PIN unlocks the app; the DB key never changes
  /// when the PIN changes (avoiding a rekey on every PIN update).
  Future<String> dbPassphrase() async {
    final p = await SharedPreferences.getInstance();
    final salt = p.getString(_saltKey) ?? 'default-salt';
    return sha256.convert(utf8.encode('carbond:$salt')).toString();
  }

  Future<bool> biometricEnabled() async =>
      (await SharedPreferences.getInstance()).getBool(_bioKey) ?? false;
  Future<void> setBiometricEnabled(bool v) async =>
      (await SharedPreferences.getInstance()).setBool(_bioKey, v);

  Future<bool> tryBiometric() async {
    try {
      final supported = await _bio.canCheckBiometrics;
      if (!supported) return false;
      return await _bio.authenticate(
        localizedReason: 'Unlock Car Bond Manager',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );
    } catch (_) {
      return false;
    }
  }
}
