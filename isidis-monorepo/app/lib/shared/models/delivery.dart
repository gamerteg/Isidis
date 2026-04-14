class DeliveryCard {
  final String id;
  final String name;
  final String position; // 'upright' | 'reversed'
  final String interpretation;
  final String? audioUrl;
  final String? audioFileName;
  final int order;

  const DeliveryCard({
    required this.id,
    required this.name,
    required this.position,
    required this.interpretation,
    this.audioUrl,
    this.audioFileName,
    required this.order,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'position': position,
    'interpretation': interpretation,
    'audio_url': audioUrl,
    'audio_file_name': audioFileName,
    'order': order,
  };

  factory DeliveryCard.fromJson(Map<String, dynamic> json) => DeliveryCard(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    position: json['position'] as String? ?? 'upright',
    interpretation: json['interpretation'] as String? ?? '',
    audioUrl: json['audio_url'] as String?,
    audioFileName: json['audio_file_name'] as String?,
    order: json['order'] as int? ?? 0,
  );

  DeliveryCard copyWith({
    String? position,
    String? interpretation,
    Object? audioUrl = _missing,
    Object? audioFileName = _missing,
    int? order,
  }) => DeliveryCard(
    id: id,
    name: name,
    position: position ?? this.position,
    interpretation: interpretation ?? this.interpretation,
    audioUrl: audioUrl == _missing ? this.audioUrl : audioUrl as String?,
    audioFileName: audioFileName == _missing
        ? this.audioFileName
        : audioFileName as String?,
    order: order ?? this.order,
  );
}

class DeliverySection {
  final String type; // 'text' | 'audio' | 'photo'
  final String? content;
  final String? url;
  final String? fileName;
  final int order;

  const DeliverySection({
    required this.type,
    this.content,
    this.url,
    this.fileName,
    required this.order,
  });

  Map<String, dynamic> toJson() => {
    'type': type,
    'content': content,
    'url': url,
    'file_name': fileName,
    'order': order,
  };

  factory DeliverySection.fromJson(Map<String, dynamic> json) =>
      DeliverySection(
        type: json['type'] as String? ?? 'text',
        content: json['content'] as String?,
        url: json['url'] as String?,
        fileName: json['file_name'] as String?,
        order: json['order'] as int? ?? 0,
      );

  DeliverySection copyWith({
    String? content,
    Object? url = _missing,
    Object? fileName = _missing,
    int? order,
  }) => DeliverySection(
    type: type,
    content: content ?? this.content,
    url: url == _missing ? this.url : url as String?,
    fileName: fileName == _missing ? this.fileName : fileName as String?,
    order: order ?? this.order,
  );
}

class DeliveryContent {
  final String method; // 'DIGITAL_SPREAD' | 'PHYSICAL'
  final List<DeliveryCard> cards;
  final List<DeliverySection> sections;
  final String? summary;

  const DeliveryContent({
    required this.method,
    this.cards = const [],
    this.sections = const [],
    this.summary,
  });

  bool get isDigital => method == 'DIGITAL_SPREAD';

  Map<String, dynamic> toJson() => {
    'method': method,
    'cards': cards.map((c) => c.toJson()).toList(),
    'sections': sections.map((s) => s.toJson()).toList(),
    'summary': summary,
  };

  factory DeliveryContent.fromJson(Map<String, dynamic> json) =>
      DeliveryContent(
        method: json['method'] as String? ?? 'DIGITAL_SPREAD',
        cards:
            (json['cards'] as List<dynamic>?)
                ?.map((e) => DeliveryCard.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        sections:
            (json['sections'] as List<dynamic>?)
                ?.map(
                  (e) => DeliverySection.fromJson(e as Map<String, dynamic>),
                )
                .toList() ??
            [],
        summary: json['summary'] as String?,
      );
}

const _missing = Object();
