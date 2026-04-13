class OrderGig {
  final String id;
  final String title;
  final int price;
  final String? imageUrl;
  final int deliveryTimeHours;
  final String deliveryMethod;

  const OrderGig({
    required this.id,
    required this.title,
    required this.price,
    this.imageUrl,
    required this.deliveryTimeHours,
    required this.deliveryMethod,
  });

  factory OrderGig.fromJson(Map<String, dynamic> json) => OrderGig(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? '',
    price: json['price'] as int? ?? 0,
    imageUrl: json['image_url'] as String?,
    deliveryTimeHours: json['delivery_time_hours'] as int? ?? 48,
    deliveryMethod: json['delivery_method'] as String? ?? 'DIGITAL_SPREAD',
  );
}

class OrderProfile {
  final String id;
  final String fullName;
  final String? avatarUrl;

  const OrderProfile({
    required this.id,
    required this.fullName,
    this.avatarUrl,
  });

  factory OrderProfile.fromJson(Map<String, dynamic> json) => OrderProfile(
    id: json['id'] as String? ?? '',
    fullName: json['full_name'] as String? ?? '',
    avatarUrl: json['avatar_url'] as String?,
  );
}

class Order {
  final String id;
  final String status;
  final int amountTotal;
  final int amountReaderNet;
  final int amountPlatformFee;
  final DateTime createdAt;
  final Map<String, dynamic> requirementsAnswers;
  final List<String> selectedAddons;
  final Map<String, dynamic>? deliveryContent;
  final DateTime? readerViewedAt;
  final OrderGig? gig;
  final OrderProfile? client;
  final OrderProfile? reader;

  const Order({
    required this.id,
    required this.status,
    required this.amountTotal,
    required this.amountReaderNet,
    required this.amountPlatformFee,
    required this.createdAt,
    required this.requirementsAnswers,
    required this.selectedAddons,
    this.deliveryContent,
    this.readerViewedAt,
    this.gig,
    this.client,
    this.reader,
  });

  bool get isPendingPayment => status == 'PENDING_PAYMENT';
  bool get isPaid => status == 'PAID';
  bool get isDelivered => status == 'DELIVERED';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCanceled => status == 'CANCELED';

  factory Order.fromJson(Map<String, dynamic> json) {
    // Supabase pode retornar o join como 'gigs' ou 'gig'
    final gigRaw = json['gigs'] ?? json['gig'];
    // Múltiplos joins para profiles — tenta variações de chave
    final clientRaw =
        json['profiles!client_id'] ??
        json['client'] ??
        json['profiles__client_id'];
    final readerRaw =
        json['profiles!reader_id'] ??
        json['reader'] ??
        json['profiles__reader_id'];

    return Order(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING_PAYMENT',
      amountTotal: json['amount_total'] as int? ?? 0,
      amountReaderNet: json['amount_reader_net'] as int? ?? 0,
      amountPlatformFee: json['amount_platform_fee'] as int? ?? 0,
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      requirementsAnswers:
          (json['requirements_answers'] as Map<String, dynamic>?) ?? {},
      selectedAddons:
          (json['selected_addons'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      deliveryContent: json['delivery_content'] as Map<String, dynamic>?,
      readerViewedAt: DateTime.tryParse(
        json['reader_viewed_at'] as String? ?? '',
      ),
      gig: gigRaw != null
          ? OrderGig.fromJson(gigRaw as Map<String, dynamic>)
          : null,
      client: clientRaw != null
          ? OrderProfile.fromJson(clientRaw as Map<String, dynamic>)
          : null,
      reader: readerRaw != null
          ? OrderProfile.fromJson(readerRaw as Map<String, dynamic>)
          : null,
    );
  }
}
