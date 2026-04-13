import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/data/pix_key_types.dart';
import '../../shared/widgets/app_text_field.dart';

const _kSpecialties = [
  'Amor',
  'Carreira',
  'Família',
  'Espiritualidade',
  'Autoconhecimento',
  'Finanças',
  'Saúde',
  'Numerologia',
  'Astrologia',
  'Runas',
  'Oráculos',
  'Mediunidade',
];

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _nameCtrl = TextEditingController();
  final _taglineCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _instagramCtrl = TextEditingController();
  final _youtubeCtrl = TextEditingController();
  final _pixKeyCtrl = TextEditingController();
  final _expYearsCtrl = TextEditingController();
  final _maxOrdersDayCtrl = TextEditingController();
  final _maxSimultCtrl = TextEditingController();

  String _pixKeyType = 'CPF';
  List<String> _selectedSpecialties = [];
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _taglineCtrl.dispose();
    _bioCtrl.dispose();
    _instagramCtrl.dispose();
    _youtubeCtrl.dispose();
    _pixKeyCtrl.dispose();
    _expYearsCtrl.dispose();
    _maxOrdersDayCtrl.dispose();
    _maxSimultCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final r = await api.get('/me');
      final p = r.data['data'] as Map<String, dynamic>?;
      if (mounted && p != null) {
        setState(() {
          _nameCtrl.text = p['full_name'] as String? ?? '';
          _taglineCtrl.text = p['tagline'] as String? ?? '';
          _bioCtrl.text = p['bio'] as String? ?? '';
          _instagramCtrl.text = p['instagram_handle'] as String? ?? '';
          _youtubeCtrl.text = p['youtube_url'] as String? ?? '';
          _pixKeyCtrl.text = p['pix_key'] as String? ?? '';
          _pixKeyType = normalizePixKeyType(
            p['pix_key_type'] as String?,
            pixKey: p['pix_key'] as String?,
          );
          _expYearsCtrl.text =
              (p['experience_years'] as int?)?.toString() ?? '';
          _maxOrdersDayCtrl.text =
              (p['max_orders_per_day'] as int?)?.toString() ?? '';
          _maxSimultCtrl.text =
              (p['max_simultaneous_orders'] as int?)?.toString() ?? '';
          _selectedSpecialties =
              (p['specialties'] as List<dynamic>?)
                  ?.map((e) => e.toString())
                  .toList() ??
              [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      await api.patch(
        '/me',
        data: {
          'full_name': _nameCtrl.text.trim(),
          if (_taglineCtrl.text.trim().isNotEmpty)
            'tagline': _taglineCtrl.text.trim(),
          if (_bioCtrl.text.trim().isNotEmpty) 'bio': _bioCtrl.text.trim(),
          if (_instagramCtrl.text.trim().isNotEmpty)
            'instagram_handle': _instagramCtrl.text.trim(),
          if (_youtubeCtrl.text.trim().isNotEmpty)
            'youtube_url': _youtubeCtrl.text.trim(),
          if (_pixKeyCtrl.text.trim().isNotEmpty) ...{
            'pix_key': _pixKeyCtrl.text.trim(),
            'pix_key_type': _pixKeyType,
          },
          if (_expYearsCtrl.text.trim().isNotEmpty)
            'experience_years': int.tryParse(_expYearsCtrl.text.trim()),
          if (_maxOrdersDayCtrl.text.trim().isNotEmpty)
            'max_orders_per_day': int.tryParse(_maxOrdersDayCtrl.text.trim()),
          if (_maxSimultCtrl.text.trim().isNotEmpty)
            'max_simultaneous_orders': int.tryParse(_maxSimultCtrl.text.trim()),
          'specialties': _selectedSpecialties,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Perfil atualizado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erro ao salvar perfil. Tente novamente.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toggleSpecialty(String s) {
    setState(() {
      if (_selectedSpecialties.contains(s)) {
        _selectedSpecialties.remove(s);
      } else {
        _selectedSpecialties.add(s);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Editar perfil',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: (_loading || _saving) ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primaryLight,
                    ),
                  )
                : const Text(
                    'Salvar',
                    style: TextStyle(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // ── Avatar placeholder ───────────────────────────────────
                  Center(
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: AppColors.primary.withValues(
                            alpha: 0.2,
                          ),
                          child: const Icon(
                            Icons.person,
                            color: AppColors.primaryLight,
                            size: 44,
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.background,
                                width: 2,
                              ),
                            ),
                            child: const Icon(
                              Icons.edit,
                              color: Colors.white,
                              size: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // ── Dados pessoais ───────────────────────────────────────
                  _SectionHeader('Dados pessoais'),
                  const SizedBox(height: 12),

                  AppTextField(
                    controller: _nameCtrl,
                    label: 'Nome completo',
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Nome obrigatório';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),

                  AppTextField(
                    controller: _taglineCtrl,
                    label: 'Tagline (ex: Cartomante há 10 anos)',
                  ),
                  const SizedBox(height: 12),

                  AppTextField(
                    controller: _bioCtrl,
                    label: 'Bio / Sobre você',
                    maxLines: 4,
                  ),
                  const SizedBox(height: 12),

                  AppTextField(
                    controller: _expYearsCtrl,
                    label: 'Anos de experiência',
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),

                  const SizedBox(height: 24),

                  // ── Especialidades ───────────────────────────────────────
                  _SectionHeader('Especialidades'),
                  const SizedBox(height: 4),
                  const Text(
                    'Selecione as áreas em que você trabalha.',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 12),

                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _kSpecialties.map((s) {
                      final selected = _selectedSpecialties.contains(s);
                      return GestureDetector(
                        onTap: () => _toggleSpecialty(s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary.withValues(alpha: 0.2)
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primaryLight
                                  : AppColors.surfaceLight,
                            ),
                          ),
                          child: Text(
                            s,
                            style: TextStyle(
                              color: selected
                                  ? AppColors.primaryLight
                                  : AppColors.textSecondary,
                              fontSize: 13,
                              fontWeight: selected
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 24),

                  // ── Redes sociais ────────────────────────────────────────
                  _SectionHeader('Redes sociais'),
                  const SizedBox(height: 12),

                  AppTextField(
                    controller: _instagramCtrl,
                    label: 'Instagram (@usuario)',
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: _youtubeCtrl,
                    label: 'YouTube (URL do canal)',
                    keyboardType: TextInputType.url,
                  ),

                  const SizedBox(height: 24),

                  // ── Dados financeiros ────────────────────────────────────
                  _SectionHeader('Dados financeiros'),
                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    value: _pixKeyType,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.surface,
                      labelText: 'Tipo de chave PIX',
                      labelStyle: const TextStyle(color: AppColors.textMuted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: AppColors.surfaceLight,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: AppColors.surfaceLight,
                        ),
                      ),
                    ),
                    dropdownColor: AppColors.surface,
                    style: const TextStyle(color: AppColors.textPrimary),
                    items: pixKeyTypeOptions
                        .map(
                          (t) => DropdownMenuItem(
                            value: t.value,
                            child: Text(t.label),
                          ),
                        )
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _pixKeyType = v ?? _pixKeyType),
                  ),
                  const SizedBox(height: 12),
                  AppTextField(controller: _pixKeyCtrl, label: 'Chave PIX'),

                  const SizedBox(height: 24),

                  // ── Configurações de capacidade ──────────────────────────
                  _SectionHeader('Capacidade de atendimento'),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          controller: _maxOrdersDayCtrl,
                          label: 'Pedidos / dia',
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppTextField(
                          controller: _maxSimultCtrl,
                          label: 'Simultâneos',
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  ElevatedButton(
                    onPressed: (_loading || _saving) ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _saving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Salvar perfil',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),

                  const SizedBox(height: 16),

                  // Logout
                  TextButton(
                    onPressed: () async {
                      await SupabaseService.signOut();
                      if (context.mounted) context.go('/login');
                    },
                    child: const Text(
                      'Sair da conta',
                      style: TextStyle(color: AppColors.error),
                    ),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.bold,
        fontSize: 16,
      ),
    );
  }
}
