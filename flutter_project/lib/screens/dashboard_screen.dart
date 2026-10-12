import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Car Bond Manager')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _Row(children: [
            _StatCard(icon: Icons.directions_car, label: 'Cars in Stock', value: '—', color: Color(0xFF1E3A8A)),
            _StatCard(icon: Icons.trending_up, label: 'Sold this month', value: '—', color: Color(0xFF2E7D5B)),
          ]),
          SizedBox(height: 12),
          _Row(children: [
            _StatCard(icon: Icons.account_balance_wallet, label: 'On HP', value: '—', color: Color(0xFFE63027)),
            _StatCard(icon: Icons.warning_amber, label: 'Overdue', value: '—', color: Color(0xFFC53030)),
          ]),
          SizedBox(height: 16),
          Text('Wire this up to HpRepository.summary() for live stats.',
            style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final List<Widget> children;
  const _Row({required this.children});
  @override
  Widget build(BuildContext context) =>
      Row(children: children.map((c) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: c))).toList());
}

class _StatCard extends StatelessWidget {
  final IconData icon; final String label, value; final Color color;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color),
        ),
        const SizedBox(height: 10),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
      ]),
    ),
  );
}
