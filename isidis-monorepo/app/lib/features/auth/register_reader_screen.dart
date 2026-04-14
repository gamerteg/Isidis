import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/services/pending_profile_sync_service.dart';
import '../../core/supabase/supabase_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/data/pix_key_types.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/gradient_background.dart';

const _specialties = [
  'Amor e Relacionamentos',
  'Carreira e Finanças',
  'Família',
  'Espiritualidade',
  'Autoconhecimento',
  'Saúde e Bem-estar',
  'Passado e Futuro',
  'Orientação Geral',
];

class RegisterReaderScreen extends StatefulWidget {
  const RegisterReaderScreen({super.key});

  @override
  State<RegisterReaderScreen> createState() => _RegisterReaderScreenState();
}

class _RegisterReaderScreenState extends State<RegisterReaderScreen> {
  int _step = 0;
  bool _loading = false;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;
  final _step1Key = GlobalKey<FormState>();

  final _bioCtrl = TextEditingController();
  final _taglineCtrl = TextEditingController();
  final _experienceCtrl = TextEditingController();
  final Set<String> _selectedSpecialties = {};
  final _step2Key = GlobalKey<FormState>();

  final _pixKeyCtrl = TextEditingController();
  String _pixKeyType = 'CPF';
  final _cpfCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _step3Key = GlobalKey<FormState>();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _bioCtrl.dispose();
    _taglineCtrl.dispose();
    _experienceCtrl.dispose();
    _pixKeyCtrl.dispose();
    _cpfCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  int get _experienceYears => int.tryParse(_experienceCtrl.text) ?? 0;

  String get _taxId => _cpfCtrl.text.replaceAll(RegExp(r'[^0-9]'), '');

  String get _cellphone => _phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '');

  Map<String, dynamic> get _profilePayload => {
    'bio': _bioCtrl.text.trim(),
    'tagline': _taglineCtrl.text.trim(),
    'experience_years': _experienceYears,
    'specialties': _selectedSpecialties.toList(),
    'pix_key_type': _pixKeyType,
    'pix_key': _pixKeyCtrl.text.trim(),
    if (_taxId.isNotEmpty) 'tax_id': _taxId,
    if (_cellphone.isNotEmpty) 'cellphone': _cellphone,
  };

  Future<void> _savePendingProfile() {
    return PendingProfileSyncService.savePendingReaderProfile(
      bio: _bioCtrl.text.trim(),
      tagline: _taglineCtrl.text.trim(),
      experienceYears: _experienceYears,
      specialties: _selectedSpecialties.toList(),
      pixKeyType: _pixKeyType,
      pixKey: _pixKeyCtrl.text.trim(),
      taxId: _taxId,
      cellphone: _cellphone,
    );
  }

  Future<void> _finish() async {
    if (!_step3Key.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final signUpResponse = await SupabaseService.signUp(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
        data: {'full_name': _nameCtrl.text.trim(), 'role': 'READER'},
      );

      if (signUpResponse.session != null) {
        var profileSaved = false;

        try {
          await api.patch('/me', data: _profilePayload);
          await PendingProfileSyncService.clearPendingReaderProfile();
          profileSaved = true;
        } catch (error) {
          debugPrint('[RegisterReader] Falha ao salvar perfil: $error');
          await _savePendingProfile();
        }

        if (!mounted) return;
        if (!profileSaved) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Conta criada! Vamos sincronizar seu perfil automaticamente.',
              ),
              duration: Duration(seconds: 4),
            ),
          );
        }
        context.go('/under-review');
      } else {
        await _savePendingProfile();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Conta criada! Confirme seu email e faça login para continuar.',
            ),
            duration: Duration(seconds: 5),
          ),
        );
        context.go('/login');
      }
    } catch (error) {
      if (!mounted) return;
      final msg = error.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            msg.contains('already registered')
                ? 'Email já cadastrado'
                : msg.contains('429') || msg.contains('rate')
                ? 'Muitas tentativas. Aguarde alguns minutos.'
                : 'Erro ao criar conta. Tente novamente.',
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _nextStep() {
    final keys = [_step1Key, _step2Key];
    if (_step < keys.length && !keys[_step].currentState!.validate()) return;

    if (_step == 1 && _selectedSpecialties.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione ao menos uma especialidade.')),
      );
      return;
    }

    setState(() => _step++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: [_buildStep1(), _buildStep2(), _buildStep3()][_step],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final steps = ['Conta', 'Perfil', 'Financeiro'];

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Column(
        children: [
          Row(
            children: [
              if (_step > 0)
                IconButton(
                  icon: const Icon(
                    Icons.arrow_back,
                    color: AppColors.textPrimary,
                  ),
                  onPressed: () => setState(() => _step--),
                )
              else
                IconButton(
                  icon: const Icon(
                    Icons.arrow_back,
                    color: AppColors.textPrimary,
                  ),
                  onPressed: () => context.go('/login'),
                ),
              Expanded(
                child: Text(
                  'Seja cartomante — ${steps[_step]}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
              Text(
                '${_step + 1}/3',
                style: const TextStyle(color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (_step + 1) / 3,
            backgroundColor: Colors.white.withValues(alpha: 0.1),
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1() {
    return Form(
      key: _step1Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Dados de acesso',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 24),
          AppTextField(
            controller: _nameCtrl,
            label: 'Nome completo',
            textCapitalization: TextCapitalization.words,
            validator: (value) =>
                value!.trim().isEmpty ? 'Informe seu nome' : null,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _emailCtrl,
            label: 'Email profissional',
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value!.isEmpty) return 'Informe seu email';
              if (!value.contains('@')) return 'Email inválido';
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _passwordCtrl,
            label: 'Senha',
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: AppColors.textMuted,
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
            validator: (value) {
              if (value!.isEmpty) return 'Informe uma senha';
              if (value.length < 6) return 'Mínimo 6 caracteres';
              return null;
            },
          ),
          const SizedBox(height: 32),
          AppButton(label: 'Próximo', onPressed: _nextStep),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _step2Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Seu perfil profissional',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 24),
          AppTextField(
            controller: _taglineCtrl,
            label: 'Slogan (ex: "Clareza para sua jornada")',
            validator: (value) =>
                value!.trim().isEmpty ? 'Informe um slogan' : null,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _bioCtrl,
            label: 'Biografia',
            maxLines: 4,
            minLines: 3,
            textCapitalization: TextCapitalization.sentences,
            validator: (value) => value!.trim().length < 20
                ? 'Escreva ao menos 20 caracteres'
                : null,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _experienceCtrl,
            label: 'Anos de experiência',
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (value) =>
                value!.isEmpty ? 'Informe seus anos de experiência' : null,
          ),
          const SizedBox(height: 20),
          const Text(
            'Especialidades',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _specialties
                .map(
                  (specialty) => FilterChip(
                    label: Text(specialty),
                    selected: _selectedSpecialties.contains(specialty),
                    onSelected: (selected) => setState(() {
                      if (selected) {
                        _selectedSpecialties.add(specialty);
                      } else {
                        _selectedSpecialties.remove(specialty);
                      }
                    }),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 32),
          AppButton(label: 'Próximo', onPressed: _nextStep),
        ],
      ),
    );
  }

  Widget _buildStep3() {
    return Form(
      key: _step3Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Dados para recebimento',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Usaremos para transferir seus ganhos.',
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 24),
          DropdownButtonFormField<String>(
            initialValue: _pixKeyType,
            decoration: InputDecoration(
              labelText: 'Tipo de chave PIX',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
            ),
            dropdownColor: AppColors.surface,
            style: const TextStyle(color: AppColors.textPrimary),
            items: pixKeyTypeOptions
                .map(
                  (type) => DropdownMenuItem(
                    value: type.value,
                    child: Text(type.label),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _pixKeyType = value!),
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _pixKeyCtrl,
            label: 'Chave PIX',
            validator: (value) =>
                value!.trim().isEmpty ? 'Informe sua chave PIX' : null,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _cpfCtrl,
            label: 'CPF',
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              _CpfInputFormatter(),
            ],
            validator: (value) =>
                value!.isEmpty ? 'CPF obrigatório para cartomantes' : null,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _phoneCtrl,
            label: 'Telefone',
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              _PhoneInputFormatter(),
            ],
            validator: (value) =>
                value!.isEmpty ? 'Telefone obrigatório' : null,
          ),
          const SizedBox(height: 32),
          AppButton(
            label: 'Criar minha conta',
            loading: _loading,
            onPressed: _finish,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _CpfInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 11) return oldValue;

    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index == 3 || index == 6) buffer.write('.');
      if (index == 9) buffer.write('-');
      buffer.write(digits[index]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class _PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 11) return oldValue;

    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index == 0) buffer.write('(');
      if (index == 2) buffer.write(') ');
      if (index == 7) buffer.write('-');
      buffer.write(digits[index]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
