import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

import '../data/app_database.dart';
import '../models/models.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static const _channelId = 'carbond_reminders';

  static Future<void> init() async {
    tz.initializeTimeZones();
    await _plugin.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ));
  }

  static const _details = NotificationDetails(
    android: AndroidNotificationDetails(
      _channelId, 'HP Reminders',
      channelDescription: 'Hire Purchase payment reminders',
      importance: Importance.high, priority: Priority.high,
    ),
  );

  /// Schedules reminders for all active HPs based on `reminderDays` (e.g. [7,3,1,0]).
  static Future<void> scheduleAll(Database db, List<int> reminderDays) async {
    await _plugin.cancelAll();
    final hps = await db.query('hire_purchase', where: 'status IN (?,?)', whereArgs: ['active', 'overdue']);
    var id = 0;
    for (final row in hps) {
      final h = HirePurchase.fromMap(row);
      final s = await computeHpSummary(db, h.id!);
      if (s.balance <= 0) continue;
      final buyer = await db.query('buyers', where: 'id=?', whereArgs: [h.buyerId]);
      final name = buyer.isEmpty ? 'Buyer' : buyer.first['full_name'];
      final due = DateTime.parse(s.nextDue);
      for (final d in reminderDays) {
        final when = due.subtract(Duration(days: d));
        final scheduled = tz.TZDateTime(tz.local, when.year, when.month, when.day, 9, 0);
        if (scheduled.isBefore(tz.TZDateTime.now(tz.local))) continue;
        await _plugin.zonedSchedule(
          id++,
          'Reminder',
          "$name's HP payment of UGX ${h.installmentAmount.toStringAsFixed(0)} is due ${_label(d)}.",
          scheduled,
          _details,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
        );
      }
    }
  }

  static String _label(int d) {
    if (d == 0) return 'today';
    if (d == 1) return 'tomorrow';
    return 'in $d days';
  }

  static Future<void> completion(String buyerName) async {
    await _plugin.show(99999, 'Agreement completed',
        '$buyerName has fully paid their HP. 🎉', _details);
  }
}
