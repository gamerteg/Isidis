import 'package:flutter/foundation.dart';

abstract final class PlatformCapabilities {
  static const isWeb = kIsWeb;

  static bool get supportsEmbeddedCardCheckout => !isWeb;

  static bool get supportsReaderDeliveryEditor => !isWeb;
}
