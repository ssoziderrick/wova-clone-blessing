import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../data/app_database.dart';
import 'pin_screen.dart';
import 'home_shell.dart';

final authProvider = Provider<AuthService>((_) => AuthService());

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashState();
}

class _SplashState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    await NotificationService.init();
    final auth = ref.read(authProvider);
    final hasPin = await auth.hasPin();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => PinScreen(create: !hasPin, onUnlocked: (pin) async {
        final pass = await auth.dbPassphrase();
        final db = await AppDatabase.open(pass);
        // Schedule reminders on every unlock.
        await NotificationService.scheduleAll(db, const [7, 3, 1, 0]);
        if (context.mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeShell()));
        }
      })),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ClipOval(child: Image.asset('assets/logo.jpeg', width: 140, height: 140, fit: BoxFit.cover)),
          const SizedBox(height: 16),
          const Text('Car Bond Manager', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Wova Rich Investments Ltd', style: TextStyle(color: Colors.white70, fontSize: 13)),
        ]),
      ),
    );
  }
}
