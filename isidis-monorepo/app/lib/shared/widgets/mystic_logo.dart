import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class MysticLogo extends StatelessWidget {
  final double size;

  const MysticLogo({super.key, this.size = 44});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.plum],
        ),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.55),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: size * 0.62,
            height: size * 0.62,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.goldLight.withValues(alpha: 0.9),
                width: 1.3,
              ),
            ),
          ),
          Container(
            width: size * 0.16,
            height: size * 0.16,
            decoration: const BoxDecoration(
              color: AppColors.gold,
              shape: BoxShape.circle,
            ),
          ),
          Container(
            width: size * 0.54,
            height: size * 0.2,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(size),
              border: Border.all(
                color: AppColors.goldLight.withValues(alpha: 0.85),
                width: 1.3,
              ),
            ),
          ),
          Positioned(
            top: size * 0.1,
            child: Container(
              width: 1.2,
              height: size * 0.16,
              color: AppColors.goldLight.withValues(alpha: 0.85),
            ),
          ),
          Positioned(
            bottom: size * 0.1,
            child: Container(
              width: 1.2,
              height: size * 0.16,
              color: AppColors.goldLight.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}
