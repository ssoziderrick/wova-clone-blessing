import 'dart:io';
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

class ExportService {
  static Future<File> toPdf(String title, List<String> headers, List<List<String>> rows) async {
    final doc = pw.Document();
    doc.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      build: (_) => [
        pw.Text(title, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 6),
        pw.Text(DateTime.now().toString().substring(0, 19), style: const pw.TextStyle(fontSize: 10)),
        pw.SizedBox(height: 12),
        pw.Table.fromTextArray(
          headers: headers, data: rows,
          headerStyle: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold),
          headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF1E3A8A)),
          cellStyle: const pw.TextStyle(fontSize: 9),
        ),
      ],
    ));
    final dir = await getTemporaryDirectory();
    final f = File('${dir.path}/${title.replaceAll(' ', '_')}.pdf');
    await f.writeAsBytes(await doc.save());
    await Share.shareXFiles([XFile(f.path)], text: title);
    return f;
  }

  static Future<File> toExcel(String title, List<String> headers, List<List<String>> rows) async {
    final excel = Excel.createExcel();
    final sheet = excel[title.length > 31 ? title.substring(0, 31) : title];
    sheet.appendRow(headers.map((h) => TextCellValue(h)).toList());
    for (final r in rows) {
      sheet.appendRow(r.map((c) => TextCellValue(c)).toList());
    }
    final dir = await getTemporaryDirectory();
    final f = File('${dir.path}/${title.replaceAll(' ', '_')}.xlsx');
    await f.writeAsBytes(excel.encode()!);
    await Share.shareXFiles([XFile(f.path)], text: title);
    return f;
  }
}
