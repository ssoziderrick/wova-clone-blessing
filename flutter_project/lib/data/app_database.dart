import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/models.dart';

class AppDatabase {
  static Database? _db;
  static Future<Database> open(String passphrase) async {
    if (_db != null) return _db!;
    final dir = await getApplicationDocumentsDirectory();
    final path = p.join(dir.path, 'car_bond.db');
    _db = await openDatabase(
      path,
      password: passphrase,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE cars(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            make TEXT NOT NULL, model TEXT NOT NULL, year INTEGER NOT NULL,
            color TEXT, plate TEXT NOT NULL, vin TEXT, engine_number TEXT,
            buying_price REAL NOT NULL, selling_price REAL NOT NULL,
            date_purchased TEXT NOT NULL, status TEXT NOT NULL,
            notes TEXT, created_at TEXT NOT NULL
          );
        ''');
        await db.execute('''
          CREATE TABLE buyers(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL, phone TEXT NOT NULL, nin TEXT,
            address TEXT, occupation TEXT, emergency_contact TEXT,
            photo TEXT, created_at TEXT NOT NULL
          );
        ''');
        await db.execute('''
          CREATE TABLE hire_purchase(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            car_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL,
            selling_price REAL NOT NULL, deposit REAL NOT NULL,
            interest REAL NOT NULL, installment_amount REAL NOT NULL,
            frequency TEXT NOT NULL, start_date TEXT NOT NULL,
            end_date TEXT, number_of_installments INTEGER NOT NULL,
            status TEXT NOT NULL, created_at TEXT NOT NULL,
            FOREIGN KEY(car_id) REFERENCES cars(id),
            FOREIGN KEY(buyer_id) REFERENCES buyers(id)
          );
        ''');
        await db.execute('''
          CREATE TABLE payments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hp_id INTEGER NOT NULL, date TEXT NOT NULL,
            amount REAL NOT NULL, method TEXT NOT NULL,
            reference TEXT, notes TEXT, created_at TEXT NOT NULL,
            FOREIGN KEY(hp_id) REFERENCES hire_purchase(id)
          );
        ''');
        await db.execute('''
          CREATE TABLE settings(
            key TEXT PRIMARY KEY, value TEXT NOT NULL
          );
        ''');
        await db.execute('CREATE INDEX idx_cars_status ON cars(status);');
        await db.execute('CREATE INDEX idx_hp_status ON hire_purchase(status);');
        await db.execute('CREATE INDEX idx_payments_hp ON payments(hp_id);');
      },
    );
    return _db!;
  }

  static Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}

/// HP summary helper (paid/balance/next due/percent).
class HpSummary {
  final HirePurchase hp;
  final List<Payment> payments;
  final double totalDue, paid, balance, percent;
  final String nextDue;
  final bool isOverdue;
  HpSummary({
    required this.hp, required this.payments,
    required this.totalDue, required this.paid, required this.balance,
    required this.percent, required this.nextDue, required this.isOverdue,
  });
}

Future<HpSummary> computeHpSummary(Database db, int hpId) async {
  final hpRow = (await db.query('hire_purchase', where: 'id=?', whereArgs: [hpId])).first;
  final hp = HirePurchase.fromMap(hpRow);
  final payRows = await db.query('payments', where: 'hp_id=?', whereArgs: [hpId]);
  final pays = payRows.map(Payment.fromMap).toList();
  final totalDue = hp.sellingPrice + (hp.sellingPrice * hp.interest / 100.0);
  final paid = hp.deposit + pays.fold<double>(0, (a, p) => a + p.amount);
  final balance = (totalDue - paid).clamp(0, double.infinity).toDouble();
  final percent = totalDue > 0 ? (paid / totalDue * 100).clamp(0, 100).toDouble() : 0.0;
  final installmentsPaid = ((paid - hp.deposit) / hp.installmentAmount).floor().clamp(0, 1 << 30);
  final start = DateTime.parse(hp.startDate);
  DateTime next;
  final count = installmentsPaid + 1;
  switch (hp.frequency) {
    case Frequency.weekly:   next = start.add(Duration(days: 7 * count));  break;
    case Frequency.biweekly: next = start.add(Duration(days: 14 * count)); break;
    case Frequency.monthly:  next = DateTime(start.year, start.month + count, start.day); break;
  }
  final today = DateTime.now();
  final nextStr = next.toIso8601String().substring(0, 10);
  final isOverdue = balance > 0 && next.isBefore(DateTime(today.year, today.month, today.day));
  return HpSummary(hp: hp, payments: pays, totalDue: totalDue, paid: paid,
    balance: balance, percent: percent, nextDue: nextStr, isOverdue: isOverdue);
}
