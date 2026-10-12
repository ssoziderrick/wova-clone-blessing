enum CarStatus { inStock, reserved, soldCash, soldHp, soldCompleted }
enum HpStatus { active, completed, defaulted, overdue }
enum Frequency { weekly, biweekly, monthly }
enum PaymentMethod { cash, bank, mobileMoney }

class Car {
  final int? id;
  final String make, model, color, plate;
  final int year;
  final String? vin, engineNumber, notes;
  final double buyingPrice, sellingPrice;
  final String datePurchased; // ISO yyyy-MM-dd
  final CarStatus status;
  final String createdAt;
  const Car({
    this.id, required this.make, required this.model, required this.year,
    required this.color, required this.plate, this.vin, this.engineNumber,
    required this.buyingPrice, required this.sellingPrice,
    required this.datePurchased, required this.status, this.notes,
    required this.createdAt,
  });

  Map<String, Object?> toMap() => {
    'id': id, 'make': make, 'model': model, 'year': year, 'color': color,
    'plate': plate, 'vin': vin, 'engine_number': engineNumber,
    'buying_price': buyingPrice, 'selling_price': sellingPrice,
    'date_purchased': datePurchased, 'status': status.name,
    'notes': notes, 'created_at': createdAt,
  };

  factory Car.fromMap(Map<String, Object?> m) => Car(
    id: m['id'] as int?,
    make: m['make'] as String, model: m['model'] as String,
    year: m['year'] as int, color: m['color'] as String, plate: m['plate'] as String,
    vin: m['vin'] as String?, engineNumber: m['engine_number'] as String?,
    buyingPrice: (m['buying_price'] as num).toDouble(),
    sellingPrice: (m['selling_price'] as num).toDouble(),
    datePurchased: m['date_purchased'] as String,
    status: CarStatus.values.firstWhere((s) => s.name == m['status']),
    notes: m['notes'] as String?, createdAt: m['created_at'] as String,
  );
}

class Buyer {
  final int? id;
  final String fullName, phone;
  final String? nin, address, occupation, emergencyContact, photo;
  final String createdAt;
  const Buyer({this.id, required this.fullName, required this.phone, this.nin,
    this.address, this.occupation, this.emergencyContact, this.photo, required this.createdAt});

  Map<String, Object?> toMap() => {
    'id': id, 'full_name': fullName, 'phone': phone, 'nin': nin,
    'address': address, 'occupation': occupation,
    'emergency_contact': emergencyContact, 'photo': photo, 'created_at': createdAt,
  };
  factory Buyer.fromMap(Map<String, Object?> m) => Buyer(
    id: m['id'] as int?, fullName: m['full_name'] as String, phone: m['phone'] as String,
    nin: m['nin'] as String?, address: m['address'] as String?,
    occupation: m['occupation'] as String?, emergencyContact: m['emergency_contact'] as String?,
    photo: m['photo'] as String?, createdAt: m['created_at'] as String,
  );
}

class HirePurchase {
  final int? id;
  final int carId, buyerId, numberOfInstallments;
  final double sellingPrice, deposit, interest, installmentAmount;
  final Frequency frequency;
  final String startDate;
  final String? endDate;
  final HpStatus status;
  final String createdAt;
  const HirePurchase({
    this.id, required this.carId, required this.buyerId,
    required this.sellingPrice, required this.deposit, required this.interest,
    required this.installmentAmount, required this.frequency,
    required this.startDate, this.endDate, required this.numberOfInstallments,
    required this.status, required this.createdAt,
  });

  Map<String, Object?> toMap() => {
    'id': id, 'car_id': carId, 'buyer_id': buyerId,
    'selling_price': sellingPrice, 'deposit': deposit, 'interest': interest,
    'installment_amount': installmentAmount, 'frequency': frequency.name,
    'start_date': startDate, 'end_date': endDate,
    'number_of_installments': numberOfInstallments,
    'status': status.name, 'created_at': createdAt,
  };
  factory HirePurchase.fromMap(Map<String, Object?> m) => HirePurchase(
    id: m['id'] as int?,
    carId: m['car_id'] as int, buyerId: m['buyer_id'] as int,
    sellingPrice: (m['selling_price'] as num).toDouble(),
    deposit: (m['deposit'] as num).toDouble(),
    interest: (m['interest'] as num).toDouble(),
    installmentAmount: (m['installment_amount'] as num).toDouble(),
    frequency: Frequency.values.firstWhere((f) => f.name == m['frequency']),
    startDate: m['start_date'] as String, endDate: m['end_date'] as String?,
    numberOfInstallments: m['number_of_installments'] as int,
    status: HpStatus.values.firstWhere((s) => s.name == m['status']),
    createdAt: m['created_at'] as String,
  );
}

class Payment {
  final int? id;
  final int hpId;
  final String date;
  final double amount;
  final PaymentMethod method;
  final String? reference, notes;
  final String createdAt;
  const Payment({this.id, required this.hpId, required this.date,
    required this.amount, required this.method, this.reference, this.notes,
    required this.createdAt});

  Map<String, Object?> toMap() => {
    'id': id, 'hp_id': hpId, 'date': date, 'amount': amount,
    'method': method.name, 'reference': reference, 'notes': notes,
    'created_at': createdAt,
  };
  factory Payment.fromMap(Map<String, Object?> m) => Payment(
    id: m['id'] as int?, hpId: m['hp_id'] as int, date: m['date'] as String,
    amount: (m['amount'] as num).toDouble(),
    method: PaymentMethod.values.firstWhere((p) => p.name == m['method']),
    reference: m['reference'] as String?, notes: m['notes'] as String?,
    createdAt: m['created_at'] as String,
  );
}
