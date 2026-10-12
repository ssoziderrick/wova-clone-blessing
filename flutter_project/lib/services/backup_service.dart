import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

class BackupService {
  static Future<File> backup(Database db) async {
    final data = {
      'cars': await db.query('cars'),
      'buyers': await db.query('buyers'),
      'hire_purchase': await db.query('hire_purchase'),
      'payments': await db.query('payments'),
      'settings': await db.query('settings'),
    };
    final dir = await getTemporaryDirectory();
    final f = File('${dir.path}/carbond_backup_${DateTime.now().millisecondsSinceEpoch}.json');
    await f.writeAsString(jsonEncode(data));
    await Share.shareXFiles([XFile(f.path)], text: 'Car Bond Manager backup');
    return f;
  }

  static Future<void> restore(Database db, File file) async {
    final data = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    await db.transaction((txn) async {
      for (final table in ['cars', 'buyers', 'hire_purchase', 'payments', 'settings']) {
        await txn.delete(table);
        final rows = (data[table] as List?) ?? [];
        for (final r in rows) {
          await txn.insert(table, Map<String, Object?>.from(r as Map));
        }
      }
    });
  }
}
