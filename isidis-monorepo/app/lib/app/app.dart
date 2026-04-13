import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/services/firebase_service.dart';
import '../core/theme/app_theme.dart';
import 'router/app_router.dart';

class IsidisApp extends ConsumerWidget {
  const IsidisApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    FirebaseService.setRouter(router);

    return MaterialApp.router(
      title: 'Isidis',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
