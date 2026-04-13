import '../data/pix_key_types.dart';

class Profile {
  final String id;
  final String fullName;
  final String? avatarUrl;
  final String? coverUrl;
  final String role; // CLIENT | READER | ADMIN
  final String? bio;
  final String? tagline;
  final List<String> specialties;
  final String? verificationStatus;
  final int? experienceYears;
  final double? ratingAverage;
  final int? reviewsCount;
  final String? profileColor;
  final String? instagramHandle;
  final String? youtubeUrl;
  final List<String> decksUsed;
  final int? maxOrdersPerDay;
  final int? maxSimultaneousOrders;
  final String? pixKeyType;
  final String? pixKey;
  final String? cellphone;
  final String? taxId;

  const Profile({
    required this.id,
    required this.fullName,
    this.avatarUrl,
    this.coverUrl,
    required this.role,
    this.bio,
    this.tagline,
    this.specialties = const [],
    this.verificationStatus,
    this.experienceYears,
    this.ratingAverage,
    this.reviewsCount,
    this.profileColor,
    this.instagramHandle,
    this.youtubeUrl,
    this.decksUsed = const [],
    this.maxOrdersPerDay,
    this.maxSimultaneousOrders,
    this.pixKeyType,
    this.pixKey,
    this.cellphone,
    this.taxId,
  });

  bool get isReader => role == 'READER';
  bool get isAdmin => role == 'ADMIN';
  bool get isApproved => verificationStatus == 'APPROVED';

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      coverUrl: json['cover_url'] as String?,
      role: json['role'] as String? ?? 'CLIENT',
      bio: json['bio'] as String?,
      tagline: json['tagline'] as String?,
      specialties:
          (json['specialties'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      verificationStatus: json['verification_status'] as String?,
      experienceYears: json['experience_years'] as int?,
      ratingAverage: (json['rating_average'] as num?)?.toDouble(),
      reviewsCount: json['reviews_count'] as int?,
      profileColor: json['profile_color'] as String?,
      instagramHandle: json['instagram_handle'] as String?,
      youtubeUrl: json['youtube_url'] as String?,
      decksUsed:
          (json['decks_used'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      maxOrdersPerDay: json['max_orders_per_day'] as int?,
      maxSimultaneousOrders: json['max_simultaneous_orders'] as int?,
      pixKeyType: normalizePixKeyType(
        json['pix_key_type'] as String?,
        pixKey: json['pix_key'] as String?,
      ),
      pixKey: json['pix_key'] as String?,
      cellphone: json['cellphone'] as String?,
      taxId: json['tax_id'] as String?,
    );
  }
}
