import 'profile.dart';

class GigRequirement {
  final String id;
  final String question;
  final String type; // text | choice
  final List<String> options;
  final bool required;

  const GigRequirement({
    required this.id,
    required this.question,
    required this.type,
    this.options = const [],
    required this.required,
  });

  factory GigRequirement.fromJson(Map<String, dynamic> json) => GigRequirement(
    id: json['id'] as String,
    question: json['question'] as String,
    type: json['type'] as String? ?? 'text',
    options:
        (json['options'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [],
    required: json['required'] as bool? ?? false,
  );
}

class GigAddOn {
  final String id;
  final String title;
  final String? description;
  final int price;
  final String type; // SPEED | EXTRA | CUSTOM

  const GigAddOn({
    required this.id,
    required this.title,
    this.description,
    required this.price,
    required this.type,
  });

  factory GigAddOn.fromJson(Map<String, dynamic> json) => GigAddOn(
    id: json['id'] as String,
    title: json['title'] as String,
    description: json['description'] as String?,
    price: json['price'] as int? ?? 0,
    type: json['type'] as String? ?? 'EXTRA',
  );
}

class Gig {
  final String id;
  final String title;
  final String? description;
  final int price;
  final String? imageUrl;
  final String? category;
  final String ownerId;
  final String? status;
  final bool isActive;
  final int deliveryTimeHours;
  final String deliveryMethod;
  final List<String> tags;
  final List<GigRequirement> requirements;
  final List<GigAddOn> addOns;
  final String pricingType; // ONE_TIME | RECURRING
  final int? readingsPerMonth;
  final String?
  modality; // TAROT | ORACULO | BARALHO_CIGANO | ASTROLOGIA | OUTRO
  final List<String>
  intentions; // AMOR | CARREIRA | FINANCAS | SAUDE | ESPIRITUALIDADE | FAMILIA | DECISAO
  final List<String> paymentMethods; // PIX | CARD
  final String cardFeeResponsibility; // READER
  final Profile? owner;

  const Gig({
    required this.id,
    required this.title,
    this.description,
    required this.price,
    this.imageUrl,
    this.category,
    required this.ownerId,
    this.status,
    this.isActive = true,
    required this.deliveryTimeHours,
    required this.deliveryMethod,
    this.tags = const [],
    this.requirements = const [],
    this.addOns = const [],
    this.pricingType = 'ONE_TIME',
    this.readingsPerMonth,
    this.modality,
    this.intentions = const [],
    this.paymentMethods = const ['PIX', 'CARD'],
    this.cardFeeResponsibility = 'READER',
    this.owner,
  });

  factory Gig.fromJson(Map<String, dynamic> json) {
    return Gig(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      price: json['price'] as int? ?? 0,
      imageUrl: json['image_url'] as String?,
      category: json['category'] as String?,
      ownerId: json['owner_id'] as String? ?? '',
      status: json['status'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      deliveryTimeHours: json['delivery_time_hours'] as int? ?? 48,
      deliveryMethod: json['delivery_method'] as String? ?? 'DIGITAL_SPREAD',
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          [],
      requirements:
          (json['requirements'] as List<dynamic>?)
              ?.map((e) => GigRequirement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      addOns:
          (json['add_ons'] as List<dynamic>?)
              ?.map((e) => GigAddOn.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      pricingType: json['pricing_type'] as String? ?? 'ONE_TIME',
      readingsPerMonth: json['readings_per_month'] as int?,
      modality: json['modality'] as String?,
      intentions:
          (json['intentions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      paymentMethods:
          (json['payment_methods'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const ['PIX', 'CARD'],
      cardFeeResponsibility:
          json['card_fee_responsibility'] as String? ?? 'READER',
      owner: (json['owner'] ?? json['profiles']) != null
          ? Profile.fromJson(
              (json['owner'] ?? json['profiles']) as Map<String, dynamic>,
            )
          : null,
    );
  }
}
