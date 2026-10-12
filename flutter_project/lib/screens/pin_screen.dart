import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'splash_screen.dart' show authProvider;

class PinScreen extends ConsumerStatefulWidget {
  final bool create;
  final Future<void> Function(String pin) onUnlocked;
  const PinScreen({super.key, required this.create, required this.onUnlocked});
  @override
  ConsumerState<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends ConsumerState<PinScreen> {
  String _pin = '';
  String _confirm = '';
  bool _confirming = false;
  String? _error;

  void _press(String d) async {
    setState(() => _error = null);
    final current = _confirming ? _confirm : _pin;
    if (current.length >= 4) return;
    setState(() {
      if (_confirming) _confirm += d; else _pin += d;
    });
    final c = _confirming ? _confirm : _pin;
    if (c.length == 4) await _handle();
  }

  Future<void> _handle() async {
    final auth = ref.read(authProvider);
    if (widget.create) {
      if (!_confirming) {
        setState(() => _confirming = true);
        return;
      }
      if (_pin != _confirm) {
        setState(() { _error = "PINs don't match"; _pin = ''; _confirm = ''; _confirming = false; });
        return;
      }
      await auth.setPin(_pin);
      await widget.onUnlocked(_pin);
    } else {
      final ok = await auth.verifyPin(_pin);
      if (ok) {
        await widget.onUnlocked(_pin);
      } else {
        setState(() { _error = 'Incorrect PIN'; _pin = ''; });
      }
    }
  }

  void _back() => setState(() {
    if (_confirming) { _confirm = _confirm.isEmpty ? _confirm : _confirm.substring(0, _confirm.length - 1); }
    else { _pin = _pin.isEmpty ? _pin : _pin.substring(0, _pin.length - 1); }
  });

  @override
  Widget build(BuildContext context) {
    final filled = _confirming ? _confirm.length : _pin.length;
    final title = widget.create
        ? (_confirming ? 'Confirm your PIN' : 'Create a 4-digit PIN')
        : 'Enter your PIN';
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      body: SafeArea(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        ClipOval(child: Image.asset('assets/logo.jpeg', width: 72, height: 72, fit: BoxFit.cover)),
        const SizedBox(height: 10),
        const Text('Car Bond Manager', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text(title, style: const TextStyle(color: Colors.white70)),
        const SizedBox(height: 24),
        Row(mainAxisSize: MainAxisSize.min, children: List.generate(4, (i) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 8),
          width: 16, height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white70, width: 2),
            color: filled > i ? Colors.white : Colors.transparent,
          ),
        ))),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: Color(0xFFE63027)))),
        const SizedBox(height: 28),
        ..._buildPad(),
      ]))),
    );
  }

  List<Widget> _buildPad() {
    Widget btn(String label, VoidCallback onTap) => SizedBox(
      width: 72, height: 64,
      child: TextButton(
        onPressed: onTap,
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 22)),
      ),
    );
    return [
      for (final row in [['1','2','3'], ['4','5','6'], ['7','8','9']])
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [for (final d in row) btn(d, () => _press(d))]),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        const SizedBox(width: 72),
        btn('0', () => _press('0')),
        SizedBox(width: 72, height: 64, child: TextButton(onPressed: _back, child: const Icon(Icons.backspace, color: Colors.white))),
      ]),
    ];
  }
}
