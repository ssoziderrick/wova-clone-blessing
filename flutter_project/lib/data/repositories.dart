import 'package:sqflite_sqlcipher/sqflite.dart';
import '../models/models.dart';
import 'app_database.dart';

class CarRepository {
  final Database db;
  CarRepository(this.db);
  Future<int> insert(Car c) => db.insert('cars', c.toMap()..remove('id'));
  Future<int> update(Car c) => db.update('cars', c.toMap(), where: 'id=?', whereArgs: [c.id]);
  Future<int> delete(int id) => db.delete('cars', where: 'id=?', whereArgs: [id]);
  Future<List<Car>> all() async =>
      (await db.query('cars', orderBy: 'created_at DESC')).map(Car.fromMap).toList();
  Future<Car?> byId(int id) async {
    final r = await db.query('cars', where: 'id=?', whereArgs: [id]);
    return r.isEmpty ? null : Car.fromMap(r.first);
  }
}

class BuyerRepository {
  final Database db;
  BuyerRepository(this.db);
  Future<int> insert(Buyer b) => db.insert('buyers', b.toMap()..remove('id'));
  Future<int> update(Buyer b) => db.update('buyers', b.toMap(), where: 'id=?', whereArgs: [b.id]);
  Future<int> delete(int id) => db.delete('buyers', where: 'id=?', whereArgs: [id]);
  Future<List<Buyer>> all() async =>
      (await db.query('buyers', orderBy: 'full_name')).map(Buyer.fromMap).toList();
  Future<Buyer?> byId(int id) async {
    final r = await db.query('buyers', where: 'id=?', whereArgs: [id]);
    return r.isEmpty ? null : Buyer.fromMap(r.first);
  }
}

class HpRepository {
  final Database db;
  HpRepository(this.db);
  Future<int> insert(HirePurchase h) => db.insert('hire_purchase', h.toMap()..remove('id'));
  Future<List<HirePurchase>> all() async =>
      (await db.query('hire_purchase')).map(HirePurchase.fromMap).toList();
  Future<HpSummary> summary(int id) => computeHpSummary(db, id);
  Future<int> setStatus(int id, HpStatus s) =>
      db.update('hire_purchase', {'status': s.name}, where: 'id=?', whereArgs: [id]);
}

class PaymentRepository {
  final Database db;
  PaymentRepository(this.db);
  Future<int> insert(Payment p) => db.insert('payments', p.toMap()..remove('id'));
  Future<List<Payment>> forHp(int hpId) async =>
      (await db.query('payments', where: 'hp_id=?', whereArgs: [hpId], orderBy: 'date DESC'))
          .map(Payment.fromMap).toList();
}
