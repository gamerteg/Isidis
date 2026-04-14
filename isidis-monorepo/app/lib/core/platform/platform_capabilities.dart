import 'package:flutter/foundation.dart';

abstract final class PlatformCapabilities {
  static bool? debugIsWebOverride;

  static bool get isWeb => debugIsWebOverride ?? kIsWeb;

  static bool get supportsEmbeddedCardCheckout => !isWeb;

  static bool get supportsReaderDeliveryEditor => true;
}
