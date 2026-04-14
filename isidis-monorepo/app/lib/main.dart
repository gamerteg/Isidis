import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app/bootstrap.dart';
import 'core/config/app_env.dart';

Future<void> main() async {
  if (AppEnv.sentryDsn.isEmpty) {
    await bootstrap();
    return;
  }

  await SentryFlutter.init((options) {
    options.dsn = AppEnv.sentryDsn;
    options.environment = kDebugMode ? 'development' : 'production';
    options.tracesSampleRate = 0.1;
  }, appRunner: bootstrap);
}
