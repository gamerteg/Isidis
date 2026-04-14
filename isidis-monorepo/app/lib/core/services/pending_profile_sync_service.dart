import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';

class PendingProfileSyncService {
  static const _pendingTaxIdKey = 'pending_tax_id';
  static const _pendingCellphoneKey = 'pending_cellphone';

  static const _pendingReaderBioKey = 'pending_reader_bio';
  static const _pendingReaderTaglineKey = 'pending_reader_tagline';
  static const _pendingReaderExperienceKey = 'pending_reader_experience';
  static const _pendingReaderSpecialtiesKey = 'pending_reader_specialties';
  static const _pendingReaderPixKeyTypeKey = 'pending_reader_pix_key_type';
  static const _pendingReaderPixKeyKey = 'pending_reader_pix_key';
  static const _pendingReaderTaxIdKey = 'pending_reader_tax_id';
  static const _pendingReaderCellphoneKey = 'pending_reader_cellphone';

  static Future<void> savePendingClientContact({
    required String taxId,
    required String cellphone,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingTaxIdKey, taxId);
    await prefs.setString(_pendingCellphoneKey, cellphone);
  }

  static Future<void> clearPendingClientContact() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingTaxIdKey);
    await prefs.remove(_pendingCellphoneKey);
  }

  static Future<bool> syncPendingClientContact() async {
    final prefs = await SharedPreferences.getInstance();
    final taxId = prefs.getString(_pendingTaxIdKey)?.trim() ?? '';
    final cellphone = prefs.getString(_pendingCellphoneKey)?.trim() ?? '';

    if (taxId.isEmpty && cellphone.isEmpty) {
      return true;
    }

    final payload = <String, dynamic>{
      if (taxId.isNotEmpty) 'tax_id': taxId,
      if (cellphone.isNotEmpty) 'cellphone': cellphone,
    };

    try {
      await api.patch('/me', data: payload);
      await clearPendingClientContact();
      return true;
    } catch (error) {
      debugPrint('[PendingProfileSync] Falha ao sincronizar cliente: $error');
      return false;
    }
  }

  static Future<void> savePendingReaderProfile({
    required String bio,
    required String tagline,
    required int experienceYears,
    required List<String> specialties,
    required String pixKeyType,
    required String pixKey,
    required String taxId,
    required String cellphone,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingReaderBioKey, bio);
    await prefs.setString(_pendingReaderTaglineKey, tagline);
    await prefs.setInt(_pendingReaderExperienceKey, experienceYears);
    await prefs.setStringList(_pendingReaderSpecialtiesKey, specialties);
    await prefs.setString(_pendingReaderPixKeyTypeKey, pixKeyType);
    await prefs.setString(_pendingReaderPixKeyKey, pixKey);
    await prefs.setString(_pendingReaderTaxIdKey, taxId);
    await prefs.setString(_pendingReaderCellphoneKey, cellphone);
  }

  static Future<void> clearPendingReaderProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingReaderBioKey);
    await prefs.remove(_pendingReaderTaglineKey);
    await prefs.remove(_pendingReaderExperienceKey);
    await prefs.remove(_pendingReaderSpecialtiesKey);
    await prefs.remove(_pendingReaderPixKeyTypeKey);
    await prefs.remove(_pendingReaderPixKeyKey);
    await prefs.remove(_pendingReaderTaxIdKey);
    await prefs.remove(_pendingReaderCellphoneKey);
  }

  static Future<bool> syncPendingReaderProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final bio = prefs.getString(_pendingReaderBioKey)?.trim() ?? '';
    final tagline = prefs.getString(_pendingReaderTaglineKey)?.trim() ?? '';
    final experienceYears = prefs.getInt(_pendingReaderExperienceKey);
    final specialties = prefs.getStringList(_pendingReaderSpecialtiesKey);
    final pixKeyType =
        prefs.getString(_pendingReaderPixKeyTypeKey)?.trim() ?? '';
    final pixKey = prefs.getString(_pendingReaderPixKeyKey)?.trim() ?? '';
    final taxId = prefs.getString(_pendingReaderTaxIdKey)?.trim() ?? '';
    final cellphone = prefs.getString(_pendingReaderCellphoneKey)?.trim() ?? '';

    final hasPendingReaderData =
        bio.isNotEmpty ||
        tagline.isNotEmpty ||
        experienceYears != null ||
        (specialties?.isNotEmpty ?? false) ||
        pixKeyType.isNotEmpty ||
        pixKey.isNotEmpty ||
        taxId.isNotEmpty ||
        cellphone.isNotEmpty;

    if (!hasPendingReaderData) {
      return true;
    }

    final readerSpecialties = specialties ?? const <String>[];

    final payload = <String, dynamic>{
      if (bio.isNotEmpty) 'bio': bio,
      if (tagline.isNotEmpty) 'tagline': tagline,
      if (readerSpecialties.isNotEmpty) 'specialties': readerSpecialties,
      if (pixKeyType.isNotEmpty) 'pix_key_type': pixKeyType,
      if (pixKey.isNotEmpty) 'pix_key': pixKey,
      if (taxId.isNotEmpty) 'tax_id': taxId,
      if (cellphone.isNotEmpty) 'cellphone': cellphone,
    };

    if (experienceYears != null) {
      payload['experience_years'] = experienceYears;
    }

    try {
      await api.patch('/me', data: payload);
      await clearPendingReaderProfile();
      return true;
    } catch (error) {
      debugPrint('[PendingProfileSync] Falha ao sincronizar reader: $error');
      return false;
    }
  }

  static Future<void> syncPendingProfileData() async {
    await syncPendingClientContact();
    await syncPendingReaderProfile();
  }
}
