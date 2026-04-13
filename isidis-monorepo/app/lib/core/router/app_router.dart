import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/login_screen.dart';
import '../../features/auth/register_client_screen.dart';
import '../../features/auth/register_reader_screen.dart';
import '../../features/home/onboarding_screen.dart';
import '../../features/home/client_home_screen.dart';
import '../../features/home/tiragem_screen.dart';
import '../../features/home/reader_home_screen.dart';
import '../../features/home/under_review_screen.dart';
import '../../features/marketplace/readers_list_screen.dart';
import '../../features/marketplace/reader_profile_screen.dart';
import '../../features/marketplace/gig_detail_screen.dart';
import '../../features/checkout/checkout_screen.dart';
import '../../features/checkout/pix_screen.dart';
import '../../features/checkout/credit_card_screen.dart';
import '../../features/checkout/order_confirmation_screen.dart';
import '../../features/orders/client_orders_screen.dart';
import '../../features/orders/client_order_detail_screen.dart';
import '../../features/orders/reader_orders_screen.dart';
import '../../features/orders/reader_order_detail_screen.dart';
import '../../features/delivery/reader/delivery_editor_screen.dart';
import '../../features/delivery/client/reading_viewer_screen.dart';
import '../../features/delivery/client/reading_end_screen.dart';
import '../../features/wallet/wallet_screen.dart';
import '../../features/wallet/withdraw_screen.dart';
import '../../features/gigs/my_gigs_screen.dart';
import '../../features/gigs/gig_editor_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/edit_profile_screen.dart';
import '../../features/chat/conversations_screen.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/quiz/quiz_onboarding_screen.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/api/api_client.dart';
import '../../shared/models/profile.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) async {
      final publicRoutes = [
        '/login',
        '/register',
        '/register-reader',
        '/onboarding',
      ];
      final isPublic = publicRoutes.any(
        (r) => state.matchedLocation.startsWith(r),
      );

      if (!SupabaseService.isLoggedIn) {
        if (isPublic) return null;
        return '/login';
      }

      return null;
    },
    routes: [
      // ── Splash ─────────────────────────────────────────────────────────────
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),

      // ── Onboarding ─────────────────────────────────────────────────────────
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/quiz-onboarding',
        builder: (_, _) => const QuizOnboardingScreen(),
      ),

      // ── Auth ───────────────────────────────────────────────────────────────
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/register',
        builder: (_, __) => const RegisterClientScreen(),
      ),
      GoRoute(
        path: '/register-reader',
        builder: (_, __) => const RegisterReaderScreen(),
      ),

      // ── Cliente — Home ──────────────────────────────────────────────────────
      GoRoute(path: '/home', builder: (_, __) => const ClientHomeScreen()),
      GoRoute(path: '/tiragem', builder: (_, __) => const TiragemScreen()),

      // ── Marketplace ────────────────────────────────────────────────────────
      GoRoute(
        path: '/readers',
        builder: (_, state) {
          final specialty = state.uri.queryParameters['specialty'];
          return ReadersListScreen(specialty: specialty);
        },
      ),
      GoRoute(
        path: '/readers/:id',
        builder: (_, state) =>
            ReaderProfileScreen(readerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/gigs/:id',
        builder: (_, state) =>
            GigDetailScreen(gigId: state.pathParameters['id']!),
      ),

      // ── Checkout ───────────────────────────────────────────────────────────
      GoRoute(
        path: '/checkout/:gigId',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final addOnIds =
              (extra?['selectedAddOns'] as List<dynamic>?)
                  ?.map((e) => e.toString())
                  .toList() ??
              [];
          return CheckoutScreen(
            gigId: state.pathParameters['gigId']!,
            selectedAddOnIds: addOnIds,
          );
        },
      ),
      GoRoute(
        path: '/pix',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return PixScreen(
            orderId: extra['orderId'] as String,
            pixQrCodeId: extra['pixQrCodeId'] as String,
            amountTotal: extra['amountTotal'] as int,
            qrCodeBase64: extra['qrCodeBase64'] as String?,
            copyPasteCode: extra['copyPasteCode'] as String?,
            expiresAt: extra['expiresAt'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/credit-card',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return CreditCardScreen(
            gigId: extra['gigId'] as String,
            addOnIds: (extra['addOnIds'] as List<dynamic>).cast<String>(),
            requirementsAnswers: Map<String, String>.from(
              extra['requirementsAnswers'] as Map,
            ),
            amountTotal: extra['amountTotal'] as int,
            amountCardFee: extra['amountCardFee'] as int,
          );
        },
      ),
      GoRoute(
        path: '/order-confirmation/:orderId',
        builder: (_, state) =>
            OrderConfirmationScreen(orderId: state.pathParameters['orderId']!),
      ),

      // ── Cliente — Pedidos ──────────────────────────────────────────────────
      GoRoute(path: '/orders', builder: (_, __) => const ClientOrdersScreen()),
      GoRoute(
        path: '/orders/:id',
        builder: (_, state) =>
            ClientOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),

      // ── Reader ─────────────────────────────────────────────────────────────
      GoRoute(
        path: '/reader-home',
        builder: (_, __) => const ReaderHomeScreen(),
      ),
      GoRoute(
        path: '/under-review',
        builder: (_, __) => const UnderReviewScreen(),
      ),
      GoRoute(
        path: '/reader-orders',
        builder: (_, __) => const ReaderOrdersScreen(),
      ),
      GoRoute(
        path: '/reader-orders/:id',
        builder: (_, state) =>
            ReaderOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),

      // ── Carteira ───────────────────────────────────────────────────────────
      GoRoute(path: '/wallet', builder: (_, __) => const WalletScreen()),
      GoRoute(
        path: '/withdraw',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return WithdrawScreen(
            availableBalance: extra?['available'] as int? ?? 0,
          );
        },
      ),

      // ── Serviços do reader ─────────────────────────────────────────────────
      GoRoute(path: '/my-gigs', builder: (_, __) => const MyGigsScreen()),
      GoRoute(
        path: '/my-gigs/new',
        builder: (_, __) => const GigEditorScreen(),
      ),
      GoRoute(
        path: '/my-gigs/:id/edit',
        builder: (_, state) {
          final gig = state.extra as Map<String, dynamic>?;
          return GigEditorScreen(existingGig: gig);
        },
      ),

      // ── Perfil ─────────────────────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(
        path: '/edit-profile',
        builder: (_, __) => const EditProfileScreen(),
      ),

      // ── Chat ───────────────────────────────────────────────────────────────
      GoRoute(
        path: '/conversations',
        builder: (_, __) => const ConversationsScreen(),
      ),
      GoRoute(
        path: '/chat/:conversationId',
        builder: (_, state) => ChatScreen(
          conversationId: state.pathParameters['conversationId']!,
          conversationData: state.extra as Map<String, dynamic>?,
        ),
      ),

      // ── Notificações ───────────────────────────────────────────────────────
      GoRoute(
        path: '/notifications',
        builder: (_, __) => const NotificationsScreen(),
      ),

      // ── Delivery ───────────────────────────────────────────────────────────
      GoRoute(
        path: '/orders/:id/deliver',
        builder: (_, state) =>
            DeliveryEditorScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/readings/:orderId',
        builder: (_, state) =>
            ReadingViewerScreen(orderId: state.pathParameters['orderId']!),
      ),
      GoRoute(
        path: '/readings/:orderId/end',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return ReadingEndScreen(
            orderId: state.pathParameters['orderId']!,
            gigId: extra['gigId'] as String,
            readerId: extra['readerId'] as String,
            readerName: extra['readerName'] as String,
            summary: extra['summary'] as String?,
          );
        },
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Página não encontrada: ${state.error}')),
    ),
  );
});

// ── Splash Screen ──────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    final prefs = await SharedPreferences.getInstance();
    final seenOnboarding = prefs.getBool('seen_onboarding') ?? false;

    if (!SupabaseService.isLoggedIn) {
      if (!seenOnboarding) {
        context.go('/onboarding');
      } else {
        context.go('/login');
      }
      return;
    }

    try {
      final response = await api.get('/me');
      final profile = Profile.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );

      if (!mounted) return;

      if (profile.isReader) {
        if (!profile.isApproved) {
          context.go('/under-review');
        } else {
          context.go('/reader-home');
        }
      } else {
        try {
          final quizResponse = await api.get('/me/quiz');
          final quizData = quizResponse.data['data'] as Map<String, dynamic>;
          final quizCompleted = quizData['completed'] as bool? ?? false;
          if (!mounted) return;
          context.go(quizCompleted ? '/home' : '/quiz-onboarding');
        } catch (_) {
          if (mounted) context.go('/home');
        }
      }
    } catch (_) {
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
