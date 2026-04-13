class TarotCardDef {
  final String id;
  final String name;
  final String suit; // 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
  final int number;

  const TarotCardDef({
    required this.id,
    required this.name,
    required this.suit,
    required this.number,
  });
}

const kTarotCards = <TarotCardDef>[
  // ── Arcanos Maiores ──────────────────────────────────────────────────────
  TarotCardDef(id: 'major_0', name: 'O Louco', suit: 'major', number: 0),
  TarotCardDef(id: 'major_1', name: 'O Mago', suit: 'major', number: 1),
  TarotCardDef(id: 'major_2', name: 'A Sacerdotisa', suit: 'major', number: 2),
  TarotCardDef(id: 'major_3', name: 'A Imperatriz', suit: 'major', number: 3),
  TarotCardDef(id: 'major_4', name: 'O Imperador', suit: 'major', number: 4),
  TarotCardDef(id: 'major_5', name: 'O Hierofante', suit: 'major', number: 5),
  TarotCardDef(id: 'major_6', name: 'Os Amantes', suit: 'major', number: 6),
  TarotCardDef(id: 'major_7', name: 'O Carro', suit: 'major', number: 7),
  TarotCardDef(id: 'major_8', name: 'A Força', suit: 'major', number: 8),
  TarotCardDef(id: 'major_9', name: 'O Eremita', suit: 'major', number: 9),
  TarotCardDef(
    id: 'major_10',
    name: 'A Roda da Fortuna',
    suit: 'major',
    number: 10,
  ),
  TarotCardDef(id: 'major_11', name: 'A Justiça', suit: 'major', number: 11),
  TarotCardDef(id: 'major_12', name: 'O Enforcado', suit: 'major', number: 12),
  TarotCardDef(id: 'major_13', name: 'A Morte', suit: 'major', number: 13),
  TarotCardDef(id: 'major_14', name: 'A Temperança', suit: 'major', number: 14),
  TarotCardDef(id: 'major_15', name: 'O Diabo', suit: 'major', number: 15),
  TarotCardDef(id: 'major_16', name: 'A Torre', suit: 'major', number: 16),
  TarotCardDef(id: 'major_17', name: 'A Estrela', suit: 'major', number: 17),
  TarotCardDef(id: 'major_18', name: 'A Lua', suit: 'major', number: 18),
  TarotCardDef(id: 'major_19', name: 'O Sol', suit: 'major', number: 19),
  TarotCardDef(id: 'major_20', name: 'O Julgamento', suit: 'major', number: 20),
  TarotCardDef(id: 'major_21', name: 'O Mundo', suit: 'major', number: 21),

  // ── Paus (Wands) ─────────────────────────────────────────────────────────
  TarotCardDef(id: 'wands_1', name: 'Ás de Paus', suit: 'wands', number: 1),
  TarotCardDef(id: 'wands_2', name: '2 de Paus', suit: 'wands', number: 2),
  TarotCardDef(id: 'wands_3', name: '3 de Paus', suit: 'wands', number: 3),
  TarotCardDef(id: 'wands_4', name: '4 de Paus', suit: 'wands', number: 4),
  TarotCardDef(id: 'wands_5', name: '5 de Paus', suit: 'wands', number: 5),
  TarotCardDef(id: 'wands_6', name: '6 de Paus', suit: 'wands', number: 6),
  TarotCardDef(id: 'wands_7', name: '7 de Paus', suit: 'wands', number: 7),
  TarotCardDef(id: 'wands_8', name: '8 de Paus', suit: 'wands', number: 8),
  TarotCardDef(id: 'wands_9', name: '9 de Paus', suit: 'wands', number: 9),
  TarotCardDef(id: 'wands_10', name: '10 de Paus', suit: 'wands', number: 10),
  TarotCardDef(
    id: 'wands_page',
    name: 'Valete de Paus',
    suit: 'wands',
    number: 11,
  ),
  TarotCardDef(
    id: 'wands_knight',
    name: 'Cavaleiro de Paus',
    suit: 'wands',
    number: 12,
  ),
  TarotCardDef(
    id: 'wands_queen',
    name: 'Rainha de Paus',
    suit: 'wands',
    number: 13,
  ),
  TarotCardDef(
    id: 'wands_king',
    name: 'Rei de Paus',
    suit: 'wands',
    number: 14,
  ),

  // ── Copas (Cups) ─────────────────────────────────────────────────────────
  TarotCardDef(id: 'cups_1', name: 'Ás de Copas', suit: 'cups', number: 1),
  TarotCardDef(id: 'cups_2', name: '2 de Copas', suit: 'cups', number: 2),
  TarotCardDef(id: 'cups_3', name: '3 de Copas', suit: 'cups', number: 3),
  TarotCardDef(id: 'cups_4', name: '4 de Copas', suit: 'cups', number: 4),
  TarotCardDef(id: 'cups_5', name: '5 de Copas', suit: 'cups', number: 5),
  TarotCardDef(id: 'cups_6', name: '6 de Copas', suit: 'cups', number: 6),
  TarotCardDef(id: 'cups_7', name: '7 de Copas', suit: 'cups', number: 7),
  TarotCardDef(id: 'cups_8', name: '8 de Copas', suit: 'cups', number: 8),
  TarotCardDef(id: 'cups_9', name: '9 de Copas', suit: 'cups', number: 9),
  TarotCardDef(id: 'cups_10', name: '10 de Copas', suit: 'cups', number: 10),
  TarotCardDef(
    id: 'cups_page',
    name: 'Valete de Copas',
    suit: 'cups',
    number: 11,
  ),
  TarotCardDef(
    id: 'cups_knight',
    name: 'Cavaleiro de Copas',
    suit: 'cups',
    number: 12,
  ),
  TarotCardDef(
    id: 'cups_queen',
    name: 'Rainha de Copas',
    suit: 'cups',
    number: 13,
  ),
  TarotCardDef(id: 'cups_king', name: 'Rei de Copas', suit: 'cups', number: 14),

  // ── Espadas (Swords) ─────────────────────────────────────────────────────
  TarotCardDef(
    id: 'swords_1',
    name: 'Ás de Espadas',
    suit: 'swords',
    number: 1,
  ),
  TarotCardDef(id: 'swords_2', name: '2 de Espadas', suit: 'swords', number: 2),
  TarotCardDef(id: 'swords_3', name: '3 de Espadas', suit: 'swords', number: 3),
  TarotCardDef(id: 'swords_4', name: '4 de Espadas', suit: 'swords', number: 4),
  TarotCardDef(id: 'swords_5', name: '5 de Espadas', suit: 'swords', number: 5),
  TarotCardDef(id: 'swords_6', name: '6 de Espadas', suit: 'swords', number: 6),
  TarotCardDef(id: 'swords_7', name: '7 de Espadas', suit: 'swords', number: 7),
  TarotCardDef(id: 'swords_8', name: '8 de Espadas', suit: 'swords', number: 8),
  TarotCardDef(id: 'swords_9', name: '9 de Espadas', suit: 'swords', number: 9),
  TarotCardDef(
    id: 'swords_10',
    name: '10 de Espadas',
    suit: 'swords',
    number: 10,
  ),
  TarotCardDef(
    id: 'swords_page',
    name: 'Valete de Espadas',
    suit: 'swords',
    number: 11,
  ),
  TarotCardDef(
    id: 'swords_knight',
    name: 'Cavaleiro de Espadas',
    suit: 'swords',
    number: 12,
  ),
  TarotCardDef(
    id: 'swords_queen',
    name: 'Rainha de Espadas',
    suit: 'swords',
    number: 13,
  ),
  TarotCardDef(
    id: 'swords_king',
    name: 'Rei de Espadas',
    suit: 'swords',
    number: 14,
  ),

  // ── Pentáculos (Pentacles) ────────────────────────────────────────────────
  TarotCardDef(
    id: 'pents_1',
    name: 'Ás de Pentáculos',
    suit: 'pentacles',
    number: 1,
  ),
  TarotCardDef(
    id: 'pents_2',
    name: '2 de Pentáculos',
    suit: 'pentacles',
    number: 2,
  ),
  TarotCardDef(
    id: 'pents_3',
    name: '3 de Pentáculos',
    suit: 'pentacles',
    number: 3,
  ),
  TarotCardDef(
    id: 'pents_4',
    name: '4 de Pentáculos',
    suit: 'pentacles',
    number: 4,
  ),
  TarotCardDef(
    id: 'pents_5',
    name: '5 de Pentáculos',
    suit: 'pentacles',
    number: 5,
  ),
  TarotCardDef(
    id: 'pents_6',
    name: '6 de Pentáculos',
    suit: 'pentacles',
    number: 6,
  ),
  TarotCardDef(
    id: 'pents_7',
    name: '7 de Pentáculos',
    suit: 'pentacles',
    number: 7,
  ),
  TarotCardDef(
    id: 'pents_8',
    name: '8 de Pentáculos',
    suit: 'pentacles',
    number: 8,
  ),
  TarotCardDef(
    id: 'pents_9',
    name: '9 de Pentáculos',
    suit: 'pentacles',
    number: 9,
  ),
  TarotCardDef(
    id: 'pents_10',
    name: '10 de Pentáculos',
    suit: 'pentacles',
    number: 10,
  ),
  TarotCardDef(
    id: 'pents_page',
    name: 'Valete de Pentáculos',
    suit: 'pentacles',
    number: 11,
  ),
  TarotCardDef(
    id: 'pents_knight',
    name: 'Cavaleiro de Pentáculos',
    suit: 'pentacles',
    number: 12,
  ),
  TarotCardDef(
    id: 'pents_queen',
    name: 'Rainha de Pentáculos',
    suit: 'pentacles',
    number: 13,
  ),
  TarotCardDef(
    id: 'pents_king',
    name: 'Rei de Pentáculos',
    suit: 'pentacles',
    number: 14,
  ),
];

const kSuitLabels = {
  'major': 'Arcanos Maiores',
  'wands': 'Paus',
  'cups': 'Copas',
  'swords': 'Espadas',
  'pentacles': 'Pentáculos',
};
