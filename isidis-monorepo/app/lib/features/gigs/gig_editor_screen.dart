import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_text_field.dart';

const _kCategories = [
  'Amor',
  'Carreira',
  'Família',
  'Espiritualidade',
  'Autoconhecimento',
  'Finanças',
  'Saúde',
  'Outros',
];

const _kDeliveryMethods = {
  'DIGITAL_SPREAD': 'Tiragem digital de cartas',
  'PHYSICAL_PHOTO': 'Foto de tiragem física',
  'VIDEO': 'Vídeo',
  'OTHER': 'Outro',
};

class GigEditorScreen extends StatefulWidget {
  /// Null = criar novo. Non-null = editar existente.
  final Map<String, dynamic>? existingGig;

  const GigEditorScreen({super.key, this.existingGig});

  @override
  State<GigEditorScreen> createState() => _GigEditorScreenState();
}

class _GigEditorScreenState extends State<GigEditorScreen> {
  final _formKey = GlobalKey<FormState>();

  // Campos principais
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _hoursCtrl;
  String _category = 'Amor';
  String _deliveryMethod = 'DIGITAL_SPREAD';
  bool _acceptPix = true;
  bool _acceptCard = true;

  // Requirements dinâmicos
  final List<Map<String, dynamic>> _requirements = [];

  // Add-ons dinâmicos
  final List<Map<String, dynamic>> _addOns = [];

  bool _loading = false;
  bool get _isEditing => widget.existingGig != null;

  @override
  void initState() {
    super.initState();
    final g = widget.existingGig;
    _titleCtrl = TextEditingController(text: g?['title'] as String? ?? '');
    _descCtrl = TextEditingController(text: g?['description'] as String? ?? '');
    final price = g?['price'] as int? ?? 0;
    _priceCtrl = TextEditingController(
      text: price > 0
          ? (price / 100).toStringAsFixed(2).replaceAll('.', ',')
          : '',
    );
    _hoursCtrl = TextEditingController(
      text: (g?['delivery_time_hours'] as int?)?.toString() ?? '48',
    );
    final rawCategory = g?['category'] as String? ?? 'Amor';
    _category = _kCategories.contains(rawCategory) ? rawCategory : 'Amor';

    final rawMethod = g?['delivery_method'] as String? ?? 'DIGITAL_SPREAD';
    _deliveryMethod = _kDeliveryMethods.containsKey(rawMethod)
        ? rawMethod
        : 'DIGITAL_SPREAD';

    final paymentMethods =
        (g?['payment_methods'] as List<dynamic>?)
            ?.map((item) => item.toString())
            .toList() ??
        const ['PIX', 'CARD'];
    _acceptPix = paymentMethods.contains('PIX');
    _acceptCard = paymentMethods.contains('CARD');

    // Load existing requirements
    final reqs = g?['requirements'] as List<dynamic>?;
    if (reqs != null) {
      for (final r in reqs) {
        final rm = r as Map<String, dynamic>;
        _requirements.add({
          'id': rm['id'],
          'question': rm['question'],
          'type': rm['type'] ?? 'text',
          'required': rm['required'] ?? false,
          'controller': TextEditingController(
            text: rm['question'] as String? ?? '',
          ),
        });
      }
    }

    // Load existing add-ons
    final addOns = g?['add_ons'] as List<dynamic>?;
    if (addOns != null) {
      for (final a in addOns) {
        final am = a as Map<String, dynamic>;
        final p = am['price'] as int? ?? 0;
        _addOns.add({
          'id': am['id'],
          'title': am['title'],
          'description': am['description'],
          'price': p,
          'type': am['type'] ?? 'EXTRA',
          'titleController': TextEditingController(
            text: am['title'] as String? ?? '',
          ),
          'priceController': TextEditingController(
            text: p > 0
                ? (p / 100).toStringAsFixed(2).replaceAll('.', ',')
                : '',
          ),
        });
      }
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _hoursCtrl.dispose();
    for (final r in _requirements) {
      (r['controller'] as TextEditingController?)?.dispose();
    }
    for (final a in _addOns) {
      (a['titleController'] as TextEditingController?)?.dispose();
      (a['priceController'] as TextEditingController?)?.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final priceStr = _priceCtrl.text.trim().replaceAll(',', '.');
    final priceReal = double.tryParse(priceStr) ?? 0;
    final priceCents = (priceReal * 100).round();

    if (priceCents < 100) {
      _showError('Preço mínimo é R\$ 1,00.');
      return;
    }

    final hours = int.tryParse(_hoursCtrl.text.trim()) ?? 0;
    if (hours < 1) {
      _showError('Prazo mínimo é 1 hora.');
      return;
    }

    if (!_acceptPix && !_acceptCard) {
      _showError('Escolha pelo menos uma forma de pagamento.');
      return;
    }

    final paymentMethods = <String>[
      if (_acceptPix) 'PIX',
      if (_acceptCard) 'CARD',
    ];

    final body = {
      'title': _titleCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'category': _category,
      'price': priceCents,
      'delivery_time_hours': hours,
      'delivery_method': _deliveryMethod,
      'payment_methods': paymentMethods,
      'card_fee_responsibility': 'READER',
      'requirements': _requirements
          .map(
            (r) => {
              'id': r['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
              'question': (r['controller'] as TextEditingController).text
                  .trim(),
              'type': r['type'],
              'required': r['required'],
            },
          )
          .toList(),
      'add_ons': _addOns.map((a) {
        final ap =
            double.tryParse(
              (a['priceController'] as TextEditingController).text
                  .trim()
                  .replaceAll(',', '.'),
            ) ??
            0;
        return {
          'id': a['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
          'title': (a['titleController'] as TextEditingController).text.trim(),
          'price': (ap * 100).round(),
          'type': a['type'],
        };
      }).toList(),
    };

    setState(() => _loading = true);
    try {
      if (_isEditing) {
        await api.patch('/gigs/${widget.existingGig!['id']}', data: body);
      } else {
        await api.post('/gigs', data: body);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isEditing
                  ? 'Serviço atualizado! Aguardando revisão.'
                  : 'Serviço criado! Será publicado após aprovação.',
            ),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        _showError('Erro ao salvar. Verifique os dados e tente novamente.');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  void _addRequirement() {
    setState(() {
      _requirements.add({
        'id': null,
        'question': '',
        'type': 'text',
        'required': true,
        'controller': TextEditingController(),
      });
    });
  }

  void _removeRequirement(int i) {
    final ctrl = _requirements[i]['controller'] as TextEditingController?;
    ctrl?.dispose();
    setState(() => _requirements.removeAt(i));
  }

  void _addAddOn() {
    setState(() {
      _addOns.add({
        'id': null,
        'title': '',
        'price': 0,
        'type': 'EXTRA',
        'titleController': TextEditingController(),
        'priceController': TextEditingController(),
      });
    });
  }

  void _removeAddOn(int i) {
    (_addOns[i]['titleController'] as TextEditingController?)?.dispose();
    (_addOns[i]['priceController'] as TextEditingController?)?.dispose();
    setState(() => _addOns.removeAt(i));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          _isEditing ? 'Editar serviço' : 'Novo serviço',
          style: const TextStyle(
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
            onPressed: _loading ? null : _save,
            child: _loading
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
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // ── Informações básicas ──────────────────────────────────────────
            _SectionHeader('Informações básicas'),
            const SizedBox(height: 12),

            AppTextField(
              controller: _titleCtrl,
              label: 'Título do serviço',
              validator: (v) {
                if (v == null || v.trim().length < 5) {
                  return 'Mínimo 5 caracteres';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),

            AppTextField(
              controller: _descCtrl,
              label: 'Descrição',
              maxLines: 4,
              validator: (v) {
                if (v == null || v.trim().length < 20) {
                  return 'Mínimo 20 caracteres';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Categoria
            _DropdownField<String>(
              label: 'Categoria',
              value: _category,
              items: _kCategories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (v) => setState(() => _category = v ?? _category),
            ),
            const SizedBox(height: 12),

            // Método de entrega
            _DropdownField<String>(
              label: 'Método de entrega',
              value: _deliveryMethod,
              items: _kDeliveryMethods.entries
                  .map(
                    (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                  )
                  .toList(),
              onChanged: (v) =>
                  setState(() => _deliveryMethod = v ?? _deliveryMethod),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _priceCtrl,
                    label: 'Preço (R\$)',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]')),
                    ],
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Obrigatório';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppTextField(
                    controller: _hoursCtrl,
                    label: 'Prazo (horas)',
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Obrigatório';
                      return null;
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            _SectionHeader('Pagamento'),
            const SizedBox(height: 4),
            const Text(
              'Escolha como esse servico pode ser pago. No cartao, a taxa e sempre descontada do ganho da tarologa.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),

            _PaymentMethodTile(
              icon: Icons.pix,
              title: 'Aceitar PIX',
              subtitle: 'Pagamento instantaneo com QR Code',
              value: _acceptPix,
              onChanged: (value) => setState(() => _acceptPix = value),
            ),
            const SizedBox(height: 10),
            _PaymentMethodTile(
              icon: Icons.credit_card,
              title: 'Aceitar cartao',
              subtitle: 'Credito com processamento pela Stripe',
              value: _acceptCard,
              onChanged: (value) => setState(() => _acceptCard = value),
            ),
            if (_acceptCard) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.surfaceLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Taxa do cartao',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'A cliente paga o valor normal da gig. A taxa financeira do cartao fica com a tarologa.',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 28),

            // ── Perguntas para o cliente ─────────────────────────────────────
            _SectionHeader('Perguntas para o cliente'),
            const SizedBox(height: 4),
            const Text(
              'Informações que o cliente deve fornecer ao fazer o pedido.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),

            ..._requirements.asMap().entries.map((entry) {
              final i = entry.key;
              final r = entry.value;
              return _RequirementRow(
                controller: r['controller'] as TextEditingController,
                type: r['type'] as String,
                required: r['required'] as bool,
                onTypeChanged: (t) =>
                    setState(() => _requirements[i]['type'] = t),
                onRequiredChanged: (v) =>
                    setState(() => _requirements[i]['required'] = v),
                onRemove: () => _removeRequirement(i),
              );
            }),

            TextButton.icon(
              onPressed: _addRequirement,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Adicionar pergunta'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primaryLight,
              ),
            ),

            const SizedBox(height: 20),

            // ── Add-ons ──────────────────────────────────────────────────────
            _SectionHeader('Extras (add-ons)'),
            const SizedBox(height: 4),
            const Text(
              'Serviços adicionais que o cliente pode contratar.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),

            ..._addOns.asMap().entries.map((entry) {
              final i = entry.key;
              final a = entry.value;
              return _AddOnRow(
                titleController: a['titleController'] as TextEditingController,
                priceController: a['priceController'] as TextEditingController,
                type: a['type'] as String,
                onTypeChanged: (t) => setState(() => _addOns[i]['type'] = t),
                onRemove: () => _removeAddOn(i),
              );
            }),

            TextButton.icon(
              onPressed: _addAddOn,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Adicionar extra'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primaryLight,
              ),
            ),

            const SizedBox(height: 32),

            ElevatedButton(
              onPressed: _loading ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      _isEditing ? 'Salvar alterações' : 'Criar serviço',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),

            if (_isEditing)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  'Alterações em título, descrição, categoria ou preço enviarão o serviço para revisão novamente.',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

class _DropdownField<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _DropdownField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      decoration: InputDecoration(
        filled: true,
        fillColor: AppColors.surface,
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.surfaceLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.surfaceLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryLight),
        ),
      ),
      dropdownColor: AppColors.surface,
      style: const TextStyle(color: AppColors.textPrimary),
      items: items,
      onChanged: onChanged,
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _PaymentMethodTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceLight),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppColors.primaryLight),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primaryLight,
          ),
        ],
      ),
    );
  }
}

class _RequirementRow extends StatelessWidget {
  final TextEditingController controller;
  final String type;
  final bool required;
  final ValueChanged<String> onTypeChanged;
  final ValueChanged<bool> onRequiredChanged;
  final VoidCallback onRemove;

  const _RequirementRow({
    required this.controller,
    required this.type,
    required this.required,
    required this.onTypeChanged,
    required this.onRequiredChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceLight),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Ex: Qual é o seu nome completo?',
                    hintStyle: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.close,
                  size: 18,
                  color: AppColors.textMuted,
                ),
                onPressed: onRemove,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              // Tipo
              DropdownButton<String>(
                value: type,
                dropdownColor: AppColors.surface,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'text', child: Text('Texto')),
                  DropdownMenuItem(value: 'choice', child: Text('Escolha')),
                ],
                onChanged: (v) => onTypeChanged(v ?? type),
              ),
              const Spacer(),
              const Text(
                'Obrigatória',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              Switch(
                value: required,
                onChanged: onRequiredChanged,
                activeThumbColor: AppColors.primaryLight,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AddOnRow extends StatelessWidget {
  final TextEditingController titleController;
  final TextEditingController priceController;
  final String type;
  final ValueChanged<String> onTypeChanged;
  final VoidCallback onRemove;

  const _AddOnRow({
    required this.titleController,
    required this.priceController,
    required this.type,
    required this.onTypeChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceLight),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: titleController,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Ex: Entrega expressa',
                    hintStyle: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.close,
                  size: 18,
                  color: AppColors.textMuted,
                ),
                onPressed: onRemove,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              // Preço
              SizedBox(
                width: 100,
                child: TextField(
                  controller: priceController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]')),
                  ],
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Preço R\$',
                    hintStyle: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                    prefixText: 'R\$ ',
                    prefixStyle: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              const Spacer(),
              DropdownButton<String>(
                value: type,
                dropdownColor: AppColors.surface,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'SPEED', child: Text('Velocidade')),
                  DropdownMenuItem(value: 'EXTRA', child: Text('Extra')),
                  DropdownMenuItem(value: 'CUSTOM', child: Text('Custom')),
                ],
                onChanged: (v) => onTypeChanged(v ?? type),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
