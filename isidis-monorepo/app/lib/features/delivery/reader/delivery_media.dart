import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/api/api_client.dart';
import '../../../core/platform/platform_capabilities.dart';

const deliveryUploadMaxSizeBytes = 50 * 1024 * 1024;

const deliveryPhotoMimeTypes = {'image/jpeg', 'image/png', 'image/webp'};

const deliveryAudioMimeTypes = {
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
};

const deliveryPhotoExtensions = ['jpg', 'jpeg', 'png', 'webp'];
const deliveryAudioExtensions = ['m4a', 'mp3', 'ogg', 'wav', 'aac'];

const _mimeByExtension = <String, String>{
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'm4a': 'audio/x-m4a',
  'mp4': 'audio/mp4',
  'mp3': 'audio/mpeg',
  'ogg': 'audio/ogg',
  'wav': 'audio/wav',
  'aac': 'audio/aac',
};

class PendingDeliveryMedia {
  final XFile file;
  final String filename;
  final String mimeType;
  final Uint8List? _bytes;
  final int? sizeInBytes;

  const PendingDeliveryMedia._({
    required this.file,
    required this.filename,
    required this.mimeType,
    Uint8List? bytes,
    this.sizeInBytes,
  }) : _bytes = bytes;

  factory PendingDeliveryMedia.fromXFile(
    XFile file, {
    String? filename,
    String? mimeType,
    Uint8List? bytes,
    int? sizeInBytes,
  }) {
    final normalizedFilename = _normalizeFilename(filename ?? file.name);
    final resolvedMimeType =
        resolveDeliveryMimeType(
          mimeType ?? file.mimeType,
          normalizedFilename,
        ) ??
        'application/octet-stream';

    return PendingDeliveryMedia._(
      file: file,
      filename: normalizedFilename,
      mimeType: resolvedMimeType,
      bytes: bytes,
      sizeInBytes: sizeInBytes ?? bytes?.length,
    );
  }

  factory PendingDeliveryMedia.fromBytes({
    required Uint8List bytes,
    required String filename,
    required String mimeType,
  }) {
    final normalizedFilename = _normalizeFilename(filename);
    final resolvedMimeType =
        resolveDeliveryMimeType(mimeType, normalizedFilename) ??
        'application/octet-stream';

    return PendingDeliveryMedia._(
      file: XFile.fromData(
        bytes,
        name: normalizedFilename,
        mimeType: resolvedMimeType,
      ),
      filename: normalizedFilename,
      mimeType: resolvedMimeType,
      bytes: bytes,
      sizeInBytes: bytes.length,
    );
  }

  Future<Uint8List> readAsBytes() async => _bytes ?? file.readAsBytes();

  Future<int> length() async => sizeInBytes ?? await file.length();
}

class DeliveryUploadResult {
  final String url;
  final String? fileName;

  const DeliveryUploadResult({required this.url, this.fileName});
}

class DeliveryMediaException implements Exception {
  final String message;

  const DeliveryMediaException(this.message);

  @override
  String toString() => message;
}

Future<PendingDeliveryMedia?> pickFallbackAudioFile() async {
  final result = await FilePicker.pickFiles(
    type: FileType.custom,
    allowedExtensions: deliveryAudioExtensions,
    withData: PlatformCapabilities.isWeb,
  );
  if (result == null || result.files.isEmpty) return null;

  final picked = result.files.single;
  final resolvedMimeType =
      resolveDeliveryMimeType(picked.extension, picked.name) ??
      'application/octet-stream';

  if (picked.bytes != null) {
    return PendingDeliveryMedia.fromBytes(
      bytes: picked.bytes!,
      filename: picked.name,
      mimeType: resolvedMimeType,
    );
  }

  if (picked.path != null && picked.path!.isNotEmpty) {
    return PendingDeliveryMedia.fromXFile(
      XFile(picked.path!, name: picked.name, mimeType: resolvedMimeType),
      filename: picked.name,
      mimeType: resolvedMimeType,
      sizeInBytes: picked.size,
    );
  }

  return null;
}

Future<String?> validatePendingDeliveryMedia(
  PendingDeliveryMedia media, {
  required String type,
}) async {
  final allowedMimes = type == 'photo'
      ? deliveryPhotoMimeTypes
      : deliveryAudioMimeTypes;
  final size = await media.length();

  if (size > deliveryUploadMaxSizeBytes) {
    return 'Arquivo maior que 50 MB.';
  }

  if (!allowedMimes.contains(media.mimeType)) {
    return 'Formato ${media.mimeType} nao suportado para ${type == 'photo' ? 'foto' : 'audio'}.';
  }

  return null;
}

Future<MultipartFile> buildDeliveryMultipartFile(
  PendingDeliveryMedia media, {
  bool? isWebOverride,
}) async {
  final useBytes =
      (isWebOverride ?? PlatformCapabilities.isWeb) || media.file.path.isEmpty;
  final contentType = DioMediaType.parse(media.mimeType);

  if (useBytes) {
    return MultipartFile.fromBytes(
      await media.readAsBytes(),
      filename: media.filename,
      contentType: contentType,
    );
  }

  return MultipartFile.fromFile(
    media.file.path,
    filename: media.filename,
    contentType: contentType,
  );
}

Future<DeliveryUploadResult> uploadDeliveryMedia({
  required String orderId,
  required PendingDeliveryMedia media,
  required String type,
}) async {
  final validationError = await validatePendingDeliveryMedia(media, type: type);
  if (validationError != null) {
    throw DeliveryMediaException(validationError);
  }

  final formData = FormData.fromMap({
    'file': await buildDeliveryMultipartFile(media),
    'type': type,
  });

  final response = await api.postMultipart(
    '/orders/$orderId/delivery/upload',
    formData: formData,
  );

  return DeliveryUploadResult(
    url: response.data['data']['url'] as String,
    fileName: response.data['data']['file_name'] as String?,
  );
}

String? resolveDeliveryMimeType(String? mimeTypeOrExtension, String filename) {
  final normalized = mimeTypeOrExtension?.trim().toLowerCase();
  if (normalized != null && normalized.isNotEmpty) {
    if (normalized.contains('/')) return normalized;
    if (_mimeByExtension.containsKey(normalized)) {
      return _mimeByExtension[normalized];
    }
  }

  final extension = _fileExtension(filename);
  if (extension == null) return null;
  return _mimeByExtension[extension];
}

String _normalizeFilename(String filename) {
  final normalized = filename.split(RegExp(r'[\\/]')).last.trim();

  return normalized.isEmpty ? 'upload.bin' : normalized;
}

String? _fileExtension(String filename) {
  final normalized = filename.trim().toLowerCase();
  final dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex == normalized.length - 1) {
    return null;
  }

  return normalized.substring(dotIndex + 1);
}
