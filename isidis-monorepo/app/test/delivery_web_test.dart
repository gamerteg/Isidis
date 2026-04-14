import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import 'package:isidis_app/core/platform/platform_capabilities.dart';
import 'package:isidis_app/features/delivery/reader/audio_recorder_widget.dart';
import 'package:isidis_app/features/delivery/reader/delivery_editor_screen.dart';
import 'package:isidis_app/features/delivery/reader/delivery_media.dart';
import 'package:isidis_app/shared/models/order.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    PlatformCapabilities.debugIsWebOverride = null;
  });

  test('buildDeliveryMultipartFile usa bytes no web', () async {
    final media = PendingDeliveryMedia.fromBytes(
      bytes: Uint8List.fromList([1, 2, 3, 4]),
      filename: 'sample.wav',
      mimeType: 'audio/wav',
    );

    final multipart = await buildDeliveryMultipartFile(
      media,
      isWebOverride: true,
    );
    final collected = await multipart.finalize().fold<List<int>>(
      <int>[],
      (all, chunk) => all..addAll(chunk),
    );

    expect(multipart.filename, 'sample.wav');
    expect(multipart.length, 4);
    expect(multipart.contentType.toString(), 'audio/wav');
    expect(collected, [1, 2, 3, 4]);
  });

  test(
    'buildDeliveryMultipartFile usa path nativo quando disponivel',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'delivery_web_test',
      );
      final file = File('${tempDir.path}/sample.wav');
      await file.writeAsBytes([9, 8, 7]);

      final media = PendingDeliveryMedia.fromXFile(
        XFile(file.path, name: 'sample.wav', mimeType: 'audio/wav'),
        mimeType: 'audio/wav',
      );

      final multipart = await buildDeliveryMultipartFile(
        media,
        isWebOverride: false,
      );
      final collected = await multipart.finalize().fold<List<int>>(
        <int>[],
        (all, chunk) => all..addAll(chunk),
      );

      expect(multipart.filename, 'sample.wav');
      expect(multipart.length, 3);
      expect(collected, [9, 8, 7]);

      await tempDir.delete(recursive: true);
    },
  );

  testWidgets('editor de entrega no web abre o fluxo real', (tester) async {
    PlatformCapabilities.debugIsWebOverride = true;

    await tester.pumpWidget(
      MaterialApp(
        home: DeliveryEditorScreen(
          orderId: 'order-1',
          orderLoader: (_) async => Order(
            id: 'order-1',
            status: 'PAID',
            amountTotal: 1000,
            amountReaderNet: 850,
            amountPlatformFee: 150,
            createdAt: DateTime(2026, 4, 14),
            requirementsAnswers: const {},
            selectedAddons: const [],
            gig: const OrderGig(
              id: 'gig-1',
              title: 'Tiragem',
              price: 1000,
              deliveryTimeHours: 24,
              deliveryMethod: 'DIGITAL_SPREAD',
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Selecionar Cartas'), findsOneWidget);
    expect(
      find.textContaining('nao estao liberados na versao web'),
      findsNothing,
    );
  });

  testWidgets('widget de audio mostra fallback de upload no web', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AudioRecorderWidget(
            showUploadFallback: true,
            onRecorded: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('Enviar audio'), findsOneWidget);
  });
}
